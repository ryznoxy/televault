import ReactNativeBlobUtil from 'react-native-blob-util';

export type FilePart = {
  path: string;
  name: string;
  mime: string;
};

export type HttpRequest = {
  url: string;
  method: 'GET' | 'POST';
  fields?: Record<string, string>;
  file?: FilePart;
  onProgress?: (sent: number, total: number) => void;
};

export type HttpResponse = {
  status: number;
  body: string;
  headers?: Record<string, string>;
};

export type Transport = (request: HttpRequest) => Promise<HttpResponse>;

export type SendResult = {
  messageId: number;
  date: number;
  /**
   * Telegram's `document.file_id`, needed to re-download the file later via
   * `getFile` without ever listing chat history (the Bot API cannot). Present
   * only for document uploads.
   */
  fileId?: string;
};

export class TelegramApiError extends Error {
  readonly httpCode: number;
  /** Seconds to wait before retrying, when the API rate-limits (HTTP 429). */
  readonly retryAfter?: number;

  constructor(httpCode: number, description: string, retryAfter?: number) {
    super(`Telegram API error ${httpCode}: ${description}`);
    this.name = 'TelegramApiError';
    this.httpCode = httpCode;
    this.retryAfter = retryAfter;
  }
}

/** Pull the 429 back-off window from the JSON body or the `Retry-After` header. */
function retryAfterSeconds(
  response: HttpResponse,
  json: { parameters?: { retry_after?: number } },
): number | undefined {
  const fromBody = json.parameters?.retry_after;
  if (typeof fromBody === 'number' && fromBody >= 0) {
    return fromBody;
  }
  const raw = response.headers?.['retry-after'] ?? response.headers?.['Retry-After'];
  if (raw !== undefined) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds;
    }
  }
  return undefined;
}

type MultipartPart = {
  name: string;
  data: string;
  filename?: string;
  type?: string;
};

/**
 * PRD §7 / §21 gap #9: a stalled socket must not hang the foreground service.
 * `react-native-blob-util` applies this to the connect and read timeouts, so a
 * dead connection fails in bounded time instead of blocking the run forever.
 * Above the library's own 60s default so a slow 49 MB chunk is not cut off
 * mid-transfer, while a genuine stall still surfaces within two minutes.
 */
export const REQUEST_TIMEOUT_MS = 120_000;

/**
 * A stalled request fails with a platform-specific native message ("Timeout",
 * "timed out", …). Normalise it to one clear message and leave `httpCode` off,
 * so `uploadRetry` still treats it as a transient transport error (PRD §14).
 */
function asTransportError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/time(d)? ?out/i.test(message)) {
    return new Error(`Koneksi ke Telegram timeout setelah ${REQUEST_TIMEOUT_MS / 1000} detik.`);
  }
  return error instanceof Error ? error : new Error(message);
}

export const blobTransport: Transport = async request => {
  const parts: MultipartPart[] = Object.entries(request.fields ?? {}).map(([name, data]) => ({
    name,
    data,
  }));
  if (request.file) {
    parts.push({
      name: 'document',
      filename: request.file.name,
      type: request.file.mime,
      data: ReactNativeBlobUtil.wrap(request.file.path),
    });
  }
  let task = ReactNativeBlobUtil.config({ timeout: REQUEST_TIMEOUT_MS }).fetch(
    request.method,
    request.url,
    {},
    parts,
  );
  if (request.onProgress) {
    const report = request.onProgress;
    task = task.uploadProgress({ interval: 250 }, (sent, total) => report(sent, total));
  }
  try {
    const response = await task;
    const text = await response.text();
    const info = response.info();
    return { status: info.status, body: String(text), headers: info.headers };
  } catch (error) {
    throw asTransportError(error);
  }
};

export class TelegramBotApi {
  private readonly baseUrl: string;
  private readonly redactedUrl = 'https://api.telegram.org/bot<token>';
  private readonly botToken: string;

  constructor(
    botToken: string,
    private readonly chatId: string,
    private readonly transport: Transport = blobTransport,
  ) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /** Drop the `bot<token>` segment so a URL echoed in an error never leaks it. */
  private redact(message: string): string {
    return message
      .split(this.baseUrl)
      .join(this.redactedUrl)
      // A transport error can echo the request URL in another shape (encoded,
      // truncated, re-ordered), so also strip any bare `bot<digits>:<token>` run.
      .replace(/bot\d{5,}:[A-Za-z0-9_-]+/g, 'bot<token>');
  }

  /**
   * Run the transport with the token stripped from any thrown message. A
   * transport error echoes the request URL, and the caller persists that
   * message to `backup_sessions.error_reason` and exports it as CSV.
   */
  private async request(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      return await this.transport(httpRequest);
    } catch (error) {
      const redacted = error instanceof Error ? error : new Error(String(error));
      redacted.message = this.redact(redacted.message);
      throw redacted;
    }
  }

  async getMe(): Promise<{ id: number; username?: string; first_name?: string }> {
    const response = await this.request({ url: `${this.baseUrl}/getMe`, method: 'GET' });
    return this.parse(response).result as { id: number; username?: string; first_name?: string };
  }

  async testConnection(): Promise<string> {
    const me = await this.getMe();
    return `@${me.username ?? 'unknown'}`;
  }

  async getChat(): Promise<{
    id: number;
    title?: string;
    username?: string;
    type: string;
  }> {
    const url = `${this.baseUrl}/getChat?chat_id=${encodeURIComponent(this.chatId)}`;
    const response = await this.request({ url, method: 'GET' });
    return this.parse(response).result as {
      id: number;
      title?: string;
      username?: string;
      type: string;
    };
  }

  /**
   * Distinct chats that have messaged the bot recently, newest last. A bot can
   * only read updates from chats where a user actually wrote to it, so this is
   * how the app finds the numeric chat id without the user opening getUpdates
   * in a browser. Channel posts are not included — add `channel_post` here if
   * archiving into a channel the bot administers ever needs detection.
   */
  async getRecentChats(): Promise<
    { id: number; title?: string; username?: string; first_name?: string; type: string }[]
  > {
    const response = await this.request({
      url: `${this.baseUrl}/getUpdates?limit=100`,
      method: 'GET',
    });
    const updates = (this.parse(response).result ?? []) as Array<{
      message?: { chat?: { id: number; title?: string; username?: string; first_name?: string; type: string } };
    }>;
    const chats = new Map<number, { id: number; title?: string; username?: string; first_name?: string; type: string }>();
    for (const update of updates) {
      const chat = update.message?.chat;
      if (chat && !chats.has(chat.id)) {
        chats.set(chat.id, chat);
      }
    }
    return [...chats.values()];
  }

  /**
   * Scan recent updates for manifest document files forwarded or sent to the bot.
   * Matches `*.manifest.json` and legacy `manifest.json`.
   */
  async getRecentManifestDocuments(): Promise<
    Array<{
      fileId: string;
      fileName: string;
      fileSize?: number;
      messageId: number;
      date: number;
    }>
  > {
    const response = await this.request({
      url: `${this.baseUrl}/getUpdates?limit=100`,
      method: 'GET',
    });
    const updates = (this.parse(response).result ?? []) as Array<{
      message?: {
        message_id?: number;
        date?: number;
        document?: {
          file_id?: string;
          file_name?: string;
          file_size?: number;
        };
      };
      channel_post?: {
        message_id?: number;
        date?: number;
        document?: {
          file_id?: string;
          file_name?: string;
          file_size?: number;
        };
      };
    }>;
    const found: Array<{
      fileId: string;
      fileName: string;
      fileSize?: number;
      messageId: number;
      date: number;
    }> = [];
    const seen = new Set<string>();

    for (const update of updates) {
      const msg = update.message ?? update.channel_post;
      const doc = msg?.document;
      const fileName = doc?.file_name;
      const fileId = doc?.file_id;
      if (!doc || !fileName || !fileId) {
        continue;
      }
      if (fileName === 'manifest.json' || fileName.endsWith('.manifest.json')) {
        if (!seen.has(fileId)) {
          seen.add(fileId);
          found.push({
            fileId,
            fileName,
            fileSize: doc.file_size,
            messageId: Number(msg?.message_id ?? 0),
            date: Number(msg?.date ?? 0),
          });
        }
      }
    }
    return found;
  }

  /**
   * Forward a message to refresh its file_id or re-access media, returning new message info.
   */
  async forwardMessage(
    chatId: string | number,
    fromChatId: string | number,
    messageId: number,
  ): Promise<{ messageId: number; fileId?: string }> {
    const fields: Record<string, string> = {
      chat_id: String(chatId),
      from_chat_id: String(fromChatId),
      message_id: String(messageId),
    };
    const response = await this.request({
      url: `${this.baseUrl}/forwardMessage`,
      method: 'POST',
      fields,
    });
    const parsed = this.parse(response).result as {
      message_id?: number;
      document?: { file_id?: string };
      photo?: Array<{ file_id?: string }>;
      video?: { file_id?: string };
    };
    const docFileId =
      parsed.document?.file_id ??
      (Array.isArray(parsed.photo) && parsed.photo.length > 0
        ? parsed.photo[parsed.photo.length - 1].file_id
        : undefined) ??
      parsed.video?.file_id;
    return {
      messageId: Number(parsed.message_id ?? 0),
      ...(docFileId ? { fileId: docFileId } : {}),
    };
  }

  /**
   * Delete a message by id (e.g. clean up a temporary forwarded message).
   */
  async deleteMessage(chatId: string | number, messageId: number): Promise<boolean> {
    const fields: Record<string, string> = {
      chat_id: String(chatId),
      message_id: String(messageId),
    };
    try {
      const response = await this.request({
        url: `${this.baseUrl}/deleteMessage`,
        method: 'POST',
        fields,
      });
      const parsed = this.parse(response).result;
      return Boolean(parsed);
    } catch {
      return false;
    }
  }

  async sendMessage(text: string, disableNotification = false): Promise<SendResult> {
    // No `parse_mode`: the only messages this app sends are fixed plain strings
    // (the run summary and the setup test message). Markdown would 400 on any
    // future user-derived text carrying `_ * [ ] \`` (P2-l).
    const fields: Record<string, string> = {
      chat_id: this.chatId,
      text,
    };
    if (disableNotification) {
      fields.disable_notification = 'true';
    }
    const response = await this.request({
      url: `${this.baseUrl}/sendMessage`,
      method: 'POST',
      fields,
    });
    return this.toSendResult(this.parse(response));
  }

  async sendDocument(
    file: FilePart,
    caption?: string,
    onProgress?: (sent: number, total: number) => void,
    disableNotification = false,
  ): Promise<SendResult> {
    const fields: Record<string, string> = { chat_id: this.chatId };
    if (caption) {
      fields.caption = caption;
    }
    if (disableNotification) {
      fields.disable_notification = 'true';
    }
    const response = await this.request({
      url: `${this.baseUrl}/sendDocument`,
      method: 'POST',
      fields,
      file,
      onProgress,
    });
    return this.toSendResult(this.parse(response));
  }

  private parse(response: HttpResponse): { result: unknown } {
    let json: {
      ok?: boolean;
      description?: string;
      result?: unknown;
      parameters?: { retry_after?: number };
    };
    try {
      json = JSON.parse(response.body);
    } catch {
      throw new TelegramApiError(response.status, 'invalid JSON response');
    }
    if (!json.ok) {
      throw new TelegramApiError(
        response.status,
        this.redact(json.description ?? 'Unknown error'),
        retryAfterSeconds(response, json),
      );
    }
    return { result: json.result };
  }

  private toSendResult(parsed: { result: unknown }): SendResult {
    const result = parsed.result as {
      message_id?: number;
      date?: number;
      document?: { file_id?: string };
    };
    return {
      messageId: Number(result.message_id ?? 0),
      date: Number(result.date ?? 0),
      ...(result.document?.file_id ? { fileId: result.document.file_id } : {}),
    };
  }

  /**
   * Resolve a file_id to Telegram's temporary download path. File ids are
   * stable for as long as the bot can access the file; the path is valid for
   * at least one hour, so download immediately after resolving.
   */
  async getFile(fileId: string): Promise<{ fileId: string; filePath: string | null }> {
    const url = `${this.baseUrl}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const response = await this.request({ url, method: 'GET' });
    const result = this.parse(response).result as {
      file_id?: string;
      file_path?: string;
    };
    return { fileId: String(result.file_id ?? fileId), filePath: result.file_path ?? null };
  }

  /**
   * Download a stored document to `destPath`. Files above 20 MB need a direct
   * HTTPS fetch of the resolved path instead of the JSON API — this handles
   * both (the path URL works for any size).
   */
  async downloadFile(fileId: string, destPath: string): Promise<void> {
    const { filePath } = await this.getFile(fileId);
    if (!filePath) {
      throw new Error('Telegram tidak memberikan jalur unduhan untuk berkas ini');
    }
    const url = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
    try {
      const response = await ReactNativeBlobUtil.config({
        path: destPath,
        timeout: REQUEST_TIMEOUT_MS,
      }).fetch('GET', url, {});
      const status = response.info().status;
      if (status !== 200) {
        await ReactNativeBlobUtil.fs.unlink(destPath).catch(() => undefined);
        throw new Error(`Unduhan gagal (HTTP ${status})`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(this.redact(message));
    }
  }
}

import type { FilePart, SendResult } from '../net/telegramApi';
import { noteRateLimited, noteSendOk } from '../net/throttle';

export type DocumentApi = {
  sendDocument: (
    file: FilePart,
    caption?: string,
    onProgress?: (sent: number, total: number) => void,
    disableNotification?: boolean,
  ) => Promise<SendResult>;
};

/** PRD §14: retry a chunk up to 3 times, then skip + log it. */
const MAX_ATTEMPTS = 3;
/**
 * A 429 is a pace problem, not a bad request: the chunk is fine, we simply sent
 * it too fast, so it is worth waiting out instead of skipping a part and leaving
 * the archive incomplete.
 */
const MAX_RATE_LIMIT_ATTEMPTS = 6;
const BACKOFF_BASE_MS = 1000;
/**
 * A 429 `Retry-After` is honoured, but never for longer than a minute: a large
 * value would park the foreground service for hours instead of skipping the
 * part and finishing the run (P2-5).
 */
const MAX_RETRY_AFTER_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Read the HTTP status off an API error structurally, so the retry logic works
 * with any error carrying a numeric `httpCode` (TelegramApiError) and treats a
 * transport-level failure without one as retryable.
 */
function httpCodeOf(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'httpCode' in error) {
    const code = (error as { httpCode?: unknown }).httpCode;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

function retryAfterOf(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'retryAfter' in error) {
    const value = (error as { retryAfter?: unknown }).retryAfter;
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
}

/** 429 and 5xx are transient; other 4xx (bad token, bad request) are not. */
function isRetryable(error: unknown): boolean {
  const code = httpCodeOf(error);
  if (code === undefined) {
    return true;
  }
  return code === 429 || code >= 500;
}

/** Honour a 429 `Retry-After`, capped; otherwise exponential backoff (1s, 2s, …). */
export function retryDelayMs(error: unknown, attempt: number): number {
  const httpCode = httpCodeOf(error);
  const retryAfter = retryAfterOf(error);
  if (httpCode === 429 && retryAfter !== undefined) {
    return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, retryAfter) * 1000);
  }
  return BACKOFF_BASE_MS * 2 ** (attempt - 1);
}

/**
 * Send one document, retrying transient failures with exponential backoff.
 * Rejects with the last error once the attempts are exhausted, so the caller
 * can skip the chunk and keep the rest of the run going.
 */
export async function sendDocumentWithRetry(
  api: DocumentApi,
  file: FilePart,
  caption: string | undefined,
  disableNotification: boolean,
  onProgress?: (sent: number, total: number) => void,
): Promise<SendResult> {
  let lastError: unknown;
  let maxAttempts = MAX_ATTEMPTS;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await api.sendDocument(file, caption, onProgress, disableNotification);
      noteSendOk();
      return result;
    } catch (error) {
      lastError = error;
      if (httpCodeOf(error) === 429) {
        // Slow every later send down too, so the next chunk does not repeat it.
        noteRateLimited(retryAfterOf(error));
        maxAttempts = Math.max(maxAttempts, MAX_RATE_LIMIT_ATTEMPTS);
      }
      if (attempt >= maxAttempts || !isRetryable(error)) {
        break;
      }
      await sleep(retryDelayMs(error, attempt));
    }
  }
  throw lastError;
}

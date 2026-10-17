import type { SessionRecord } from '../db/repositories/sessions';

/** Human duration: "45s", "3m 12s", "1j 4m". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0s';
  }
  const total = Math.floor(ms / 1000);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  if (hours > 0) {
    return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
  }
  if (Math.floor(total / 60) > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/** Byte size with GB/MB/KB units. */
export function formatBytesGB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** "Hari ini, HH:MM" / "Kemarin, HH:MM" / "D MMM YYYY, HH:MM" (no WIB suffix). */
export function sessionDateLabel(ts: number, now: number = Date.now()): string {
  const date = new Date(ts);
  const current = new Date(now);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;
  const sameDay =
    date.getFullYear() === current.getFullYear() &&
    date.getMonth() === current.getMonth() &&
    date.getDate() === current.getDate();
  if (sameDay) {
    return `Hari ini, ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) {
    return `Kemarin, ${time}`;
  }
  const label = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${label}, ${time}`;
}

/**
 * Deep link to a Telegram message. Private channel/supergroup ids look like
 * `-100192837482` → `https://t.me/c/192837482/<messageId>`; public `@username`
 * chats → `https://t.me/<username>/<messageId>`. Null when no link is possible.
 */
export function telegramMessageUrl(
  chatId: string,
  messageId: number | string | null,
): string | null {
  if (messageId == null || messageId === '') {
    return null;
  }
  const id = Number(messageId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  const chat = (chatId ?? '').trim();
  if (!chat) {
    return null;
  }
  if (chat.startsWith('@')) {
    const username = chat.slice(1);
    return username ? `https://t.me/${username}/${id}` : null;
  }
  const digits = chat.replace(/^-/, '');
  if (!/^\d+$/.test(digits)) {
    return null;
  }
  const internal = digits.startsWith('100') && digits.length > 3 ? digits.slice(3) : digits;
  return `https://t.me/c/${internal}/${id}`;
}

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const CSV_HEADER = [
  'id',
  'started_at',
  'finished_at',
  'status',
  'category',
  'archive_name',
  'archive_format',
  'encrypted',
  'total_files',
  'total_size',
  'chunks_total',
  'chunks_sent',
  'manifest_id',
  'error_reason',
];

/** Real CSV export of the given session rows (proper comma/quote/newline escaping). */
export function sessionsToCsv(rows: SessionRecord[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.started_at,
        row.finished_at,
        row.status,
        row.category,
        row.archive_name,
        row.archive_format,
        row.encrypted,
        row.total_files,
        row.total_size,
        row.chunks_total,
        row.chunks_sent,
        row.manifest_id,
        row.error_reason,
      ]
        .map(escapeCsv)
        .join(','),
    );
  }
  return lines.join('\n');
}

export type SessionFilter = 'all' | 'success' | 'failed' | 'running';

/** Case-insensitive match over name/date/hash/status, then status filter. */
export function filterSessions(
  rows: SessionRecord[],
  options: { query?: string; status?: SessionFilter; now?: number },
): SessionRecord[] {
  const query = (options.query ?? '').trim().toLowerCase();
  const status = options.status ?? 'all';
  const now = options.now ?? Date.now();
  return rows.filter(row => {
    if (status !== 'all' && row.status !== status) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      row.archive_name ?? '',
      row.category ?? '',
      row.manifest_id ?? '',
      row.status,
      sessionDateLabel(row.started_at, now),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function sortSessions(
  rows: SessionRecord[],
  order: 'newest' | 'oldest',
): SessionRecord[] {
  return [...rows].sort((a, b) =>
    order === 'newest' ? b.started_at - a.started_at : a.started_at - b.started_at,
  );
}

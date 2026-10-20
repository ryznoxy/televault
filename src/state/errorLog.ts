import { mmkv } from './mmkv';

/**
 * Tiny on-device error ring buffer (max 20 entries, MMKV). Captures errors
 * that would otherwise be swallowed by `catch(() => undefined)` so the
 * Troubleshooting screen can show why something silently failed.
 */
const LOG_KEY = 'error_log';
const MAX_ENTRIES = 20;

export type ErrorLogEntry = {
  at: number;
  scope: string;
  message: string;
};

export function getErrorLog(): ErrorLogEntry[] {
  const raw = mmkv.getString(LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ErrorLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function logError(scope: string, error: unknown): void {
  const entry: ErrorLogEntry = {
    at: Date.now(),
    scope,
    message: error instanceof Error ? error.message : String(error),
  };
  const next = [entry, ...getErrorLog()].slice(0, MAX_ENTRIES);
  try {
    mmkv.set(LOG_KEY, JSON.stringify(next));
  } catch {
    // Logging must never throw.
  }
}

export function clearErrorLog(): void {
  mmkv.remove(LOG_KEY);
}

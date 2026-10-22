import { mmkv } from '../state/mmkv';

/**
 * Last time a background wake-up actually reached the JS side, and what woke
 * us. Without it a missed schedule is ambiguous: the OS may never have woken
 * us, we may have woken and refused to run, or the inexact JobScheduler may have
 * been the one that fired while the exact alarm was held back. Troubleshooting
 * shows both the timestamp and the source.
 */
const KEY = 'scheduler_last_wake';

/** The exact alarm's own service, or the inexact JobScheduler. */
export type WakeSource = 'alarm' | 'job';

export function recordWake(source: WakeSource = 'job'): void {
  try {
    mmkv.set(KEY, `${Date.now()}|${source}`);
  } catch {
    // Recording a wake must never break the wake.
  }
}

export function lastWake(): { at: number; source: WakeSource | null } | null {
  const raw = mmkv.getString(KEY);
  if (!raw) {
    return null;
  }
  // Older installs stored a bare timestamp, which has no source to report.
  const [atRaw, source] = raw.split('|');
  const at = parseInt(atRaw, 10);
  if (Number.isNaN(at)) {
    return null;
  }
  return { at, source: source === 'alarm' || source === 'job' ? source : null };
}
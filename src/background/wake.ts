import { mmkv } from '../state/mmkv';

/**
 * Last time a background wake-up actually reached the JS side. Without it a
 * missed schedule is ambiguous: the OS may never have woken us, or we may have
 * woken and refused to run. Troubleshooting shows the timestamp.
 */
const KEY = 'scheduler_last_wake';

export function recordWake(at: number = Date.now()): void {
  try {
    mmkv.set(KEY, String(at));
  } catch {
    // Recording a wake must never break the wake.
  }
}

export function lastWakeAt(): number | null {
  const raw = mmkv.getString(KEY);
  if (!raw) {
    return null;
  }
  const at = parseInt(raw, 10);
  return Number.isNaN(at) ? null : at;
}

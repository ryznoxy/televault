/**
 * Paces sends to the Bot API so a big run does not walk into its per-chat rate
 * limit (about 20 messages a minute to one channel).
 *
 * The gap only grows when the API actually pushes back: a 429 raises the gap to
 * the window it asked for (or doubles it when the answer carries no window), and
 * every clean send halves it back towards the floor. A run that never sees a 429
 * keeps uploading at the floor, so slow, safe-by-default pacing costs nothing
 * until the API says the pace is too high.
 */
const MIN_GAP_MS = 1000;
const MAX_GAP_MS = 30_000;

let gapMs = MIN_GAP_MS;

/** Current minimum gap between two sends to the same chat. */
export function sendGapMs(): number {
  return gapMs;
}

/** A 429 arrived: wait at least as long as it asked for. */
export function noteRateLimited(retryAfterSec?: number): void {
  const asked = retryAfterSec && retryAfterSec > 0 ? retryAfterSec * 1000 : gapMs * 2;
  gapMs = Math.min(MAX_GAP_MS, Math.max(MIN_GAP_MS, asked));
}

/** A send went through: ease back towards the floor. */
export function noteSendOk(): void {
  gapMs = Math.max(MIN_GAP_MS, Math.round(gapMs / 2));
}

/** Test seam, and what a fresh process starts from. */
export function resetThrottle(): void {
  gapMs = MIN_GAP_MS;
}
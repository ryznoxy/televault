export function parseClampedInt(text: string, min: number, max: number, fallback: number): number {
  const parsed = parseInt(text, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/** Byte size as short human text; shared by screens and the backup notification. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
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
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Exponential moving average of an instantaneous bytes/sec sample. */
export function nextSpeed(previous: number | null, instant: number): number {
  return previous == null ? instant : previous * 0.6 + instant * 0.4;
}

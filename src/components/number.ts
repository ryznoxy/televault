export function parseClampedInt(text: string, min: number, max: number, fallback: number): number {
  const parsed = parseInt(text, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

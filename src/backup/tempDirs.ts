/**
 * Cache directories that belong to an in-flight backup or restore in this JS
 * context. "Bersihkan cache" must not unlink a `staging_*` / `restore_*` dir
 * while a run is still writing to it. The set is process-local, so a run in
 * another JS context (a headless backup) is caught by the running-session check
 * in SettingsScreen instead.
 */
const active = new Set<string>();

export function trackTempDir(path: string): void {
  active.add(path);
}

export function untrackTempDir(path: string): void {
  active.delete(path);
}

export function isActiveTempDir(path: string): boolean {
  return active.has(path);
}

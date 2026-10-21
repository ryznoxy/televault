import { ScheduleMode, type BackupConfig } from '../types/models';

/** Human distance for a past timestamp, used by Diagnostics and the status notification. */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp;
  if (diff < 60_000) {
    return 'baru saja';
  }
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) {
    return `${minutes} menit lalu`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} jam lalu`;
  }
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/** Body of the ongoing status notification. */
export function statusBody(lastBackupAt: number | null, now: number = Date.now()): string {
  return lastBackupAt == null
    ? 'Backup otomatis \u00b7 belum pernah berjalan'
    : `Backup otomatis \u00b7 terakhir ${relativeTime(lastBackupAt, now)}`;
}

/** The status notification only makes sense while automation is on. */
export function statusVisible(
  config: Pick<BackupConfig, 'automationPaused' | 'scheduleMode'>,
): boolean {
  return !config.automationPaused && config.scheduleMode !== ScheduleMode.MANUAL;
}

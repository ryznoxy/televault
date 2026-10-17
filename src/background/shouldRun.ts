import { BackupConfig, ScheduleMode } from '../types/models';

export function shouldRunNow(
  config: BackupConfig,
  lastBackupAt: number | null,
  now: number,
): boolean {
  if (config.automationPaused) {
    return false;
  }
  switch (config.scheduleMode) {
    case ScheduleMode.MANUAL:
      return false;
    case ScheduleMode.INTERVAL:
      return lastBackupAt === null || now - lastBackupAt >= config.intervalHours * 3600_000;
    case ScheduleMode.TIME: {
      const target = new Date(now);
      target.setHours(config.scheduledTimeHour, 0, 0, 0);
      const targetTs = target.getTime();
      return now >= targetTs && (lastBackupAt === null || lastBackupAt < targetTs);
    }
    case ScheduleMode.CHARGING:
      return true;
  }
}

import { BackupConfig, ScheduleMode } from '../types/models';

export function shouldRunNow(
  config: BackupConfig,
  lastBackupAt: number | null,
  now: number,
  /** True when the caller is the exact alarm firing at the scheduled hour. */
  atScheduledSlot = false,
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
      if (now < targetTs) {
        return false;
      }
      // No run on record means there is no missed slot to catch up: a fresh
      // install (daily at 02:00 out of the box) must wait for its hour instead
      // of firing on the first background wake after setup. The alarm itself is
      // that hour, so it passes `atScheduledSlot` and runs the first backup.
      if (lastBackupAt === null) {
        return atScheduledSlot;
      }
      return lastBackupAt < targetTs;
    }
    case ScheduleMode.CHARGING:
      return true;
  }
}

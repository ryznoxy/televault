import { runScheduledBackup } from './scheduler';
import { runBackupInNativeService } from './foregroundService';
import { syncExactAlarm } from './androidStatus';
import { recordWake } from './wake';
import { logError } from '../state/errorLog';

/**
 * Entry point for the exact alarm's foreground service
 * (`ScheduledRunService`). The service is already running, so the backup runs
 * inside it instead of starting another service, which Android 12+ refuses
 * from the background.
 */
export async function scheduledRunTask(): Promise<void> {
  recordWake();
  try {
    await runScheduledBackup(runBackupInNativeService);
  } catch (error) {
    logError('scheduler', error);
  } finally {
    // The alarm is one-shot: aim it at the next occurrence before the service
    // stops, otherwise the schedule dies after a single run.
    syncExactAlarm();
  }
}

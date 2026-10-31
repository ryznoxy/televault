import BackgroundFetch from 'react-native-background-fetch';
import { getConfig } from '../state/settingsStore';
import { ScheduleMode } from '../types/models';
import { sessionsRepo } from '../db/repositories/sessions';
import type { BackupResult } from '../backup/backupRunner';
import { runBackupInForeground } from './foregroundService';
import { refreshStatusNotification, syncExactAlarm } from './androidStatus';
import { recordWake } from './wake';
import { shouldRunNow } from './shouldRun';
import { logError } from '../state/errorLog';

/**
 * `run` decides where the backup executes: the foreground service for a
 * JobScheduler wake-up, or the alarm's own service for an exact scheduled run.
 *
 * `atScheduledSlot` is set by the exact alarm, which fires at the user's hour
 * and is therefore allowed to run the very first backup of a fresh install.
 */
export async function runScheduledBackup(
  run: () => Promise<BackupResult> = runBackupInForeground,
  atScheduledSlot = false,
): Promise<void> {
  const config = getConfig();
  // The last attempt, not the last success: a slot that ran and failed today
  // must not be retried by every JobScheduler wake until tomorrow.
  const lastAt = await sessionsRepo.lastAttemptAt();
  if (!shouldRunNow(config, lastAt, Date.now(), atScheduledSlot)) {
    return;
  }
  await run();
}

export async function configureScheduler(): Promise<void> {
  const config = getConfig();
  syncExactAlarm(config);
  if (config.automationPaused || config.scheduleMode === ScheduleMode.MANUAL) {
    await BackgroundFetch.stop();
    return;
  }
  await BackgroundFetch.configure(
    {
      minimumFetchInterval:
        config.scheduleMode === ScheduleMode.INTERVAL
          ? Math.max(15, config.intervalHours * 60)
          : 15,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: config.wifiOnly
        ? BackgroundFetch.NETWORK_TYPE_UNMETERED
        : BackgroundFetch.NETWORK_TYPE_ANY,
      requiresCharging: config.chargingOnly,
      requiresBatteryNotLow: config.batteryMinEnabled,
      requiresStorageNotLow: true,
    },
    async taskId => {
      recordWake('job');
      try {
        await runScheduledBackup();
      } catch (error) {
        logError('scheduler', error);
      } finally {
        BackgroundFetch.finish(taskId);
        // Re-post (or clear) the ongoing status notification after every
        // wake-up; it is gone after a reboot and only the app can rebuild it.
        refreshStatusNotification();
      }
    },
    taskId => {
      BackgroundFetch.finish(taskId);
    },
  );
}

export async function stopScheduler(): Promise<void> {
  await BackgroundFetch.stop();
}

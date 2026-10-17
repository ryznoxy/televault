import BackgroundFetch from 'react-native-background-fetch';
import { getConfig } from '../state/settingsStore';
import { ScheduleMode } from '../types/models';
import { sessionsRepo } from '../db/repositories/sessions';
import { runBackupInForeground } from './foregroundService';
import { shouldRunNow } from './shouldRun';

export async function runScheduledBackup(): Promise<void> {
  const config = getConfig();
  const last = await sessionsRepo.lastSuccess();
  const lastAt = last ? (last.finished_at ?? last.started_at) : null;
  if (!shouldRunNow(config, lastAt, Date.now())) {
    return;
  }
  await runBackupInForeground();
}

export async function configureScheduler(): Promise<void> {
  const config = getConfig();
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
      requiresCharging: config.scheduleMode === ScheduleMode.CHARGING,
      requiresBatteryNotLow: config.batteryMinEnabled,
      requiresStorageNotLow: true,
    },
    async taskId => {
      try {
        await runScheduledBackup();
      } finally {
        BackgroundFetch.finish(taskId);
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

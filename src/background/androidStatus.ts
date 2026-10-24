import { NativeModules, Platform } from 'react-native';
import { sessionsRepo } from '../db/repositories/sessions';
import { getConfig } from '../state/settingsStore';
import { ScheduleMode, type BackupConfig } from '../types/models';
import { statusBody, statusVisible } from './statusText';

type VaultStatusNative = {
  versionName?: string;
  versionCode?: number;
  manufacturer?: string;
  showStatus: (title: string, body: string) => void;
  hideStatus: () => void;
  showRunProgress?: (text: string) => void;
  hideRunProgress?: () => void;
  scheduleExactAlarm?: (hour: number) => void;
  cancelExactAlarm?: () => void;
  isIgnoringBatteryOptimizations: () => Promise<boolean>;
  isUnmetered: () => Promise<boolean>;
  isCharging: () => Promise<boolean>;
  hasAllFilesAccess: () => Promise<boolean>;
  openAllFilesSettings: () => void;
  requestIgnoreBatteryOptimizations: () => void;
  openAutostartSettings: () => void;
};

/** Native `VaultStatus` module; undefined on iOS and in tests. */
export function nativeStatus(): VaultStatusNative | undefined {
  if (Platform.OS !== 'android') {
    return undefined;
  }
  return (NativeModules as { VaultStatus?: VaultStatusNative }).VaultStatus;
}

/** Drops the ongoing status notification so the run's own notification stands alone. */
export function hideStatusNotification(): void {
  nativeStatus()?.hideStatus();
}

/**
 * Whether the current connection is unmetered (Wi-Fi/Ethernet). Unknown counts
 * as unmetered: refusing every run on a platform that cannot answer would be
 * worse than the rule being ignored there.
 */
export async function isUnmeteredNetwork(): Promise<boolean> {
  const native = nativeStatus();
  if (!native?.isUnmetered) {
    return true;
  }
  try {
    return await native.isUnmetered();
  } catch {
    return true;
  }
}

/**
 * Whether the device is on a charger. Unknown counts as charging: skipping a
 * run because the platform could not answer would silently break the schedule.
 */
export async function isCharging(): Promise<boolean> {
  const native = nativeStatus();
  if (!native?.isCharging) {
    return true;
  }
  try {
    return await native.isCharging();
  } catch {
    return true;
  }
}

/** True when Android has granted "all files" access (MANAGE_EXTERNAL_STORAGE). */
export async function hasAllFilesAccess(): Promise<boolean> {
  const native = nativeStatus();
  if (!native?.hasAllFilesAccess) {
    return false;
  }
  try {
    return await native.hasAllFilesAccess();
  } catch {
    return false;
  }
}

/** Opens the system screen with the "Allow management of all files" switch. */
export function openAllFilesSettings(): void {
  nativeStatus()?.openAllFilesSettings?.();
}

/**
 * Keeps the exact alarm pointed at the next scheduled run, or clears it when
 * automation is off. JobScheduler's periodic job is inexact and Android 12+
 * refuses a foreground service started from the background, so the exact alarm
 * is what makes the chosen hour hold and lets the run start its service at all.
 */
export function syncExactAlarm(config: BackupConfig = getConfig()): void {
  const native = nativeStatus();
  if (!native?.scheduleExactAlarm) {
    return;
  }
  if (config.scheduleMode === ScheduleMode.TIME && !config.automationPaused) {
    native.scheduleExactAlarm(config.scheduledTimeHour);
  } else {
    native.cancelExactAlarm?.();
  }
}

/**
 * Keeps the ongoing notification truthful: what the last backup was and that
 * automation is on. `setOngoing(true)` on the native side means the user cannot
 * swipe it away, so it must never claim automation is running while paused.
 *
 * The last run counts whether it ended `success` or `partial`: runs that skip a
 * chunk or report an unreadable category are still real uploads, and the app
 * shows them everywhere else. Using `lastSuccess` left the notification saying
 * "belum pernah berjalan" for users whose runs always end partial.
 */
export function refreshStatusNotification(
  native: VaultStatusNative | undefined = nativeStatus(),
  /** Injected in tests; the default reads the sessions table. */
  repo: Pick<typeof sessionsRepo, 'lastFinished'> = sessionsRepo,
): void {
  if (!native) {
    return;
  }
  if (!statusVisible(getConfig())) {
    native.hideStatus();
    return;
  }
  repo
    .lastFinished()
    .then(last =>
      native.showStatus(
        'TeleVault aktif',
        statusBody(last ? last.finished_at ?? last.started_at : null),
      ),
    )
    .catch(() => native.showStatus('TeleVault aktif', 'Backup otomatis aktif'));
}

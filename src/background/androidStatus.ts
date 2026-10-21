import { NativeModules, Platform } from 'react-native';
import { sessionsRepo } from '../db/repositories/sessions';
import { getConfig } from '../state/settingsStore';
import { statusBody, statusVisible } from './statusText';

type VaultStatusNative = {
  versionName?: string;
  versionCode?: number;
  manufacturer?: string;
  showStatus: (title: string, body: string) => void;
  hideStatus: () => void;
  isIgnoringBatteryOptimizations: () => Promise<boolean>;
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
 * Keeps the ongoing notification truthful: what the last backup was and that
 * automation is on. `setOngoing(true)` on the native side means the user cannot
 * swipe it away, so it must never claim automation is running while paused.
 */
export function refreshStatusNotification(): void {
  const native = nativeStatus();
  if (!native) {
    return;
  }
  if (!statusVisible(getConfig())) {
    native.hideStatus();
    return;
  }
  sessionsRepo
    .lastSuccess()
    .then(last =>
      native.showStatus(
        'TeleVault aktif',
        statusBody(last ? last.finished_at ?? last.started_at : null),
      ),
    )
    .catch(() => native.showStatus('TeleVault aktif', 'Backup otomatis aktif'));
}

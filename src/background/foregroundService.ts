import BackgroundService from 'react-native-background-actions';
import { runBackup, type BackupProgress, type BackupResult } from '../backup/backupRunner';
import { hideStatusNotification, nativeStatus, refreshStatusNotification } from './androidStatus';
import { formatBytes, nextSpeed } from '../components/number';
import { logError } from '../state/errorLog';

const OPTIONS = {
  taskName: 'TeleVault',
  taskTitle: 'Backup running',
  taskDesc: 'Preparing\u2026',
  // Monochrome status-bar icon. The launcher icon is a coloured square, which
  // Android renders as a solid blob in the notification shade.
  taskIcon: { name: 'ic_stat_vault', type: 'drawable' },
  color: '#2AABEE',
  foregroundServiceType: ['dataSync'] as ('dataSync')[],
};

const IDLE_RESULT: BackupResult = { status: 'failed', chunksSent: 0, files: 0, totalSize: 0, deferred: 0 };

/**
 * Result error set when a run is refused because another is already in flight,
 * so a caller can tell a refusal apart from a real backup failure.
 */
export const BACKUP_IN_FLIGHT_ERROR = 'Backup lain sedang berjalan';

/**
 * Set when the system refused to start the foreground service. A start is
 * normally instant; waiting longer than this means the task will never run.
 */
export const SERVICE_REFUSED_ERROR = 'Sistem menolak menjalankan layanan latar belakang';

export const SERVICE_START_TIMEOUT_MS = 15_000;

/** True once `started` settles; false when `ms` passes first. */
function settledWithin(started: Promise<void>, ms: number): Promise<boolean> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), ms);
    started.then(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

/**
 * Notification text for a run: phase, percent, and upload speed.
 *
 * Byte-level progress arrives several times a second per chunk, so the text is
 * only pushed when it actually changes and at most ~once a second: posting more
 * often burns battery for no readable benefit.
 */
function progressReporter(push: (text: string) => void) {
  let lastText = '';
  let lastAt = 0;
  let speedBps: number | null = null;
  let lastTick: { sent: number; at: number } | null = null;

  return {
    notify(progress: BackupProgress): void {
      const pct =
        progress.overall.total > 0
          ? Math.round((progress.overall.current / progress.overall.total) * 100)
          : 0;
      if (progress.phase !== 'uploading' && progress.phase !== 'manifest') {
        speedBps = null;
        lastTick = null;
      }
      const speedText = speedBps ? ` \u00b7 ${formatBytes(Math.round(speedBps))}/s` : '';
      const text = `${progress.phase} ${pct}%${speedText}`;
      const now = Date.now();
      if (text !== lastText && now - lastAt >= 1200) {
        lastText = text;
        lastAt = now;
        push(text);
      }
    },

    onBytes(sent: number): void {
      const now = Date.now();
      if (lastTick) {
        // The per-part counter restarts at 0 on every new part, so a tick
        // whose `sent` dropped means a part boundary, fold it in.
        const dSent = sent >= lastTick.sent ? sent - lastTick.sent : sent;
        const dMs = now - lastTick.at;
        if (dMs > 200) {
          speedBps = nextSpeed(speedBps, (dSent * 1000) / dMs);
        }
      }
      lastTick = { sent, at: now };
    },
  };
}

/**
 * One run at a time, whichever way it was started (manual button, scheduled
 * fetch, exact alarm). Sharing the in-flight promise stops an overlapping
 * caller from starting a second service for the same backup.
 */
let inFlight: Promise<BackupResult> | null = null;

function guarded(run: () => Promise<BackupResult>): Promise<BackupResult> {
  if (inFlight) {
    return inFlight;
  }
  if (BackgroundService.isRunning()) {
    return Promise.resolve({ ...IDLE_RESULT, error: BACKUP_IN_FLIGHT_ERROR });
  }
  const started = run();
  inFlight = started;
  return started.finally(() => {
    if (inFlight === started) {
      inFlight = null;
    }
  });
}

/**
 * `BackgroundService.start` resolves when the native service has started, not
 * when the task finishes: on Android it registers a headless task and awaits
 * `RNBackgroundActions.start`; on iOS it calls the task without awaiting. The
 * task bridges its result back through `done`, which is awaited here, so the
 * caller gets the real `BackupResult`.
 */
export function runBackupInForeground(
  onProgress?: (progress: BackupProgress) => void,
  onUploadBytes?: (sent: number, total: number) => void,
): Promise<BackupResult> {
  return guarded(() => withForegroundService(onProgress, onUploadBytes));
}

async function withForegroundService(
  onProgress?: (progress: BackupProgress) => void,
  onUploadBytes?: (sent: number, total: number) => void,
): Promise<BackupResult> {
  // The foreground service posts its own progress notification; two ongoing
  // notifications for one backup is noise.
  hideStatusNotification();
  const reporter = progressReporter(text => {
    BackgroundService.updateNotification({ taskDesc: text }).catch(() => undefined);
  });

  let resolveDone: (result: BackupResult) => void = () => undefined;
  const done = new Promise<BackupResult>(resolve => {
    resolveDone = resolve;
  });
  let markStarted: () => void = () => undefined;
  const started = new Promise<void>(resolve => {
    markStarted = resolve;
  });

  await BackgroundService.start(async () => {
    markStarted();
    let result: BackupResult = { ...IDLE_RESULT };
    try {
      result = await runBackup(
        progress => {
          onProgress?.(progress);
          reporter.notify(progress);
        },
        (sent, total) => {
          reporter.onBytes(sent);
          onUploadBytes?.(sent, total);
        },
      );
    } catch (error) {
      // The task must never reject: the plugin only calls `stop()` from
      // `task(parameters).then(...)`, so a rejection leaves `_isRunning` true
      // and `_stopTask` unresolved, refusing every later run forever.
      result = {
        ...IDLE_RESULT,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      resolveDone(result);
      // Restore the ongoing status notification with the fresh "last backup".
      refreshStatusNotification();
    }
  }, OPTIONS);

  // Android 12+ refuses a foreground service started from the background, and
  // the plugin swallows the refusal: `start` resolves, the task never runs, so
  // `done` would never settle and the run would hang forever with no log.
  if (!(await settledWithin(started, SERVICE_START_TIMEOUT_MS))) {
    await BackgroundService.stop().catch(() => undefined);
    logError('scheduler', SERVICE_REFUSED_ERROR);
    resolveDone({ ...IDLE_RESULT, error: SERVICE_REFUSED_ERROR });
  }
  return done;
}

/**
 * Runs the backup inside the foreground service the exact alarm already
 * started, so nothing has to be started from the background here. Used for
 * scheduled runs on Android, where starting a service from a background
 * wake-up is what the system refuses.
 */
export function runBackupInNativeService(): Promise<BackupResult> {
  return guarded(runInsideOwnService);
}

async function runInsideOwnService(): Promise<BackupResult> {
  const native = nativeStatus();
  hideStatusNotification();
  const reporter = progressReporter(text => native?.showRunProgress?.(text));
  try {
    return await runBackup(
      progress => reporter.notify(progress),
      sent => reporter.onBytes(sent),
    );
  } catch (error) {
    return {
      ...IDLE_RESULT,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    native?.hideRunProgress?.();
    refreshStatusNotification();
  }
}

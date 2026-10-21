import BackgroundService from 'react-native-background-actions';
import { runBackup, type BackupProgress, type BackupResult } from '../backup/backupRunner';
import { hideStatusNotification, refreshStatusNotification } from './androidStatus';
import { formatBytes, nextSpeed } from '../components/number';

const OPTIONS = {
  taskName: 'TeleVault',
  taskTitle: 'Backup running',
  taskDesc: 'Preparing\u2026',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
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
 * `BackgroundService.start` resolves when the native service has started, not
 * when the task finishes: on Android it registers a headless task and awaits
 * `RNBackgroundActions.start`; on iOS it calls the task without awaiting. The
 * task bridges its result back through `done`, which is awaited here, so the
 * caller gets the real `BackupResult`. Sharing the in-flight promise also stops
 * an overlapping call (manual + scheduled) from starting a second service.
 */
let inFlight: Promise<BackupResult> | null = null;

export async function runBackupInForeground(
  onProgress?: (progress: BackupProgress) => void,
  onUploadBytes?: (sent: number, total: number) => void,
): Promise<BackupResult> {
  if (inFlight) {
    return inFlight;
  }
  if (BackgroundService.isRunning()) {
    return { ...IDLE_RESULT, error: BACKUP_IN_FLIGHT_ERROR };
  }

  const run = (async (): Promise<BackupResult> => {
    // The foreground service posts its own progress notification; two ongoing
    // notifications for one backup is noise.
    hideStatusNotification();
    let resolveDone: (result: BackupResult) => void = () => undefined;
    const done = new Promise<BackupResult>(resolve => {
      resolveDone = resolve;
    });
    await BackgroundService.start(async () => {
      let result: BackupResult = { ...IDLE_RESULT };
      // Byte-level progress arrives several times a second per chunk, so only push
      // a notification update when the text actually changes and at most ~once a
      // second: posting more often burns battery for no readable benefit.
      let lastDesc = '';
      let lastNotifyAt = 0;
      let speedBps: number | null = null;
      let lastTick: { sent: number; at: number } | null = null;
      const notify = (progress: BackupProgress): void => {
        const pct =
          progress.overall.total > 0
            ? Math.round((progress.overall.current / progress.overall.total) * 100)
            : 0;
        if (progress.phase !== 'uploading' && progress.phase !== 'manifest') {
          speedBps = null;
          lastTick = null;
        }
        const speedText = speedBps ? ` \u00b7 ${formatBytes(Math.round(speedBps))}/s` : '';
        const desc = `${progress.phase} ${pct}%${speedText}`;
        const now = Date.now();
        if (desc !== lastDesc && now - lastNotifyAt >= 1200) {
          lastDesc = desc;
          lastNotifyAt = now;
          BackgroundService.updateNotification({ taskDesc: desc }).catch(() => undefined);
        }
      };
      const onBytes = (sent: number, total: number): void => {
        const now = Date.now();
        if (lastTick) {
          // The per-part counter restarts at 0 on every new part, so a tick
          // whose `sent` dropped means a part boundary — fold it in.
          const dSent = sent >= lastTick.sent ? sent - lastTick.sent : sent;
          const dMs = now - lastTick.at;
          if (dMs > 200) {
            speedBps = nextSpeed(speedBps, (dSent * 1000) / dMs);
          }
        }
        lastTick = { sent, at: now };
        onUploadBytes?.(sent, total);
      };
      try {
        result = await runBackup(
          progress => {
            onProgress?.(progress);
            notify(progress);
          },
          onBytes,
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
    return done;
  })();

  inFlight = run;
  try {
    return await run;
  } finally {
    if (inFlight === run) {
      inFlight = null;
    }
  }
}

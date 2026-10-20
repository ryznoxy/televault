import BackgroundService from 'react-native-background-actions';
import { runBackup, type BackupProgress, type BackupResult } from '../backup/backupRunner';

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
    let resolveDone: (result: BackupResult) => void = () => undefined;
    const done = new Promise<BackupResult>(resolve => {
      resolveDone = resolve;
    });
    await BackgroundService.start(async () => {
      let result: BackupResult = { ...IDLE_RESULT };
      // Byte-level progress arrives several times a second per chunk, so only push
      // a notification update when the text actually changes.
      let lastDesc = '';
      try {
        result = await runBackup(
          progress => {
            onProgress?.(progress);
            const pct =
              progress.overall.total > 0
                ? Math.round((progress.overall.current / progress.overall.total) * 100)
                : 0;
            const desc = `${progress.phase} ${pct}%`;
            if (desc !== lastDesc) {
              lastDesc = desc;
              BackgroundService.updateNotification({ taskDesc: desc }).catch(() => undefined);
            }
          },
          onUploadBytes,
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

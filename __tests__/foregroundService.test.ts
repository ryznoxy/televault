import BackgroundService from 'react-native-background-actions';
import { runBackup } from '../src/backup/backupRunner';
import {
  runBackupInForeground,
  SERVICE_REFUSED_ERROR,
  SERVICE_START_TIMEOUT_MS,
} from '../src/background/foregroundService';
import { clearErrorLog, getErrorLog } from '../src/state/errorLog';

jest.mock('../src/backup/backupRunner', () => ({ runBackup: jest.fn() }));
jest.mock('../src/background/androidStatus', () => ({
  hideStatusNotification: jest.fn(),
  refreshStatusNotification: jest.fn(),
}));

const mockStart = BackgroundService.start as jest.Mock;
const mockStop = BackgroundService.stop as jest.Mock;
const mockIsRunning = BackgroundService.isRunning as jest.Mock;
const mockRunBackup = runBackup as jest.Mock;

const OK = { status: 'success', chunksSent: 1, files: 1, totalSize: 10, deferred: 0 };

describe('runBackupInForeground', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearErrorLog();
    mockIsRunning.mockReturnValue(false);
    mockStop.mockResolvedValue(undefined);
  });

  test('returns the runner result when the service really starts', async () => {
    mockStart.mockImplementation(async task => {
      await task();
    });
    mockRunBackup.mockResolvedValue(OK);

    await expect(runBackupInForeground()).resolves.toEqual(OK);
    expect(mockStop).not.toHaveBeenCalled();
  });

  test('fails instead of hanging when Android refuses the service', async () => {
    // Android 12+ refuses a foreground service started from the background, and
    // the plugin swallows the refusal: `start` resolves, the task never runs, so
    // the completion promise would never settle.
    mockStart.mockImplementation(async () => undefined);
    jest.useFakeTimers();
    try {
      const pending = runBackupInForeground();
      // Let `start` resolve and the watchdog timer register.
      for (let i = 0; i < 5; i += 1) {
        await Promise.resolve();
      }
      jest.advanceTimersByTime(SERVICE_START_TIMEOUT_MS);

      const result = await pending;
      expect(result.status).toBe('failed');
      expect(result.error).toBe(SERVICE_REFUSED_ERROR);
      expect(mockRunBackup).not.toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalledTimes(1);
      expect(getErrorLog()[0]).toMatchObject({ scope: 'scheduler' });
    } finally {
      jest.useRealTimers();
    }
  });
});

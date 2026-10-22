import { runScheduledBackup } from '../src/background/scheduler';
import { runBackupInNativeService } from '../src/background/foregroundService';
import { syncExactAlarm } from '../src/background/androidStatus';
import { scheduledRunTask } from '../src/background/scheduledRun';
import { lastWake } from '../src/background/wake';
import { clearErrorLog, getErrorLog } from '../src/state/errorLog';

jest.mock('../src/background/scheduler', () => ({ runScheduledBackup: jest.fn() }));
jest.mock('../src/background/foregroundService', () => ({
  runBackupInNativeService: jest.fn(),
}));
jest.mock('../src/background/androidStatus', () => ({ syncExactAlarm: jest.fn() }));

const mockRunScheduledBackup = runScheduledBackup as jest.Mock;
const mockSyncExactAlarm = syncExactAlarm as jest.Mock;

describe('scheduledRunTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearErrorLog();
    mockRunScheduledBackup.mockResolvedValue(undefined);
  });

  test('runs the backup inside the alarm service and re-arms the alarm', async () => {
    const before = Date.now();
    await scheduledRunTask();

    // The native runner is what avoids starting a second service from the background.
    expect(mockRunScheduledBackup).toHaveBeenCalledWith(runBackupInNativeService);
    expect(mockSyncExactAlarm).toHaveBeenCalledTimes(1);
    // The alarm's service records its own source, so Troubleshooting can tell it
    // apart from an inexact JobScheduler wake.
    const wake = lastWake();
    expect(wake?.at).toBeGreaterThanOrEqual(before);
    expect(wake?.source).toBe('alarm');
  });

  test('logs a failure and still re-arms the alarm', async () => {
    mockRunScheduledBackup.mockRejectedValue(new Error('gagal'));

    await expect(scheduledRunTask()).resolves.toBeUndefined();

    expect(getErrorLog()[0]).toMatchObject({ scope: 'scheduler', message: 'gagal' });
    expect(mockSyncExactAlarm).toHaveBeenCalledTimes(1);
  });
});

import { runScheduledBackup } from '../src/background/scheduler';
import { runBackupInNativeService } from '../src/background/foregroundService';
import { isCharging, syncExactAlarm } from '../src/background/androidStatus';
import { scheduledRunTask } from '../src/background/scheduledRun';
import { lastWake } from '../src/background/wake';
import { clearErrorLog, getErrorLog } from '../src/state/errorLog';
import { DEFAULT_CONFIG } from '../src/types/models';
import { useSettingsStore } from '../src/state/settingsStore';

jest.mock('../src/background/scheduler', () => ({ runScheduledBackup: jest.fn() }));
jest.mock('../src/background/foregroundService', () => ({
  runBackupInNativeService: jest.fn(),
}));
jest.mock('../src/background/androidStatus', () => ({
  syncExactAlarm: jest.fn(),
  isCharging: jest.fn(async () => true),
}));

const mockRunScheduledBackup = runScheduledBackup as jest.Mock;
const mockSyncExactAlarm = syncExactAlarm as jest.Mock;
const mockIsCharging = isCharging as jest.Mock;

describe('scheduledRunTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearErrorLog();
    mockRunScheduledBackup.mockResolvedValue(undefined);
    mockIsCharging.mockResolvedValue(true);
    useSettingsStore.setState({ config: { ...DEFAULT_CONFIG, chargingOnly: false } });
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

  test('skips the run while charging-only is on and no charger is connected', async () => {
    useSettingsStore.setState({ config: { ...DEFAULT_CONFIG, chargingOnly: true } });
    mockIsCharging.mockResolvedValue(false);

    await scheduledRunTask();

    expect(mockRunScheduledBackup).not.toHaveBeenCalled();
    // The alarm is one-shot: skipping must still aim it at tomorrow.
    expect(mockSyncExactAlarm).toHaveBeenCalledTimes(1);
  });

  test('runs on the alarm slot when charging-only is on and the phone is charging', async () => {
    useSettingsStore.setState({ config: { ...DEFAULT_CONFIG, chargingOnly: true } });
    mockIsCharging.mockResolvedValue(true);

    await scheduledRunTask();

    expect(mockRunScheduledBackup).toHaveBeenCalledWith(runBackupInNativeService);
  });
});

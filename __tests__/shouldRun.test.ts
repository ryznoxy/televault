import { DEFAULT_CONFIG, ScheduleMode, type BackupConfig } from '../src/types/models';
import { shouldRunNow } from '../src/background/shouldRun';
import { runScheduledBackup } from '../src/background/scheduler';
import { getConfig } from '../src/state/settingsStore';
import { sessionsRepo } from '../src/db/repositories/sessions';
import { runBackupInForeground } from '../src/background/foregroundService';

// Mocks for the runScheduledBackup gating tests at the bottom of this file.
// Factories build `jest.fn()` inline so no factory reads a `const` before it is
// initialised; typed handles are pulled from the mocked modules after import.
jest.mock('../src/state/settingsStore', () => ({ getConfig: jest.fn() }));
jest.mock('../src/db/repositories/sessions', () => ({
  sessionsRepo: { lastSuccess: jest.fn() },
}));
jest.mock('../src/background/foregroundService', () => ({
  runBackupInForeground: jest.fn(async () => undefined),
}));
jest.mock(
  'react-native-background-fetch',
  () => ({
    __esModule: true,
    default: {
      configure: jest.fn(),
      stop: jest.fn(),
      finish: jest.fn(),
      NETWORK_TYPE_ANY: 0,
      NETWORK_TYPE_UNMETERED: 1,
    },
  }),
);

const mockGetConfig = getConfig as jest.Mock;
const mockLastSuccess = sessionsRepo.lastSuccess as jest.Mock;
const mockRunBackupInForeground = runBackupInForeground as jest.Mock;

const configWith = (overrides: Partial<BackupConfig>): BackupConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
});

const HOUR = 3600_000;

describe('shouldRunNow', () => {
  test('manual never runs', () => {
    const config = configWith({ scheduleMode: ScheduleMode.MANUAL });
    expect(shouldRunNow(config, null, Date.now())).toBe(false);
    expect(shouldRunNow(config, Date.now() - 100 * HOUR, Date.now())).toBe(false);
  });

  describe('interval', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0, 0).getTime();
    const config = configWith({ scheduleMode: ScheduleMode.INTERVAL, intervalHours: 24 });

    test('not enough elapsed -> false', () => {
      expect(shouldRunNow(config, now - 1 * HOUR, now)).toBe(false);
    });

    test('enough elapsed -> true', () => {
      expect(shouldRunNow(config, now - 25 * HOUR, now)).toBe(true);
    });

    test('never backed up -> true', () => {
      expect(shouldRunNow(config, null, now)).toBe(true);
    });
  });

  describe('time', () => {
    const config = configWith({ scheduleMode: ScheduleMode.TIME, scheduledTimeHour: 2 });
    const todayTarget = new Date(2026, 0, 15, 2, 0, 0, 0).getTime();

    test('before today target -> false', () => {
      const now = new Date(2026, 0, 15, 1, 0, 0, 0).getTime();
      expect(shouldRunNow(config, null, now)).toBe(false);
    });

    test('after target and last backup before target -> true', () => {
      const now = new Date(2026, 0, 15, 3, 0, 0, 0).getTime();
      const lastBackupAt = new Date(2026, 0, 14, 23, 0, 0, 0).getTime();
      expect(shouldRunNow(config, lastBackupAt, now)).toBe(true);
    });

    test('after target but already backed up after target -> false', () => {
      const now = new Date(2026, 0, 15, 3, 0, 0, 0).getTime();
      const lastBackupAt = todayTarget + 30 * 60_000;
      expect(shouldRunNow(config, lastBackupAt, now)).toBe(false);
    });
  });

  test('paused automation never runs', () => {
    const config = configWith({ automationPaused: true, scheduleMode: ScheduleMode.INTERVAL });
    expect(shouldRunNow(config, null, Date.now())).toBe(false);
    expect(shouldRunNow(config, Date.now() - 100 * HOUR, Date.now())).toBe(false);
  });

  test('charging always runs', () => {
    const config = configWith({ scheduleMode: ScheduleMode.CHARGING });
    expect(shouldRunNow(config, Date.now(), Date.now())).toBe(true);
  });
});

describe('runScheduledBackup gating', () => {
  beforeEach(() => {
    mockGetConfig.mockReset();
    mockLastSuccess.mockReset();
    mockRunBackupInForeground.mockReset();
    mockRunBackupInForeground.mockResolvedValue(undefined);
  });

  test('interval: does not run when the last success is too recent', async () => {
    const now = Date.now();
    mockGetConfig.mockReturnValue(
      configWith({ scheduleMode: ScheduleMode.INTERVAL, intervalHours: 24 }),
    );
    mockLastSuccess.mockResolvedValue({
      finished_at: now,
      started_at: now,
    } as never);

    await runScheduledBackup();

    expect(mockRunBackupInForeground).not.toHaveBeenCalled();
  });

  test('interval: runs when no prior success exists', async () => {
    mockGetConfig.mockReturnValue(
      configWith({ scheduleMode: ScheduleMode.INTERVAL, intervalHours: 24 }),
    );
    mockLastSuccess.mockResolvedValue(null);

    await runScheduledBackup();

    expect(mockRunBackupInForeground).toHaveBeenCalledTimes(1);
  });

  test('manual: never runs regardless of last success', async () => {
    mockGetConfig.mockReturnValue(configWith({ scheduleMode: ScheduleMode.MANUAL }));
    mockLastSuccess.mockResolvedValue(null);

    await runScheduledBackup();

    expect(mockRunBackupInForeground).not.toHaveBeenCalled();
  });
});

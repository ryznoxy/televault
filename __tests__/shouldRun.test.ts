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
  sessionsRepo: { lastAttemptAt: jest.fn() },
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
const mockLastAttempt = sessionsRepo.lastAttemptAt as jest.Mock;
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

    test('never backed up: only the alarm slot runs, a plain wake does not', () => {
      const now = new Date(2026, 0, 15, 14, 0, 0, 0).getTime();
      expect(shouldRunNow(config, null, now)).toBe(false);
      expect(shouldRunNow(config, null, now, true)).toBe(true);
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
    mockLastAttempt.mockReset();
    mockRunBackupInForeground.mockReset();
    mockRunBackupInForeground.mockResolvedValue(undefined);
  });

  test('interval: does not run when the last attempt is too recent', async () => {
    mockGetConfig.mockReturnValue(
      configWith({ scheduleMode: ScheduleMode.INTERVAL, intervalHours: 24 }),
    );
    mockLastAttempt.mockResolvedValue(Date.now());

    await runScheduledBackup();

    expect(mockRunBackupInForeground).not.toHaveBeenCalled();
  });

  test('interval: runs when no prior attempt exists', async () => {
    mockGetConfig.mockReturnValue(
      configWith({ scheduleMode: ScheduleMode.INTERVAL, intervalHours: 24 }),
    );
    mockLastAttempt.mockResolvedValue(null);

    await runScheduledBackup();

    expect(mockRunBackupInForeground).toHaveBeenCalledTimes(1);
  });

  test('manual: never runs regardless of last attempt', async () => {
    mockGetConfig.mockReturnValue(configWith({ scheduleMode: ScheduleMode.MANUAL }));
    mockLastAttempt.mockResolvedValue(null);

    await runScheduledBackup();

    expect(mockRunBackupInForeground).not.toHaveBeenCalled();
  });

  test('daily: a fresh install waits for 02:00 instead of running on any wake', async () => {
    mockGetConfig.mockReturnValue(configWith({ scheduleMode: ScheduleMode.TIME }));
    mockLastAttempt.mockResolvedValue(null);

    // Any hour after the slot: the old rule ran here, which is the "it backed
    // up by itself at the wrong time" report.
    jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 0, 15, 14, 0, 0, 0).getTime());
    try {
      await runScheduledBackup();
      expect(mockRunBackupInForeground).not.toHaveBeenCalled();

      // The alarm firing at the slot is the one allowed to do the first run.
      await runScheduledBackup(undefined, true);
      expect(mockRunBackupInForeground).toHaveBeenCalledTimes(1);
    } finally {
      (Date.now as jest.Mock).mockRestore();
    }
  });

  test('daily: a slot that already ran today is not retried by the next wake', async () => {
    const now = new Date(2026, 0, 15, 3, 0, 0, 0).getTime();
    mockGetConfig.mockReturnValue(configWith({ scheduleMode: ScheduleMode.TIME }));
    // Attempted at 02:05 and failed; the wake at 03:00 must leave it alone.
    mockLastAttempt.mockResolvedValue(new Date(2026, 0, 15, 2, 5, 0, 0).getTime());
    jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      await runScheduledBackup();
      expect(mockRunBackupInForeground).not.toHaveBeenCalled();
    } finally {
      (Date.now as jest.Mock).mockRestore();
    }
  });
});

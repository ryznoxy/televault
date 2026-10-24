import BackgroundFetch from 'react-native-background-fetch';
import { configureScheduler } from '../src/background/scheduler';
import { DEFAULT_CONFIG, ScheduleMode } from '../src/types/models';
import { useSettingsStore } from '../src/state/settingsStore';

jest.mock('react-native-background-fetch', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(async () => 2),
    stop: jest.fn(async () => true),
    NETWORK_TYPE_ANY: 1,
    NETWORK_TYPE_UNMETERED: 2,
  },
}));

jest.mock('../src/background/androidStatus', () => ({
  syncExactAlarm: jest.fn(),
  refreshStatusNotification: jest.fn(),
}));

jest.mock('../src/db/repositories/sessions', () => ({
  sessionsRepo: { lastSuccess: jest.fn(async () => null) },
}));

jest.mock('../src/background/foregroundService', () => ({
  runBackupInForeground: jest.fn(async () => ({})),
}));

const configure = BackgroundFetch.configure as unknown as jest.Mock;
const stop = BackgroundFetch.stop as unknown as jest.Mock;

function configureOptions(): Record<string, unknown> {
  return configure.mock.calls[configure.mock.calls.length - 1][0] as Record<string, unknown>;
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState({
    config: { ...DEFAULT_CONFIG, scheduleMode: ScheduleMode.INTERVAL, intervalHours: 1 },
  });
});

test('charging-only turns on the JobScheduler charging constraint', async () => {
  useSettingsStore.setState({
    config: {
      ...DEFAULT_CONFIG,
      scheduleMode: ScheduleMode.INTERVAL,
      intervalHours: 1,
      chargingOnly: true,
    },
  });

  await configureScheduler();

  expect(configureOptions().requiresCharging).toBe(true);
});

test('without the toggle the job runs on any power source', async () => {
  await configureScheduler();

  expect(configureOptions().requiresCharging).toBe(false);
});

test('manual mode stops the job instead of configuring it', async () => {
  useSettingsStore.setState({
    config: { ...DEFAULT_CONFIG, scheduleMode: ScheduleMode.MANUAL },
  });

  await configureScheduler();

  expect(stop).toHaveBeenCalled();
  expect(configure).not.toHaveBeenCalled();
});
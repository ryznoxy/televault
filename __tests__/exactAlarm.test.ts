import { NativeModules, Platform } from 'react-native';
import { DEFAULT_CONFIG, ScheduleMode } from '../src/types/models';
import { syncExactAlarm } from '../src/background/androidStatus';

describe('syncExactAlarm', () => {
  const scheduleExactAlarm = jest.fn();
  const cancelExactAlarm = jest.fn();
  const originalOS = Platform.OS;

  beforeAll(() => {
    Platform.OS = 'android';
    (NativeModules as Record<string, unknown>).VaultStatus = {
      showStatus: jest.fn(),
      hideStatus: jest.fn(),
      scheduleExactAlarm,
      cancelExactAlarm,
    };
  });

  afterAll(() => {
    Platform.OS = originalOS;
    delete (NativeModules as Record<string, unknown>).VaultStatus;
  });

  beforeEach(() => {
    scheduleExactAlarm.mockReset();
    cancelExactAlarm.mockReset();
  });

  test('arms the chosen hour while automation is on', () => {
    syncExactAlarm({
      ...DEFAULT_CONFIG,
      scheduleMode: ScheduleMode.TIME,
      scheduledTimeHour: 2,
    });

    expect(scheduleExactAlarm).toHaveBeenCalledWith(2);
    expect(cancelExactAlarm).not.toHaveBeenCalled();
  });

  test('clears the alarm when automation is paused', () => {
    syncExactAlarm({
      ...DEFAULT_CONFIG,
      scheduleMode: ScheduleMode.TIME,
      automationPaused: true,
    });

    expect(cancelExactAlarm).toHaveBeenCalledTimes(1);
    expect(scheduleExactAlarm).not.toHaveBeenCalled();
  });

  test('leaves interval mode to the background fetch', () => {
    syncExactAlarm({ ...DEFAULT_CONFIG, scheduleMode: ScheduleMode.INTERVAL });

    expect(cancelExactAlarm).toHaveBeenCalledTimes(1);
    expect(scheduleExactAlarm).not.toHaveBeenCalled();
  });
});

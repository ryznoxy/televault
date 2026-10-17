import { DEFAULT_CONFIG, Category, ScheduleMode, type WatchedFolder } from '../src/types/models';
import { useSettingsStore, getConfig } from '../src/state/settingsStore';
import { mmkv } from '../src/state/mmkv';

beforeEach(() => {
  mmkv.clearAll();
  useSettingsStore.setState({ config: DEFAULT_CONFIG, setupDone: false });
});

test('setCategories updates only the categories field', () => {
  useSettingsStore.getState().setCategories([Category.PHOTO, Category.SMS]);
  expect(getConfig().categories).toEqual([Category.PHOTO, Category.SMS]);
  expect(getConfig().scheduleMode).toBe(DEFAULT_CONFIG.scheduleMode);
});

test('setScheduleMode updates schedule mode', () => {
  useSettingsStore.getState().setScheduleMode(ScheduleMode.CHARGING);
  expect(getConfig().scheduleMode).toBe(ScheduleMode.CHARGING);
});

test('adds and removes watched folders', () => {
  const folder: WatchedFolder = { id: 'a', uri: 'file:///x/Docs', name: 'Docs', schedule: '6 jam' };
  useSettingsStore.getState().addWatchedFolder(folder);
  expect(getConfig().watchedFolders).toEqual([folder]);

  const other: WatchedFolder = { id: 'b', uri: 'file:///x/Photos', name: 'Photos', schedule: 'realtime' };
  useSettingsStore.getState().addWatchedFolder(other);
  expect(getConfig().watchedFolders).toEqual([folder, other]);

  useSettingsStore.getState().removeWatchedFolder('a');
  expect(getConfig().watchedFolders).toEqual([other]);
});

test('config is persisted to storage', () => {
  useSettingsStore.getState().setIntervalHours(6);
  const raw = mmkv.getString('telebot-settings');
  expect(raw).toBeTruthy();
  expect(JSON.parse(raw as string).state.config.intervalHours).toBe(6);
});

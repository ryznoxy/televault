import { DEFAULT_CONFIG } from '../src/types/models';
import { useSettingsStore, getConfig } from '../src/state/settingsStore';
import { mmkv } from '../src/state/mmkv';

beforeEach(() => {
  mmkv.clearAll();
  useSettingsStore.setState({ config: DEFAULT_CONFIG, setupDone: false });
});

test('new backup config fields have the documented defaults', () => {
  expect(DEFAULT_CONFIG.archiveFormat).toBe('zip');
  expect(DEFAULT_CONFIG.compressZip).toBe(true);
  expect(DEFAULT_CONFIG.directMedia).toBe(false);
  expect(DEFAULT_CONFIG.deleteLocalAfterBackup).toBe(false);
  expect(DEFAULT_CONFIG.notifyBotSummary).toBe(true);
  expect(DEFAULT_CONFIG.silentNotifications).toBe(false);
  expect(DEFAULT_CONFIG.alertOnFailure).toBe(true);
});

test('new setters round-trip through the store', () => {
  const store = useSettingsStore.getState();
  store.setArchiveFormat('7z');
  store.setDeleteLocalAfterBackup(true);
  store.setNotifyBotSummary(false);
  store.setSilentNotifications(true);
  store.setAlertOnFailure(false);

  const config = getConfig();
  expect(config.archiveFormat).toBe('7z');
  expect(config.deleteLocalAfterBackup).toBe(true);
  expect(config.notifyBotSummary).toBe(false);
  expect(config.silentNotifications).toBe(true);
  expect(config.alertOnFailure).toBe(false);
});

test('migrates an old persisted config that lacks the new keys', async () => {
  mmkv.set(
    'telebot-settings',
    JSON.stringify({
      state: {
        config: {
          categories: ['photo'],
          scheduleMode: 'interval',
          intervalHours: 6,
          scheduledTimeHour: 3,
          wifiOnly: false,
          encryptionEnabled: false,
          encryptionSalt: '',
          customFolderUri: null,
          watchedFolders: [],
          automationPaused: false,
          compressZip: false,
        },
        setupDone: true,
      },
      version: 0,
    }),
  );

  await useSettingsStore.persist.rehydrate();

  const config = getConfig();
  expect(config.intervalHours).toBe(6);
  expect(config.wifiOnly).toBe(false);
  expect(config.compressZip).toBe(false);
  expect(config.archiveFormat).toBe(DEFAULT_CONFIG.archiveFormat);
  expect(config.deleteLocalAfterBackup).toBe(DEFAULT_CONFIG.deleteLocalAfterBackup);
  expect(config.notifyBotSummary).toBe(DEFAULT_CONFIG.notifyBotSummary);
  expect(config.silentNotifications).toBe(DEFAULT_CONFIG.silentNotifications);
  expect(config.alertOnFailure).toBe(DEFAULT_CONFIG.alertOnFailure);
});

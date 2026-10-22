import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from './mmkv';
import {
  ArchiveFormat,
  BackupConfig,
  CategoryKey,
  DEFAULT_CONFIG,
  makeWatchedFolder,
  ScheduleModeKey,
  WatchedFolder,
} from '../types/models';

type SettingsState = {
  config: BackupConfig;
  setupDone: boolean;
  setCategories: (categories: CategoryKey[]) => void;
  setScheduleMode: (mode: ScheduleModeKey) => void;
  setIntervalHours: (hours: number) => void;
  setScheduledHour: (hour: number) => void;
  setWifiOnly: (value: boolean) => void;
  setEncryptionEnabled: (value: boolean) => void;
  setEncryptionSalt: (value: string) => void;
  setCustomFolderUri: (uri: string | null) => void;
  addWatchedFolder: (folder: WatchedFolder) => void;
  removeWatchedFolder: (id: string) => void;
  updateWatchedFolder: (id: string, patch: Partial<WatchedFolder>) => void;
  setAutomationPaused: (value: boolean) => void;
  setCompressZip: (value: boolean) => void;
  setDirectMedia: (value: boolean) => void;
  setDirectMediaMaxMb: (value: number) => void;
  setArchiveFormat: (value: ArchiveFormat) => void;
  setDeleteLocalAfterBackup: (value: boolean) => void;
  setNotifyBotSummary: (value: boolean) => void;
  setSilentNotifications: (value: boolean) => void;
  setAlertOnFailure: (value: boolean) => void;
  setBatteryMinEnabled: (value: boolean) => void;
  setMaxFilesPerRun: (value: number) => void;
  setSetupDone: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      config: DEFAULT_CONFIG,
      setupDone: false,
      setCategories: categories => set(s => ({ config: { ...s.config, categories } })),
      setScheduleMode: scheduleMode => set(s => ({ config: { ...s.config, scheduleMode } })),
      setIntervalHours: intervalHours => set(s => ({ config: { ...s.config, intervalHours } })),
      setScheduledHour: scheduledTimeHour => set(s => ({ config: { ...s.config, scheduledTimeHour } })),
      setWifiOnly: wifiOnly => set(s => ({ config: { ...s.config, wifiOnly } })),
      setEncryptionEnabled: encryptionEnabled => set(s => ({ config: { ...s.config, encryptionEnabled } })),
      setEncryptionSalt: encryptionSalt => set(s => ({ config: { ...s.config, encryptionSalt } })),
      setCustomFolderUri: customFolderUri => set(s => ({ config: { ...s.config, customFolderUri } })),
      addWatchedFolder: folder =>
        set(s => ({
          config: { ...s.config, watchedFolders: [...s.config.watchedFolders, folder] },
        })),
      removeWatchedFolder: id =>
        set(s => ({
          config: {
            ...s.config,
            watchedFolders: s.config.watchedFolders.filter(folder => folder.id !== id),
          },
        })),
      updateWatchedFolder: (id, patch) =>
        set(s => ({
          config: {
            ...s.config,
            watchedFolders: s.config.watchedFolders.map(folder =>
              folder.id === id ? { ...folder, ...patch } : folder,
            ),
          },
        })),
      setAutomationPaused: automationPaused =>
        set(s => ({ config: { ...s.config, automationPaused } })),
      setCompressZip: compressZip => set(s => ({ config: { ...s.config, compressZip } })),
      setDirectMedia: directMedia => set(s => ({ config: { ...s.config, directMedia } })),
      setDirectMediaMaxMb: value =>
        set(s => ({
          // Clamped: 0 would send every photo through the zip and anything past
          // the Bot API cap cannot be a single upload.
          config: { ...s.config, directMediaMaxMb: Math.min(2000, Math.max(1, Math.round(value))) },
        })),
      setArchiveFormat: archiveFormat => set(s => ({ config: { ...s.config, archiveFormat } })),
      setDeleteLocalAfterBackup: deleteLocalAfterBackup =>
        set(s => ({ config: { ...s.config, deleteLocalAfterBackup } })),
      setNotifyBotSummary: notifyBotSummary =>
        set(s => ({ config: { ...s.config, notifyBotSummary } })),
      setSilentNotifications: silentNotifications =>
        set(s => ({ config: { ...s.config, silentNotifications } })),
      setAlertOnFailure: alertOnFailure =>
        set(s => ({ config: { ...s.config, alertOnFailure } })),
      setBatteryMinEnabled: batteryMinEnabled =>
        set(s => ({ config: { ...s.config, batteryMinEnabled } })),
      setMaxFilesPerRun: maxFilesPerRun => set(s => ({ config: { ...s.config, maxFilesPerRun } })),
      setSetupDone: setupDone => set({ setupDone }),
    }),
    {
      name: 'telebot-settings',
      storage: createJSONStorage(() => mmkvStorage),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<SettingsState>;
        const config: BackupConfig = { ...DEFAULT_CONFIG, ...(stored.config ?? {}) };
        if (config.watchedFolders.length === 0 && config.customFolderUri) {
          config.watchedFolders = [makeWatchedFolder(config.customFolderUri)];
        }
        return { ...current, ...stored, config };
      },
    },
  ),
);

export const getConfig = (): BackupConfig => useSettingsStore.getState().config;

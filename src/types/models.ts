export const Category = {
  PHOTO: 'photo',
  VIDEO: 'video',
  DOC: 'doc',
  CONTACT: 'contact',
  SMS: 'sms',
  CUSTOM: 'custom',
} as const;

export type CategoryKey = (typeof Category)[keyof typeof Category];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  photo: 'Photos',
  video: 'Videos',
  doc: 'Documents',
  contact: 'Contacts',
  sms: 'SMS',
  custom: 'Custom Folder',
};

/** Indonesian names for user-facing messages. */
export const CATEGORY_NAMES_ID: Record<CategoryKey, string> = {
  photo: 'Photos',
  video: 'Videos',
  doc: 'Dokumen',
  contact: 'Kontak',
  sms: 'SMS',
  custom: 'Folder kustom',
};

export const ALL_CATEGORIES: CategoryKey[] = [
  Category.PHOTO,
  Category.VIDEO,
  Category.DOC,
  Category.CONTACT,
  Category.SMS,
  Category.CUSTOM,
];

export const ScheduleMode = {
  MANUAL: 'manual',
  INTERVAL: 'interval',
  TIME: 'time',
  CHARGING: 'charging',
} as const;

export type ScheduleModeKey = (typeof ScheduleMode)[keyof typeof ScheduleMode];

export type ArchiveFormat = 'zip' | '7z';

export type WatchedFolder = {
  id: string;
  uri: string;
  name: string;
  schedule: string;
};

/** Build a watched folder from a picked directory URI (name = last path segment). */
export function makeWatchedFolder(uri: string, schedule = '6 jam'): WatchedFolder {
  const decoded = decodeURIComponent(uri);
  const parts = decoded.split('/').filter(Boolean);
  const name = parts[parts.length - 1] ?? decoded;
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    uri,
    name,
    schedule,
  };
}

export type BackupConfig = {
  categories: CategoryKey[];
  scheduleMode: ScheduleModeKey;
  intervalHours: number;
  scheduledTimeHour: number;
  wifiOnly: boolean;
  encryptionEnabled: boolean;
  encryptionSalt: string;
  customFolderUri: string | null;
  watchedFolders: WatchedFolder[];
  automationPaused: boolean;
  compressZip: boolean;
  archiveFormat: ArchiveFormat;
  deleteLocalAfterBackup: boolean;
  notifyBotSummary: boolean;
  silentNotifications: boolean;
  alertOnFailure: boolean;
  batteryMinEnabled: boolean;
  maxFilesPerRun: number;
};

export const DEFAULT_CONFIG: BackupConfig = {
  categories: [Category.PHOTO, Category.VIDEO, Category.DOC],
  scheduleMode: ScheduleMode.MANUAL,
  intervalHours: 24,
  scheduledTimeHour: 2,
  wifiOnly: true,
  encryptionEnabled: false,
  encryptionSalt: '',
  customFolderUri: null,
  watchedFolders: [],
  automationPaused: false,
  compressZip: true,
  archiveFormat: 'zip',
  deleteLocalAfterBackup: false,
  notifyBotSummary: true,
  silentNotifications: false,
  alertOnFailure: true,
  batteryMinEnabled: true,
  maxFilesPerRun: 250,
};

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
  /** SAF grant revoked / tree moved: the user must re-pick the folder. */
  invalid?: boolean;
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
  /**
   * Photos and videos under `directMediaMaxMb` are uploaded as themselves
   * instead of joining the category zip, so they land in Telegram as ordinary
   * files. Larger media still goes into the zip. Only meaningful while
   * `compressZip` is on; with it off every file is already sent on its own.
   */
  directMedia: boolean;
  /** Size ceiling in MB for a photo/video to be sent on its own. */
  directMediaMaxMb: number;
  archiveFormat: ArchiveFormat;
  deleteLocalAfterBackup: boolean;
  notifyBotSummary: boolean;
  silentNotifications: boolean;
  alertOnFailure: boolean;
  batteryMinEnabled: boolean;
  /**
   * Run scheduled backups only while the device is charging. Independent of
   * the frequency: the JobScheduler job carries `requiresCharging`, and the
   * exact alarm skips its slot when no charger is connected.
   */
  chargingOnly: boolean;
  maxFilesPerRun: number;
};

export const DEFAULT_CONFIG: BackupConfig = {
  categories: [Category.PHOTO, Category.VIDEO, Category.DOC],
  // Daily out of the box: a fresh install backs up on its own at 02:00, with no
  // trip to Settings first. Manual stays available as an explicit choice.
  scheduleMode: ScheduleMode.TIME,
  intervalHours: 24,
  scheduledTimeHour: 2,
  wifiOnly: true,
  encryptionEnabled: false,
  encryptionSalt: '',
  customFolderUri: null,
  watchedFolders: [],
  automationPaused: false,
  compressZip: true,
  directMedia: false,
  // 45 MB: comfortably under the 49 MB part cap and above almost every phone
  // photo, so photos travel whole while long videos go into the zip.
  directMediaMaxMb: 45,
  archiveFormat: 'zip',
  deleteLocalAfterBackup: false,
  notifyBotSummary: true,
  silentNotifications: false,
  alertOnFailure: true,
  batteryMinEnabled: true,
  chargingOnly: false,
  maxFilesPerRun: 250,
};

import { PermissionsAndroid, Platform } from 'react-native';
import { Category, type CategoryKey } from '../types/models';

type AndroidPermission = (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];

export type PermissionState = {
  granted: boolean;
  denied: string[];
};

/**
 * Photo and Video are read through MediaStore, which needs READ_MEDIA_IMAGES /
 * READ_MEDIA_VIDEO (or READ_EXTERNAL_STORAGE before API 33). Docs and Custom
 * come from the File API and the folder picker and need no runtime grant, so a
 * config with neither category must not prompt for media (P2-g).
 */
export function needsMediaPermissions(categories: CategoryKey[]): boolean {
  return categories.includes(Category.PHOTO) || categories.includes(Category.VIDEO);
}

/**
 * Notifications power the foreground service. Asked from a screen the user is
 * looking at, never from inside a run: a scheduled/headless run has no activity
 * to show the dialog on, so the request there did nothing (P2-4).
 */
export async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return;
  }
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (permission) {
    await PermissionsAndroid.request(permission).catch(() => undefined);
  }
}

export async function requestBackupPermissions(
  categories: CategoryKey[],
): Promise<PermissionState> {
  if (Platform.OS !== 'android') {
    return { granted: true, denied: [] };
  }

  const mediaPermissions: AndroidPermission[] = !needsMediaPermissions(categories)
    ? []
    : Platform.Version >= 33
      ? [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ]
      : [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE];

  let denied: string[] = [];
  if (mediaPermissions.length > 0) {
    const result = await PermissionsAndroid.requestMultiple(mediaPermissions);
    denied = mediaPermissions.filter(
      permission => result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
    );
  }

  return { granted: denied.length === 0, denied };
}

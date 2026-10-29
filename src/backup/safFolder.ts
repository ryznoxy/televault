import { NativeModules, Platform } from 'react-native';

export type SafEntry = {
  path: string;
  displayName: string;
  size: number;
  modifiedAt: number;
};

/**
 * Lists every file under a SAF `content://` tree URI picked by the folder
 * picker. Android only; iOS always hands back `file://` so it never runs.
 */
export async function listSafFolder(treeUri: string): Promise<SafEntry[]> {
  if (Platform.OS !== 'android') {
    return [];
  }
  const mod = NativeModules.SafFolder;
  if (!mod) {
    throw new Error('Modul SafFolder tidak tersedia — build Android lama?');
  }
  const entries: SafEntry[] = await mod.list(treeUri);
  return entries;
}

/**
 * True when a SAF listing failed because the OS revoked the folder's grant (or
 * the tree was moved). Android requires the user to re-pick the folder via
 * `ACTION_OPEN_DOCUMENT`, so this cannot be fixed silently and must be shown.
 */
export function isSafPermissionDenied(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    code === 'EPERMDENIED' ||
    /Permission Denial|ACTION_OPEN_DOCUMENT/.test(message)
  );
}

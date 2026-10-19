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

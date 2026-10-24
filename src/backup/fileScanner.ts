import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Category, CategoryKey } from '../types/models';
import { listSafFolder } from './safFolder';

export type ScanResult = {
  path: string;
  displayName: string;
  size: number;
  modifiedAt: number;
  category: CategoryKey;
};

let localizeCounter = 0;

/** True for a real `file://` path; Android's folder picker returns `content://`. */
export function isFileUri(uri: string): boolean {
  return uri.startsWith('file://');
}

export async function ensureLocalPath(path: string): Promise<string> {
  if (!path.startsWith('content://')) {
    return path;
  }
  const slash = path.lastIndexOf('/');
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  localizeCounter += 1;
  const dest = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${Date.now()}_${localizeCounter}_${name}`;
  await ReactNativeBlobUtil.MediaCollection.copyToInternal(path, dest);
  return dest;
}

const DOC_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'json', 'zip', 'md', 'rtf',
];

function hasDocExtension(name: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot < 0) {
    return false;
  }
  return DOC_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase());
}

async function scanCameraRoll(category: CategoryKey): Promise<ScanResult[]> {
  const assetType = category === Category.VIDEO ? 'Videos' : 'Photos';
  const results: ScanResult[] = [];
  let after: string | undefined;
  for (;;) {
    const page = await CameraRoll.getPhotos({
      first: 200,
      after,
      assetType,
      include: ['fileSize', 'filename'],
    });
    for (const edge of page.edges) {
      const image = edge.node.image;
      const path = image.filepath ?? image.uri;
      const size = image.fileSize ?? 0;
      if (size <= 0) {
        continue;
      }
      results.push({
        path,
        displayName: image.filename ?? path,
        size,
        modifiedAt: edge.node.modificationTimestamp * 1000,
        category,
      });
    }
    // A page that returns nothing (or hands back the same cursor) while claiming
    // to have more is a camera-roll pagination bug on some Android builds; with
    // a pure `has_next_page` check the loop spins forever and the backup hangs
    // in its scan phase, so bail on both.
    if (!page.page_info.has_next_page || page.edges.length === 0 || page.page_info.end_cursor === after) {
      break;
    }
    after = page.page_info.end_cursor;
  }
  return results;
}

async function walk(dir: string, category: CategoryKey, out: ScanResult[]): Promise<void> {
  // ponytail: a failed `ls` is swallowed rather than raised. The public dirs are
  // hidden from us on API 30+, where `ls` may either throw or return `[]`
  // depending on the OEM, so raising cannot be relied on to surface it and would
  // fail the category on every run. The public Download dir is the only place
  // the Documents category can read, and Android 11+ hides it, so the category
  // legitimately reads nothing on a modern device.
  let entries: string[];
  try {
    entries = await ReactNativeBlobUtil.fs.ls(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = `${dir}/${name}`;
    try {
      const stat = await ReactNativeBlobUtil.fs.stat(path);
      if (stat.type === 'directory') {
        await walk(path, category, out);
      } else if (category !== Category.DOC || hasDocExtension(name)) {
        out.push({ path, displayName: name, size: stat.size, modifiedAt: stat.lastModified, category });
      }
    } catch {
      // unreadable entry, skip
    }
  }
}

async function scanDocuments(): Promise<ScanResult[]> {
  // The public Download dir is `LegacyDownloadDir`; `DownloadDir` and
  // `DocumentDir` are this app's own sandbox (`getExternalFilesDir` and
  // `getFilesDir`), which never hold the user's files, so scanning them
  // guaranteed an empty result on every Android version.
  //
  // Both public roots are hidden from ordinary apps on Android 11+; they only
  // list anything once "all files" access is granted. Without it `ls` throws
  // and `walk` swallows the error, which is the behaviour that made this
  // category read zero files for years.
  const external = ReactNativeBlobUtil.fs.dirs.LegacyDownloadDir.replace(/\/Download$/, '');
  const roots = [
    ReactNativeBlobUtil.fs.dirs.LegacyDownloadDir,
    `${external}/Documents`,
  ];
  const results: ScanResult[] = [];
  for (const root of roots) {
    await walk(root, Category.DOC, results);
  }
  return results;
}

async function scanCustomFolder(
  folderUri: string,
  category: CategoryKey = Category.CUSTOM,
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  if (!isFileUri(folderUri)) {
    // Android's folder picker returns a `content://` SAF tree; the native
    // SafFolder module walks it and maps each child to a path (a real file
    // path when the provider exposes one, else the document URI, which
    // `ensureLocalPath` localizes before upload).
    const entries = await listSafFolder(folderUri);
    for (const entry of entries) {
      results.push({ ...entry, category });
    }
    return results;
  }
  await walk(folderUri.replace('file://', ''), category, results);
  return results;
}

/** Scan every watched folder URI and flatten the results. */
export async function scanCustomFolders(uris: string[]): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  for (const uri of uris) {
    results.push(...(await scanCustomFolder(uri)));
  }
  return results;
}

export async function scanCategory(
  category: CategoryKey,
  customFolderUri: string | null,
): Promise<ScanResult[]> {
  switch (category) {
    case Category.PHOTO:
    case Category.VIDEO:
      return scanCameraRoll(category);
    case Category.DOC:
      return scanDocuments();
    case Category.CUSTOM:
      return customFolderUri ? scanCustomFolder(customFolderUri) : [];
    default:
      return [];
  }
}

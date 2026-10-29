import ReactNativeBlobUtil from 'react-native-blob-util';
import { ensureLocalPath, scanCategory, scanCustomFolders } from '../src/backup/fileScanner';
import { Category, makeWatchedFolder } from '../src/types/models';

jest.mock('../src/backup/safFolder', () => ({
  ...jest.requireActual('../src/backup/safFolder'),
  listSafFolder: jest.fn(async () => []),
}));

const copyToInternal = ReactNativeBlobUtil.MediaCollection.copyToInternal as unknown as jest.Mock;
const listSafFolder = jest.requireMock('../src/backup/safFolder').listSafFolder as jest.Mock;

beforeEach(() => {
  copyToInternal.mockClear();
  listSafFolder.mockClear();
});

test('the Documents category falls back to the public Download dir without a SAF folder', async () => {
  const ls = ReactNativeBlobUtil.fs.ls as unknown as jest.Mock;
  ls.mockResolvedValueOnce(['a.pdf']);
  ls.mockResolvedValueOnce([]);
  const items = await scanCategory(Category.DOC, null);
  expect(ls).toHaveBeenCalledWith(ReactNativeBlobUtil.fs.dirs.LegacyDownloadDir);
  expect(items[0]).toMatchObject({
    path: `${ReactNativeBlobUtil.fs.dirs.LegacyDownloadDir}/a.pdf`,
    category: Category.DOC,
  });
});

test('the Documents category also reads the public Documents dir', async () => {
  const ls = ReactNativeBlobUtil.fs.ls as unknown as jest.Mock;
  ls.mockResolvedValueOnce([]);
  ls.mockResolvedValueOnce(['b.pdf']);
  const items = await scanCategory(Category.DOC, null);
  // Download first, then Documents: both only list with "all files" access.
  expect(ls).toHaveBeenNthCalledWith(2, '/storage/emulated/0/Documents');
  expect(items.map(item => item.path)).toContain('/storage/emulated/0/Documents/b.pdf');
});

test('a watched folder is read through the SAF module', async () => {
  const folder = makeWatchedFolder('content://tree/docs');
  listSafFolder.mockResolvedValueOnce([
    { path: 'content://docs/a.pdf', displayName: 'a.pdf', size: 10, modifiedAt: 1 },
  ]);
  const { results, denied } = await scanCustomFolders([folder]);
  expect(listSafFolder).toHaveBeenCalledWith('content://tree/docs');
  expect(denied).toEqual([]);
  expect(results).toEqual([
    {
      path: 'content://docs/a.pdf',
      displayName: 'a.pdf',
      size: 10,
      modifiedAt: 1,
      category: Category.CUSTOM,
    },
  ]);
});

test('a folder whose SAF grant was revoked is denied, not thrown', async () => {
  const folder = makeWatchedFolder('content://tree/docs');
  listSafFolder.mockRejectedValueOnce(
    Object.assign(
      new Error(
        'Permission Denial: opening provider com.android.externalstorage.ExternalStorageProvider requires ACTION_OPEN_DOCUMENT',
      ),
      { code: 'EPERMDENIED' },
    ),
  );
  const { results, denied } = await scanCustomFolders([folder]);
  expect(results).toEqual([]);
  expect(denied).toEqual([folder]);
});

test('an invalid folder is skipped without consulting the SAF module', async () => {
  const folder = makeWatchedFolder('content://tree/docs');
  folder.invalid = true;
  const { results, denied } = await scanCustomFolders([folder]);
  expect(listSafFolder).not.toHaveBeenCalled();
  expect(results).toEqual([]);
  expect(denied).toEqual([]);
});

test('returns real filesystem paths unchanged', async () => {
  await expect(ensureLocalPath('/storage/emulated/0/DCIM/a.jpg')).resolves.toBe(
    '/storage/emulated/0/DCIM/a.jpg',
  );
  expect(copyToInternal).not.toHaveBeenCalled();
});

test('copies a content:// uri into the cache dir and returns the cached path', async () => {
  const uri = 'content://media/external/images/media/42';
  const local = await ensureLocalPath(uri);
  expect(copyToInternal).toHaveBeenCalledWith(uri, expect.stringContaining('/cache/'));
  expect(local.startsWith('/cache/')).toBe(true);
});

test('localizes content:// uris sharing a trailing name to distinct cache paths', async () => {
  const first = await ensureLocalPath('content://media/external/images/media/1/a.jpg');
  const second = await ensureLocalPath('content://media/external/images/media/2/a.jpg');
  expect(first).not.toBe(second);
  expect(first.endsWith('_a.jpg')).toBe(true);
  expect(second.endsWith('_a.jpg')).toBe(true);
});

test('scanCameraRoll stops when a page comes back empty though more pages are claimed', async () => {
  const { CameraRoll } = jest.requireMock('@react-native-camera-roll/camera-roll');
  const { scanCategory } = jest.requireActual('../src/backup/fileScanner');
  const { Category } = jest.requireActual('../src/types/models');
  let calls = 0;
  CameraRoll.getPhotos.mockImplementation(async () => {
    calls += 1;
    return {
      edges: [],
      page_info: { has_next_page: true, end_cursor: `cursor-${calls}` },
    };
  });
  await scanCategory(Category.PHOTO, null);
  expect(calls).toBe(1);
  CameraRoll.getPhotos.mockReset();
  CameraRoll.getPhotos.mockResolvedValue({
    edges: [],
    page_info: { has_next_page: false },
  });
});

import ReactNativeBlobUtil from 'react-native-blob-util';
import { ensureLocalPath } from '../src/backup/fileScanner';

const copyToInternal = ReactNativeBlobUtil.MediaCollection.copyToInternal as unknown as jest.Mock;

beforeEach(() => {
  copyToInternal.mockClear();
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

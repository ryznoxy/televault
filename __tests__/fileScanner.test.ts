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

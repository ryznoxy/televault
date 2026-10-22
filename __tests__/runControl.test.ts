import ReactNativeBlobUtil from 'react-native-blob-util';
import { clearRunStop, requestRunStop, runStopRequested } from '../src/backup/runControl';

const fs = ReactNativeBlobUtil.fs as unknown as {
  writeFile: jest.Mock;
  unlink: jest.Mock;
  exists: jest.Mock;
};

/** `DocumentDir` is the native `filesDir`, which is what the Kotlin side writes. */
const FLAG = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/run_stop_request`;

test('a stop request is left where the other runtime can see it', async () => {
  fs.writeFile.mockClear();
  await requestRunStop();
  expect(fs.writeFile).toHaveBeenCalledWith(FLAG, '1', 'utf8');
});

test('the request is reported back', async () => {
  fs.exists.mockResolvedValueOnce(false);
  await expect(runStopRequested()).resolves.toBe(false);
  fs.exists.mockResolvedValueOnce(true);
  await expect(runStopRequested()).resolves.toBe(true);
});

test('an unreadable flag is not treated as a stop', async () => {
  fs.exists.mockRejectedValueOnce(new Error('boom'));
  await expect(runStopRequested()).resolves.toBe(false);
});

test('a new run clears the flag a finished run left behind', async () => {
  fs.unlink.mockClear();
  await clearRunStop();
  expect(fs.unlink).toHaveBeenCalledWith(FLAG);
});

test('clearing a flag that is not there is not an error', async () => {
  fs.unlink.mockRejectedValueOnce(new Error('ENOENT'));
  await expect(clearRunStop()).resolves.toBeUndefined();
});
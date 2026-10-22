import {
  useUpdateStore,
  pendingFromStorage,
  dismissUpdateTag,
  UPDATE_DISMISS_KEY,
} from '../src/state/updateStore';
import { checkForUpdate, deviceVersionCode, versionCodeFor } from '../src/update/updater';
import { mmkv } from '../src/state/mmkv';

jest.mock('../src/update/updater', () => ({
  checkForUpdate: jest.fn(),
  downloadAndInstall: jest.fn(),
  versionCodeFor: jest.fn(),
  deviceVersionCode: jest.fn(),
}));

const mockCheck = checkForUpdate as jest.Mock;
const mockVersionCodeFor = versionCodeFor as jest.Mock;
const mockDeviceVersionCode = deviceVersionCode as jest.Mock;

const RELEASE = {
  tag: 'v9.9.9',
  apkUrl: 'https://x/app-release.apk',
  sha256: 'A'.repeat(64),
  size: 1024,
};

const PENDING_KEY = 'update_pending_release';

beforeEach(() => {
  jest.clearAllMocks();
  mmkv.set(UPDATE_DISMISS_KEY, '');
  mmkv.remove(PENDING_KEY);
  mockVersionCodeFor.mockReturnValue(90999);
  mockDeviceVersionCode.mockReturnValue(10502);
  useUpdateStore.setState({ update: null, phase: 'idle', progress: 0, cancelRequested: false });
});

test('a found release reaches the alert', async () => {
  mockCheck.mockResolvedValue(RELEASE);
  await expect(useUpdateStore.getState().check()).resolves.toEqual(RELEASE);
  expect(useUpdateStore.getState().update).toEqual(RELEASE);
});

test('a release the user sent away stays away on the automatic check', async () => {
  mockCheck.mockResolvedValue(RELEASE);
  dismissUpdateTag(RELEASE.tag);

  await useUpdateStore.getState().check();

  expect(useUpdateStore.getState().update).toBeNull();
});

test('the explicit check in Settings shows it again', async () => {
  mockCheck.mockResolvedValue(RELEASE);
  dismissUpdateTag(RELEASE.tag);

  await useUpdateStore.getState().check(true);

  expect(mockCheck).toHaveBeenCalledWith(undefined, undefined, true);
  expect(useUpdateStore.getState().update).toEqual(RELEASE);
});

test('no release leaves the alert alone', async () => {
  mockCheck.mockResolvedValue(null);
  await expect(useUpdateStore.getState().check()).resolves.toBeNull();
  expect(useUpdateStore.getState().update).toBeNull();
});

test('dismissing remembers the tag', async () => {
  useUpdateStore.setState({ update: RELEASE });

  useUpdateStore.getState().dismiss();

  expect(useUpdateStore.getState().update).toBeNull();
  expect(mmkv.getString(UPDATE_DISMISS_KEY)).toBe(RELEASE.tag);
});

test('a failed automatic check is quiet, a failed manual one is reported', async () => {
  mockCheck.mockRejectedValue(new Error('offline'));

  await expect(useUpdateStore.getState().check()).resolves.toBeNull();
  await expect(useUpdateStore.getState().check(true)).rejects.toThrow('offline');
});

test('a found release survives a restart, so the throttled check cannot hide it', async () => {
  mockCheck.mockResolvedValue(RELEASE);
  await useUpdateStore.getState().check();

  expect(JSON.parse(mmkv.getString(PENDING_KEY) ?? '{}').tag).toBe(RELEASE.tag);
});

test('dismissing forgets the release as well', async () => {
  useUpdateStore.setState({ update: RELEASE });
  mmkv.set(PENDING_KEY, JSON.stringify(RELEASE));

  useUpdateStore.getState().dismiss();

  expect(mmkv.getString(PENDING_KEY)).toBeUndefined();
});

describe('pending release left by an earlier session', () => {
  test('is shown straight away while it is still newer', () => {
    mmkv.set(PENDING_KEY, JSON.stringify(RELEASE));

    // The throttled automatic check would return nothing on a restart; this is
    // what keeps the alert on screen across one.
    expect(pendingFromStorage()?.tag).toBe(RELEASE.tag);
  });

  test('is dropped once that version is installed', () => {
    mmkv.set(PENDING_KEY, JSON.stringify(RELEASE));
    mockDeviceVersionCode.mockReturnValue(90999);

    expect(pendingFromStorage()).toBeNull();
  });

  test('a corrupted value is not an update', () => {
    mmkv.set(PENDING_KEY, 'not json');

    expect(pendingFromStorage()).toBeNull();
  });
});
/* eslint-env jest, es2020 */
const { webcrypto } = require('node:crypto');
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

if (!global.crypto) {
  global.crypto = webcrypto;
}

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return { ...actual, enableScreens: jest.fn() };
});

jest.mock('react-native-mmkv', () => {
  const stores = {};
  return {
    createMMKV: ({ id = 'mmkv.default' } = {}) => {
      if (!stores[id]) {
        const data = new Map();
        stores[id] = {
          id,
          set: (k, v) => data.set(k, v),
          getString: k => (data.has(k) ? data.get(k) : undefined),
          getBoolean: k => data.get(k),
          getNumber: k => data.get(k),
          contains: k => data.has(k),
          remove: k => data.delete(k),
          getAllKeys: () => [...data.keys()],
          clearAll: () => data.clear(),
        };
      }
      return stores[id];
    },
  };
});

const mockBlobFiles = new Map();
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    wrap: path => `RNFetchBlob-file://${path}`,
    fetch: jest.fn(),
    MediaCollection: {
      copyToInternal: jest.fn(async () => ''),
    },
    fs: {
      dirs: {
        CacheDir: '/cache',
        DocumentDir: '/doc',
        DownloadDir: '/download',
        LegacyDownloadDir: '/storage/emulated/0/Download',
      },
      hash: jest.fn(async () => 'deadbeef'),
      stat: jest.fn(async () => ({ size: 0, lastModified: 0, type: 'file' })),
      ls: jest.fn(async () => []),
      slice: jest.fn(async () => ''),
      unlink: jest.fn(async () => undefined),
      mkdir: jest.fn(async () => undefined),
      readFile: jest.fn(async (path, enc) => mockBlobFiles.get(String(path)) ?? ''),
      writeFile: jest.fn(async (path, data) => {
        mockBlobFiles.set(String(path), String(data));
      }),
    },
  },
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    getPhotos: jest.fn(async () => ({
      edges: [],
      page_info: { has_next_page: false },
    })),
  },
}));

jest.mock('react-native-zip-archive', () => ({
  zip: jest.fn(async () => ''),
  zipWithPassword: jest.fn(async () => ''),
}));

jest.mock('@react-native-documents/picker', () => ({
  pickDirectory: jest.fn(async () => ({ uri: 'file:///tmp/folder' })),
  pick: jest.fn(async () => []),
  types: {},
}));

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(async () => ({ rows: [], rowsAffected: 0, insertId: 1 })),
    executeSync: jest.fn(() => ({ rows: [{ user_version: 1 }] })),
    executeBatch: jest.fn(async () => ({ rowsAffected: 0 })),
    close: jest.fn(),
  })),
}));

jest.mock('react-native-background-fetch', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(async () => 2),
    finish: jest.fn(),
    stop: jest.fn(async () => true),
    status: jest.fn(async () => 2),
    registerHeadlessTask: jest.fn(),
    NETWORK_TYPE_NONE: 0,
    NETWORK_TYPE_ANY: 1,
    NETWORK_TYPE_UNMETERED: 2,
  },
}));

jest.mock('react-native-background-actions', () => ({
  __esModule: true,
  default: {
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    updateNotification: jest.fn(async () => undefined),
    isRunning: jest.fn(() => false),
  },
}));

jest.mock('react-native-keychain', () => {
  const store = new Map();
  const serviceOf = options => (options && options.service) || 'default';
  return {
    setGenericPassword: jest.fn(async (username, password, options = {}) => {
      store.set(serviceOf(options), { username, password });
      return { service: serviceOf(options), storage: 'mock' };
    }),
    getGenericPassword: jest.fn(
      async (options = {}) => store.get(serviceOf(options)) || false,
    ),
    resetGenericPassword: jest.fn(async (options = {}) => {
      store.delete(serviceOf(options));
      return true;
    }),
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly' },
  };
});

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: jest.fn(), getString: jest.fn(async () => '') },
}));

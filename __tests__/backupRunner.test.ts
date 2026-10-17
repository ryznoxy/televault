import { runBackup } from '../src/backup/backupRunner';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { PermissionsAndroid, Platform } from 'react-native';
import { filesRepo, type FileRecord } from '../src/db/repositories/files';
import { sessionsRepo } from '../src/db/repositories/sessions';
import { chunksRepo } from '../src/db/repositories/chunks';
import { scanCategory, ensureLocalPath, type ScanResult } from '../src/backup/fileScanner';
import { needsMediaPermissions, requestBackupPermissions } from '../src/backup/permissions';
import { TelegramBotApi } from '../src/net/telegramApi';
import { secureStore } from '../src/state/secureStore';
import { useSettingsStore } from '../src/state/settingsStore';
import { Category } from '../src/types/models';

jest.mock('../src/db/repositories/files', () => ({
  filesRepo: {
    upsert: jest.fn(async () => undefined),
    getByPath: jest.fn(async () => null),
    markBackup: jest.fn(async () => undefined),
    count: jest.fn(async () => 0),
  },
}));

jest.mock('../src/db/repositories/sessions', () => ({
  sessionsRepo: {
    insert: jest.fn(async () => 1),
    updateChunksSent: jest.fn(async () => undefined),
    updateChunksTotal: jest.fn(async () => undefined),
    finishSession: jest.fn(async () => undefined),
    failStaleRunning: jest.fn(async () => 0),
  },
}));

jest.mock('../src/db/repositories/chunks', () => ({
  chunksRepo: {
    insert: jest.fn(async () => 1),
    markUploaded: jest.fn(async () => undefined),
  },
}));

jest.mock('../src/net/telegramApi', () => ({
  TelegramBotApi: jest.fn().mockImplementation(() => ({
    sendDocument: jest.fn(async () => ({ messageId: 5, date: 1 })),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  })),
}));

jest.mock('../src/state/secureStore', () => ({
  secureStore: {
    get: jest.fn(async () => ({ botToken: 'token', chatId: '42', encryptionPassword: '' })),
  },
}));

jest.mock('../src/backup/fileScanner', () => ({
  scanCategory: jest.fn(async () => []),
  ensureLocalPath: jest.fn(async (path: string) => path),
}));

const filesMock = filesRepo as unknown as {
  upsert: jest.Mock;
  getByPath: jest.Mock;
  markBackup: jest.Mock;
  count: jest.Mock;
};
const chunksMock = chunksRepo as unknown as { insert: jest.Mock; markUploaded: jest.Mock };
const scanMock = scanCategory as unknown as jest.Mock;
const localizeMock = ensureLocalPath as unknown as jest.Mock;
const unlinkMock = ReactNativeBlobUtil.fs.unlink as unknown as jest.Mock;
const sliceMock = ReactNativeBlobUtil.fs.slice as unknown as jest.Mock;
const statMock = ReactNativeBlobUtil.fs.stat as unknown as jest.Mock;
// `df` is absent from the shared blob mock; tests that need free-space numbers
// attach it here.
const fsMock = ReactNativeBlobUtil.fs as unknown as { df?: jest.Mock };
const apiMock = TelegramBotApi as unknown as jest.Mock;

type ApiInstance = { sendDocument: jest.Mock; sendMessage: jest.Mock };

function latestApi(): ApiInstance {
  const results = apiMock.mock.results;
  return results[results.length - 1].value as ApiInstance;
}

type NewFileInput = {
  path: string;
  category: string;
  size: number;
  modifiedAt: number;
  status?: string;
};

/**
 * A stateful in-memory stand-in for `filesRepo` that mirrors the real DB
 * semantics: `upsert` updates only `category`/`size` on conflict and never
 * touches `modified_at` (that column means "the mtime we successfully backed
 * up"), while `markBackup` is what writes it. The wholesale mock above stores
 * nothing, so it cannot see P0-1.
 */
function installStatefulFilesRepo(): Map<string, FileRecord> {
  const store = new Map<string, FileRecord>();
  let nextId = 1;
  filesMock.getByPath.mockImplementation(async (path: string) => store.get(path) ?? null);
  filesMock.upsert.mockImplementation(async (file: NewFileInput) => {
    const existing = store.get(file.path);
    if (existing) {
      store.set(file.path, { ...existing, category: file.category, size: file.size });
      return;
    }
    store.set(file.path, {
      id: nextId,
      path: file.path,
      category: file.category,
      hash: null,
      size: file.size,
      modified_at: file.modifiedAt,
      last_backup: null,
      status: 'pending',
    });
    nextId += 1;
  });
  filesMock.markBackup.mockImplementation(
    async (path: string, hash: string, backupTime: number, modifiedAt: number) => {
      const existing = store.get(path);
      if (existing) {
        store.set(path, {
          ...existing,
          hash,
          last_backup: backupTime,
          status: 'uploaded',
          modified_at: modifiedAt,
        });
      }
    },
  );
  filesMock.count.mockImplementation(async () => store.size);
  return store;
}

const PHOTO_ITEM: ScanResult = {
  path: '/photo/a.jpg',
  displayName: 'a.jpg',
  size: 10,
  modifiedAt: 200,
  category: 'photo',
};

beforeEach(() => {
  jest.clearAllMocks();
  delete fsMock.df;
  filesMock.upsert.mockResolvedValue(undefined);
  filesMock.getByPath.mockResolvedValue(null);
  filesMock.markBackup.mockResolvedValue(undefined);
  chunksMock.insert.mockResolvedValue(1);
  chunksMock.markUploaded.mockResolvedValue(undefined);
  scanMock.mockResolvedValue([]);
  localizeMock.mockImplementation(async (path: string) => path);
  statMock.mockResolvedValue({ size: 0, lastModified: 0, type: 'file' });
  (sessionsRepo.insert as unknown as jest.Mock).mockResolvedValue(1);
  (sessionsRepo.updateChunksSent as unknown as jest.Mock).mockResolvedValue(undefined);
  (sessionsRepo.finishSession as unknown as jest.Mock).mockResolvedValue(undefined);
  (secureStore.get as unknown as jest.Mock).mockResolvedValue({
    botToken: 'token',
    chatId: '42',
    encryptionPassword: '',
  });
  useSettingsStore.getState().setMaxFilesPerRun(500);
  useSettingsStore.getState().setEncryptionEnabled(false);
});

test('re-uploads a changed file because existing state is read before upsert', async () => {
  const store = new Map<string, FileRecord>();
  store.set('/photo/a.jpg', {
    id: 1,
    path: '/photo/a.jpg',
    category: 'photo',
    hash: 'oldhash',
    size: 10,
    modified_at: 100,
    last_backup: 50,
    status: 'uploaded',
  });
  filesMock.getByPath.mockImplementation(async (path: string) => store.get(path) ?? null);
  filesMock.upsert.mockImplementation(
    async (file: { path: string; category: string; size: number; modifiedAt: number }) => {
      const existing = store.get(file.path);
      store.set(file.path, {
        id: existing?.id ?? 1,
        path: file.path,
        category: file.category,
        hash: existing?.hash ?? null,
        size: file.size,
        modified_at: file.modifiedAt,
        last_backup: existing?.last_backup ?? null,
        status: existing?.status ?? 'pending',
      });
    },
  );
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));

  const result = await runBackup();

  expect(result.files).toBe(1);
  expect(latestApi().sendDocument).toHaveBeenCalled();
  expect(filesMock.markBackup).toHaveBeenCalledWith('/photo/a.jpg', 'deadbeef', expect.any(Number), 200);
});

test('unchanged file is skipped', async () => {
  const store = new Map<string, FileRecord>();
  store.set('/photo/a.jpg', {
    id: 1,
    path: '/photo/a.jpg',
    category: 'photo',
    hash: 'oldhash',
    size: 10,
    modified_at: 200,
    last_backup: 50,
    status: 'uploaded',
  });
  filesMock.getByPath.mockImplementation(async (path: string) => store.get(path) ?? null);
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));

  const result = await runBackup();

  expect(result.files).toBe(0);
  // Nothing new to upload is not a failure.
  expect(result.status).toBe('success');
  expect(filesMock.markBackup).not.toHaveBeenCalled();
});

test('marks each chunk with the row id returned by its own insert', async () => {
  scanMock.mockImplementation(async (category: string) => {
    if (category === 'photo') {
      return [{ ...PHOTO_ITEM, path: '/photo/a.jpg', category: 'photo' }];
    }
    if (category === 'video') {
      return [{ ...PHOTO_ITEM, path: '/video/b.mp4', category: 'video' }];
    }
    return [];
  });
  let nextId = 0;
  chunksMock.insert.mockImplementation(async () => {
    nextId += 1;
    return nextId;
  });

  await runBackup();

  expect(chunksMock.insert).toHaveBeenCalledTimes(2);
  const ids = chunksMock.markUploaded.mock.calls.map(call => call[0]);
  expect(ids).toEqual([1, 2]);
});

test('unlinks localized content copies but never the originals', async () => {
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));
  localizeMock.mockImplementation(async () => '/cache/localized_a.jpg');

  await runBackup();

  expect(unlinkMock).toHaveBeenCalledWith('/cache/localized_a.jpg');
  expect(unlinkMock).not.toHaveBeenCalledWith('/photo/a.jpg');
});

test('names every uploaded part after the manifest entry, single part included', async () => {
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));

  await runBackup();

  const names = latestApi().sendDocument.mock.calls.map(call => String(call[0].name));
  expect(names.some(name => /^photo_\d+\.zip\.001$/.test(name))).toBe(true);
  // Manifest and scripts carry the archive's name, so a downloaded file says
  // which zip it belongs to.
  expect(names.some(name => /^photo_\d+\.zip\.manifest\.json$/.test(name))).toBe(true);
  expect(names.some(name => /^photo_\d+\.zip\.reassemble\.sh$/.test(name))).toBe(true);
  expect(names.some(name => /^photo_\d+\.zip\.reassemble\.bat$/.test(name))).toBe(true);
  expect(names).not.toContain('manifest.json');
});

test('slices an oversized archive into the cache staging dir, never beside the source', async () => {
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));
  statMock.mockResolvedValue({ size: 100 * 1024 * 1024, lastModified: 0, type: 'file' });

  await runBackup();

  expect(sliceMock).toHaveBeenCalledTimes(3);
  const destinations = sliceMock.mock.calls.map(call => String(call[1]));
  for (const destination of destinations) {
    expect(destination).toMatch(/^\/cache\/staging_\d+\//);
  }
});

test('a chunk that fails all retries leaves its archive out of the manifest and its files pending', async () => {
  const videoItem: ScanResult = {
    path: '/video/b.mp4',
    displayName: 'b.mp4',
    size: 20,
    modifiedAt: 200,
    category: 'video',
  };
  scanMock.mockImplementation(async (category: string) => {
    if (category === 'photo') {
      return [PHOTO_ITEM];
    }
    if (category === 'video') {
      return [videoItem];
    }
    return [];
  });
  statMock.mockResolvedValue({ size: 60 * 1024 * 1024, lastModified: 0, type: 'file' });
  // The photo archive loses its second part after all retries; the video archive
  // uploads cleanly, so the manifest still exists and must list only the video.
  apiMock.mockImplementation(() => ({
    sendDocument: jest.fn(async (file: { name: string }) => {
      if (String(file.name).includes('photo') && String(file.name).endsWith('.002')) {
        throw Object.assign(new Error('Bad Request'), { httpCode: 400 });
      }
      return { messageId: 5, date: 1 };
    }),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  }));

  const result = await runBackup();

  expect(result.status).toBe('partial');
  expect(result.error).toContain('potongan');
  expect(result.error).toContain('photo');

  const manifestName = latestApi()
    .sendDocument.mock.calls.map(call => String(call[0].name))
    .find(name => name.endsWith('.manifest.json')) as string;
  const manifestRaw = await ReactNativeBlobUtil.fs.readFile(
    `/cache/meta_1/${manifestName}`,
    'utf8',
  );
  const manifest = JSON.parse(String(manifestRaw)) as { files: { name: string }[] };
  expect(manifest.files).toHaveLength(1);
  expect(manifest.files[0].name).toMatch(/^video_/);

  const markedPaths = filesMock.markBackup.mock.calls.map(call => call[0]);
  expect(markedPaths).not.toContain('/photo/a.jpg');
  expect(markedPaths).toContain('/video/b.mp4');

  const finishCalls = (sessionsRepo.finishSession as unknown as jest.Mock).mock.calls;
  expect(finishCalls[0][6]).toBe('partial');
});

test('overall progress is monotonic across phases and reaches the run total', async () => {
  const photo: ScanResult = { ...PHOTO_ITEM, path: '/photo/a.jpg', category: 'photo' };
  const video: ScanResult = { ...PHOTO_ITEM, path: '/video/b.mp4', category: 'video' };
  scanMock.mockImplementation(async (category: string) => {
    if (category === 'photo') {
      return [photo];
    }
    if (category === 'video') {
      return [video];
    }
    return [];
  });

  const overallCurrents: number[] = [];
  let lastTotal = 0;
  await runBackup(progress => {
    overallCurrents.push(progress.overall.current);
    lastTotal = progress.overall.total;
    // Never exceeds the total, at any phase.
    expect(progress.overall.current).toBeLessThanOrEqual(progress.overall.total);
  });

  expect(overallCurrents.length).toBeGreaterThan(0);
  for (let i = 1; i < overallCurrents.length; i += 1) {
    expect(overallCurrents[i]).toBeGreaterThanOrEqual(overallCurrents[i - 1]);
  }
  expect(lastTotal).toBe(2);
  expect(overallCurrents[overallCurrents.length - 1]).toBe(2);
});

test('overall progress moves inside a chunk upload, not only when it finishes', async () => {
  scanMock.mockImplementation(async (category: string) =>
    category === 'photo' ? [{ ...PHOTO_ITEM, path: '/photo/a.jpg', category: 'photo' }] : [],
  );
  // 60 MB splits into two 49 MB-ish parts, so one archive spans two uploads.
  statMock.mockResolvedValue({ size: 60 * 1024 * 1024, lastModified: 0, type: 'file' });
  // Report byte progress the way the real transport does: several updates per chunk.
  apiMock.mockImplementation(() => ({
    sendDocument: jest.fn(
      async (
        _file: unknown,
        _caption: unknown,
        onProgress?: (sent: number, total: number) => void,
      ) => {
        onProgress?.(25, 100);
        onProgress?.(75, 100);
        onProgress?.(100, 100);
        return { messageId: 5, date: 1 };
      },
    ),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  }));

  const overallCurrents: number[] = [];
  let lastTotal = 0;
  await runBackup(progress => {
    overallCurrents.push(progress.overall.current);
    lastTotal = progress.overall.total;
    expect(progress.overall.current).toBeLessThanOrEqual(progress.overall.total);
  });

  expect(lastTotal).toBe(1);
  // Values strictly between the two integer boundaries prove the bar advances
  // during a transfer rather than jumping once per file.
  expect(overallCurrents.some(value => value > 0 && value < 1)).toBe(true);
  for (let i = 1; i < overallCurrents.length; i += 1) {
    expect(overallCurrents[i]).toBeGreaterThanOrEqual(overallCurrents[i - 1]);
  }
  expect(overallCurrents[overallCurrents.length - 1]).toBe(1);
});

test('caps each category at maxFilesPerRun, defers the excess, and still succeeds', async () => {
  useSettingsStore.getState().setMaxFilesPerRun(2);
  const items: ScanResult[] = [1, 2, 3, 4, 5].map(n => ({
    ...PHOTO_ITEM,
    path: `/photo/${n}.jpg`,
    displayName: `${n}.jpg`,
    category: 'photo',
  }));
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? items : []));

  const result = await runBackup();

  expect(result.status).toBe('success');
  expect(result.files).toBe(2);
  expect(result.deferred).toBe(3);
  // The three deferred files were never marked backed up, so they stay pending.
  expect(filesMock.markBackup).toHaveBeenCalledTimes(2);
});

test('a zero maxFilesPerRun still processes at least one file', async () => {
  useSettingsStore.getState().setMaxFilesPerRun(0);
  const items: ScanResult[] = [1, 2].map(n => ({
    ...PHOTO_ITEM,
    path: `/photo/${n}.jpg`,
    displayName: `${n}.jpg`,
    category: 'photo',
  }));
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? items : []));

  const result = await runBackup();

  expect(result.status).toBe('success');
  expect(result.files).toBe(1);
  expect(result.deferred).toBe(1);
  expect(filesMock.markBackup).toHaveBeenCalledTimes(1);
});

test('P0-1: a modified file whose upload fails is retried next run, not silently skipped', async () => {
  const store = installStatefulFilesRepo();
  const first: ScanResult = { ...PHOTO_ITEM, path: '/photo/a.jpg', category: 'photo', modifiedAt: 1000 };
  const edited: ScanResult = { ...first, modifiedAt: 2000 };
  let scanned: ScanResult[] = [first];
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? scanned : []));

  // Run 1: uploads cleanly, so the mtime we actually backed up is recorded.
  await runBackup();
  expect(filesMock.markBackup).toHaveBeenCalledWith(
    '/photo/a.jpg',
    'deadbeef',
    expect.any(Number),
    1000,
  );
  expect(store.get('/photo/a.jpg')?.modified_at).toBe(1000);
  expect(store.get('/photo/a.jpg')?.last_backup).not.toBeNull();

  // User edits the file (same path, new mtime). This run's upload fails all
  // retries, so nothing may advance the recorded mtime.
  scanned = [edited];
  apiMock.mockImplementation(() => ({
    sendDocument: jest.fn(async () => {
      throw Object.assign(new Error('Bad Request'), { httpCode: 400 });
    }),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  }));
  await runBackup();
  expect(store.get('/photo/a.jpg')?.modified_at).toBe(1000);

  // Run 3: the file is still pending, so it is re-uploaded instead of skipped.
  apiMock.mockImplementation(() => ({
    sendDocument: jest.fn(async () => ({ messageId: 5, date: 1 })),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  }));
  const third = await runBackup();
  expect(filesMock.markBackup).toHaveBeenCalledWith(
    '/photo/a.jpg',
    'deadbeef',
    expect.any(Number),
    2000,
  );
  expect(store.get('/photo/a.jpg')?.modified_at).toBe(2000);
  expect(third.files).toBe(1);
});

test('P0-2: a manifest send failure records no file as backed up and the session is not success', async () => {
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));
  apiMock.mockImplementation(() => ({
    sendDocument: jest.fn(async (file: { name: string }) => {
      if (String(file.name).endsWith('.manifest.json')) {
        throw Object.assign(new Error('Bad Request'), { httpCode: 400 });
      }
      return { messageId: 5, date: 1 };
    }),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  }));

  const result = await runBackup();

  expect(filesMock.markBackup).not.toHaveBeenCalled();
  expect(result.status).not.toBe('success');
  const finishCalls = (sessionsRepo.finishSession as unknown as jest.Mock).mock.calls;
  expect(finishCalls[0][6]).not.toBe('success');
});

test('P1-8: encryption enabled without a passphrase fails the run and uploads nothing', async () => {
  useSettingsStore.getState().setEncryptionEnabled(true);
  (secureStore.get as unknown as jest.Mock).mockResolvedValue({
    botToken: 'token',
    chatId: '42',
    encryptionPassword: '',
  });
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));

  const result = await runBackup();

  expect(result.status).toBe('failed');
  expect(result.error).toMatch(/enkripsi/i);
  expect(apiMock).not.toHaveBeenCalled();
  expect(filesMock.markBackup).not.toHaveBeenCalled();
});

test('P2: a run where every archive failed is failed, not partial', async () => {
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));
  statMock.mockResolvedValue({ size: 60 * 1024 * 1024, lastModified: 0, type: 'file' });
  apiMock.mockImplementation(() => ({
    sendDocument: jest.fn(async () => {
      throw Object.assign(new Error('Bad Request'), { httpCode: 400 });
    }),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  }));

  const result = await runBackup();

  expect(result.status).toBe('failed');
  expect(result.chunksSent).toBe(0);
});

test('P2-i: a category that will not fit in cache fails instead of filling the disk', async () => {
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));
  // Android shape: `df()` reports strings under `internal_free`.
  fsMock.df = jest.fn(async () => ({ internal_free: '1024', internal_total: '8388608' }));

  const result = await runBackup();

  expect(result.status).toBe('failed');
  expect(result.error).toMatch(/ruang penyimpanan/i);
  // The category is refused before any staging copy is written.
  expect(sliceMock).not.toHaveBeenCalled();
});

test('P2-i: staging proceeds when free space covers the category', async () => {
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));
  fsMock.df = jest.fn(async () => ({
    internal_free: String(1024 * 1024 * 1024),
    internal_total: String(2 * 1024 * 1024 * 1024),
  }));
  apiMock.mockImplementation(() => ({
    sendDocument: jest.fn(async () => ({ messageId: 5, date: 1 })),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  }));

  const result = await runBackup();

  expect(result.status).toBe('success');
});

test('P2-i: an unmeasurable free space does not block the run', async () => {
  scanMock.mockImplementation(async (category: string) => (category === 'photo' ? [PHOTO_ITEM] : []));
  fsMock.df = jest.fn(async () => {
    throw new Error('df not supported');
  });
  apiMock.mockImplementation(() => ({
    sendDocument: jest.fn(async () => ({ messageId: 5, date: 1 })),
    sendMessage: jest.fn(async () => ({ messageId: 6, date: 1 })),
  }));

  const result = await runBackup();

  expect(result.status).toBe('success');
});

describe('P2-g: requestBackupPermissions asks only for what the categories need', () => {
  const platform = Platform as unknown as { OS: string };
  const originalOS = platform.OS;
  const versionDescriptor = Object.getOwnPropertyDescriptor(Platform, 'Version');
  const requestMultiple = jest.spyOn(PermissionsAndroid, 'requestMultiple');
  const request = jest.spyOn(PermissionsAndroid, 'request');

  beforeEach(() => {
    platform.OS = 'android';
    Object.defineProperty(Platform, 'Version', { value: 33, configurable: true });
    requestMultiple.mockReset();
    requestMultiple.mockResolvedValue({} as never);
    request.mockReset();
    request.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  });

  afterAll(() => {
    platform.OS = originalOS;
    if (versionDescriptor) {
      Object.defineProperty(Platform, 'Version', versionDescriptor);
    }
    useSettingsStore.getState().setCategories([Category.PHOTO, Category.VIDEO, Category.DOC]);
    requestMultiple.mockRestore();
    request.mockRestore();
  });

  test('needsMediaPermissions flags only photo and video', () => {
    expect(needsMediaPermissions([Category.PHOTO])).toBe(true);
    expect(needsMediaPermissions([Category.VIDEO])).toBe(true);
    expect(
      needsMediaPermissions([Category.DOC, Category.CUSTOM, Category.CONTACT, Category.SMS]),
    ).toBe(false);
  });

  test('photo + video selected → media permissions requested', async () => {
    requestMultiple.mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES]: PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO]: PermissionsAndroid.RESULTS.GRANTED,
    } as never);

    const state = await requestBackupPermissions([Category.PHOTO, Category.VIDEO]);

    expect(requestMultiple).toHaveBeenCalledWith([
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
    ]);
    expect(state).toEqual({ granted: true, denied: [] });
  });

  test('no media category selected → no media request and granted: true', async () => {
    const state = await requestBackupPermissions([Category.DOC, Category.CUSTOM]);

    expect(requestMultiple).not.toHaveBeenCalled();
    expect(state).toEqual({ granted: true, denied: [] });
  });

  test('a denied media permission still fails the request', async () => {
    requestMultiple.mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES]: PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO]: PermissionsAndroid.RESULTS.DENIED,
    } as never);

    const state = await requestBackupPermissions([Category.PHOTO]);

    expect(state.granted).toBe(false);
    expect(state.denied).toEqual([PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO]);
  });

  test('a denied notification request never blocks the backup', async () => {
    request.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    const state = await requestBackupPermissions([Category.DOC]);

    expect(state).toEqual({ granted: true, denied: [] });
    expect(request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  });

  test('a docs-only runBackup never touches the media permissions', async () => {
    useSettingsStore.getState().setCategories([Category.DOC]);
    scanMock.mockResolvedValue([]);

    const result = await runBackup();

    expect(requestMultiple).not.toHaveBeenCalled();
    expect(result.status).toBe('success');
  });

  test('a photo runBackup requests the media permissions and fails when denied', async () => {
    useSettingsStore.getState().setCategories([Category.PHOTO]);
    requestMultiple.mockResolvedValue({} as never);

    const result = await runBackup();

    expect(requestMultiple).toHaveBeenCalledWith([
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
    ]);
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/permissions/i);
  });
});

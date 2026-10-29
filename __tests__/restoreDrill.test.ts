import { runRestoreDrill, smallestCompleteGroup } from '../src/backup/restoreDrill';
import { sessionsRepo } from '../src/db/repositories/sessions';
import { chunksRepo } from '../src/db/repositories/chunks';
import { secureStore } from '../src/state/secureStore';
import { restoreFromTelegram } from '../src/backup/restoreRunner';

jest.mock('../src/db/repositories/sessions', () => ({
  sessionsRepo: { recentRestorable: jest.fn(async () => []) },
}));

jest.mock('../src/db/repositories/chunks', () => ({
  chunksRepo: { listParts: jest.fn(async () => []) },
}));

jest.mock('../src/state/secureStore', () => ({
  secureStore: { get: jest.fn(async () => ({ botToken: '', chatId: '', encryptionPassword: '' })) },
}));

jest.mock('../src/net/telegramApi', () => ({
  TelegramBotApi: jest.fn().mockImplementation(() => ({ downloadFile: jest.fn() })),
}));

jest.mock('../src/backup/restoreRunner', () => ({
  restoreFromTelegram: jest.fn(async () => ({ status: 'success', files: [], total: 0, succeeded: 0, failed: 0 })),
}));

const sessionsMock = sessionsRepo as unknown as { recentRestorable: jest.Mock };
const chunksMock = chunksRepo as unknown as { listParts: jest.Mock };
const secureMock = secureStore as unknown as { get: jest.Mock };
const restoreMock = restoreFromTelegram as unknown as jest.Mock;

const part = (part_name: string, fileId: string | null, size = 1) => ({
  part_name,
  size,
  telegram_file_id: fileId,
});

beforeEach(() => {
  jest.clearAllMocks();
  secureMock.get.mockResolvedValue({ botToken: 'token', chatId: '42', encryptionPassword: '' });
});

describe('smallestCompleteGroup', () => {
  test('picks the smallest complete entry and counts bolong parts', () => {
    const result = smallestCompleteGroup([
      part('a.zip.001', 'id-1', 100),
      part('a.zip.002', 'id-2', 100),
      part('IMG_small.jpg', 'id-3', 10),
      part('bad.zip.001', 'id-4', 5),
      part('bad.zip.002', null, 5),
    ]);

    expect(result.group?.name).toBe('IMG_small.jpg');
    expect(result.missing).toBe(1);
  });

  test('a gap in the part sequence is bolong, not complete', () => {
    const result = smallestCompleteGroup([
      part('gap.zip.001', 'id-1'),
      part('gap.zip.003', 'id-3'),
    ]);

    expect(result.group).toBeNull();
    // Only the missing index 2 is counted; 1 and 3 are the same entry.
    expect(result.missing).toBe(1);
  });

  test('a single direct entry with a stored file_id is complete', () => {
    const result = smallestCompleteGroup([part('IMG_1.jpg', 'id-1', 7)]);

    expect(result.group).toEqual({ name: 'IMG_1.jpg', bytes: 7 });
    expect(result.missing).toBe(0);
  });
});

describe('runRestoreDrill', () => {
  test('restores exactly one complete entry via the only filter', async () => {
    sessionsMock.recentRestorable.mockResolvedValue([
      { id: 1, total_size: 5, manifest_file_ids: 'm1', archive_name: 'a.zip' },
    ]);
    chunksMock.listParts.mockResolvedValue([
      part('a.zip.001', 'id-1', 100),
      part('a.zip.002', 'id-2', 100),
      part('IMG_small.jpg', 'id-3', 10),
    ]);
    restoreMock.mockResolvedValue({
      status: 'success',
      files: [{ name: 'IMG_small.jpg', status: 'ok' }],
      total: 1,
      succeeded: 1,
      failed: 0,
    });

    const result = await runRestoreDrill();

    expect(result.ok).toBe(true);
    expect(result.files).toBe(1);
    expect(result.message).toContain('IMG_small.jpg');
    expect(restoreMock).toHaveBeenCalledTimes(1);
    const options = restoreMock.mock.calls[0][3];
    const only = options.only as (file: { name: string }) => boolean;
    expect(only({ name: 'IMG_small.jpg' })).toBe(true);
    expect(only({ name: 'a.zip' })).toBe(false);
  });

  test('skips a bolong session and passes with the next complete one', async () => {
    sessionsMock.recentRestorable.mockResolvedValue([
      { id: 1, total_size: 1, manifest_file_ids: 'm1', archive_name: 'bad' },
      { id: 2, total_size: 2, manifest_file_ids: 'm2', archive_name: 'good.zip' },
    ]);
    chunksMock.listParts
      .mockResolvedValueOnce([part('IMG_bad.webp', null)]) // bolong session
      .mockResolvedValueOnce([part('good.zip.001', 'id-1', 20)]); // complete session
    restoreMock.mockResolvedValue({
      status: 'success',
      files: [{ name: 'good.zip', status: 'ok' }],
      total: 1,
      succeeded: 1,
      failed: 0,
    });

    const result = await runRestoreDrill();

    expect(result.ok).toBe(true);
    expect(chunksMock.listParts).toHaveBeenCalledWith(1);
    expect(chunksMock.listParts).toHaveBeenCalledWith(2);
    expect(restoreMock).toHaveBeenCalledTimes(1);
    // The second session won the drill.
    expect(restoreMock.mock.calls[0][1]).toBe(2);
    expect(result.message).toContain('1 part lain');
  });

  test('reports the missing-part count and import advice when nothing is complete', async () => {
    sessionsMock.recentRestorable.mockResolvedValue([
      { id: 1, total_size: 1, manifest_file_ids: 'm1', archive_name: 'bad' },
    ]);
    chunksMock.listParts.mockResolvedValue([
      part('IMG_a.webp', null),
      part('IMG_b.webp', null),
      part('IMG_c.webp', null),
    ]);

    const result = await runRestoreDrill();

    expect(result.ok).toBe(false);
    expect(restoreMock).not.toHaveBeenCalled();
    expect(result.message).toContain('3 part');
    expect(result.message).toContain('Impor manifest dari Telegram');
  });

  test('returns the credential prompt before touching any session', async () => {
    sessionsMock.recentRestorable.mockResolvedValue([{ id: 1, total_size: 1, manifest_file_ids: 'm1' }]);
    secureMock.get.mockResolvedValue({ botToken: '', chatId: '', encryptionPassword: '' });

    const result = await runRestoreDrill();

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Kredensial');
    expect(chunksMock.listParts).not.toHaveBeenCalled();
  });
});
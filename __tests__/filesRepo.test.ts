import { getDb } from '../src/db/db';
import { filesRepo, type NewFile } from '../src/db/repositories/files';

type MockDb = { execute: jest.Mock; executeBatch: jest.Mock };

/** The op-sqlite instance the module under test holds (see jest.setup.js). */
const db = (): MockDb => getDb() as unknown as MockDb;

beforeEach(() => {
  db().execute.mockReset();
  db().execute.mockResolvedValue({ rows: [], rowsAffected: 1, insertId: 1 });
  db().executeBatch.mockReset();
  db().executeBatch.mockResolvedValue({ rowsAffected: 1 });
});

test('P1-9: upsertMany batches 200 files at a time instead of one query each', async () => {
  const files: NewFile[] = Array.from({ length: 250 }, (_, index) => ({
    path: `/photo/${index}.jpg`,
    category: 'photo',
    size: 10,
    modifiedAt: 100,
  }));

  await filesRepo.upsertMany(files);

  expect(db().executeBatch).toHaveBeenCalledTimes(2);
  const firstBatch = db().executeBatch.mock.calls[0][0] as [string, unknown[]][];
  expect(firstBatch).toHaveLength(200);
  expect(firstBatch[0][0]).toContain('ON CONFLICT(path) DO UPDATE');
  // `modified_at` is deliberately absent from the update clause: only
  // markBackup may advance it, or a failed upload would look backed up.
  expect(firstBatch[0][0]).not.toContain('modified_at = excluded.modified_at');
  expect(firstBatch[0][1]).toEqual(['/photo/0.jpg', 'photo', 10, 100, 'pending']);
  const secondBatch = db().executeBatch.mock.calls[1][0] as [string, unknown[]][];
  expect(secondBatch).toHaveLength(50);
});

test('upsertMany with nothing to record never touches the database', async () => {
  await filesRepo.upsertMany([]);

  expect(db().executeBatch).not.toHaveBeenCalled();
});

test('listAll reads every tracked row with a single query', async () => {
  db().execute.mockResolvedValue({
    rows: [
      {
        id: 1,
        path: '/a.jpg',
        category: 'photo',
        hash: null,
        size: 1,
        modified_at: 2,
        last_backup: null,
        status: 'pending',
      },
    ],
    rowsAffected: 0,
  });

  const rows = await filesRepo.listAll();

  expect(db().execute).toHaveBeenCalledTimes(1);
  expect(String(db().execute.mock.calls[0][0])).toContain('FROM files');
  expect(rows.map(row => row.path)).toEqual(['/a.jpg']);
});

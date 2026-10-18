import { getDb } from '../db';
import type { Scalar, SQLBatchTuple } from '@op-engineering/op-sqlite';

export type FileRecord = {
  id: number;
  path: string;
  category: string;
  /** SHA-256 of the source file, written by `markBackup` (PRD §5.6). */
  hash: string | null;
  size: number;
  /**
   * The source mtime this row was last *successfully* backed up at, written by
   * `markBackup`. `upsert` never overwrites it on conflict, so a failed upload
   * leaves it stale and `needsBackup` keeps returning true (PRD §5.6).
   */
  modified_at: number;
  last_backup: number | null;
  status: string;
};

export type NewFile = {
  path: string;
  category: string;
  size: number;
  modifiedAt: number;
  status?: string;
};

const asRecord = (row: Record<string, unknown>): FileRecord => row as unknown as FileRecord;

export const filesRepo = {
  async upsert(file: NewFile): Promise<void> {
    await getDb().execute(
      `INSERT INTO files (path, category, size, modified_at, status)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET
         category = excluded.category,
         size = excluded.size`,
      [file.path, file.category, file.size, file.modifiedAt, file.status ?? 'pending'],
    );
  },

  async getByPath(path: string): Promise<FileRecord | null> {
    const result = await getDb().execute('SELECT * FROM files WHERE path = ?', [path]);
    const row = result.rows[0];
    return row ? asRecord(row) : null;
  },

  /** Every tracked row in one read, for the run's incremental check (P1-9). */
  async listAll(): Promise<FileRecord[]> {
    const result = await getDb().execute('SELECT * FROM files');
    return result.rows.map(asRecord);
  },

  /**
   * Record many scanned files in one transaction per batch, so a large library
   * costs a few round-trips instead of two queries per scanned file (P1-9).
   * Same conflict rule as `upsert`: `modified_at` belongs to `markBackup`.
   */
  async upsertMany(files: NewFile[]): Promise<void> {
    const statement = `INSERT INTO files (path, category, size, modified_at, status)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET
         category = excluded.category,
         size = excluded.size`;
    const batchSize = 200;
    const db = getDb();
    for (let start = 0; start < files.length; start += batchSize) {
      const commands: SQLBatchTuple[] = files
        .slice(start, start + batchSize)
        .map(file => [
          statement,
          [file.path, file.category, file.size, file.modifiedAt, file.status ?? 'pending'] as Scalar[],
        ]);
      await db.executeBatch(commands);
    }
  },

  async markBackup(
    path: string,
    hash: string,
    backupTime: number,
    modifiedAt: number,
    status = 'uploaded',
  ): Promise<void> {
    await getDb().execute(
      'UPDATE files SET hash = ?, last_backup = ?, modified_at = ?, status = ? WHERE path = ?',
      [hash, backupTime, modifiedAt, status, path],
    );
  },

  async count(): Promise<number> {
    const result = await getDb().execute('SELECT COUNT(*) AS n FROM files');
    return Number(result.rows[0]?.n ?? 0);
  },
};

import { getDb } from '../db';

export type SessionRecord = {
  id: number;
  started_at: number;
  finished_at: number | null;
  category: string;
  total_files: number;
  total_size: number;
  chunks_total: number;
  chunks_sent: number;
  status: string;
  manifest_id: string | null;
  /** Telegram document file_ids of the run's manifests, comma separated. */
  manifest_file_ids: string | null;
  archive_name: string | null;
  encrypted: number;
  error_reason: string | null;
  archive_format: string | null;
};

export type NewSession = {
  startedAt: number;
  category: string;
  status: string;
};

const asRecord = (row: Record<string, unknown>): SessionRecord => row as unknown as SessionRecord;

export const sessionsRepo = {
  async insert(session: NewSession): Promise<number> {
    const result = await getDb().execute(
      'INSERT INTO backup_sessions (started_at, category, status) VALUES (?, ?, ?)',
      [session.startedAt, session.category, session.status],
    );
    return Number(result.insertId ?? 0);
  },

  async finishSession(
    id: number,
    finishedAt: number,
    totalFiles: number,
    totalSize: number,
    chunksTotal: number,
    chunksSent: number,
    status: string,
    manifestId: string | null,
    manifestFileIds: string | null,
    archiveName: string | null = null,
    encrypted = 0,
    errorReason: string | null = null,
    archiveFormat: string | null = null,
  ): Promise<void> {
    await getDb().execute(
      `UPDATE backup_sessions
       SET finished_at = ?, total_files = ?, total_size = ?, chunks_total = ?,
           chunks_sent = ?, status = ?, manifest_id = ?, manifest_file_ids = ?,
           archive_name = ?,
           encrypted = ?, error_reason = ?, archive_format = ?
       WHERE id = ?`,
      [
        finishedAt,
        totalFiles,
        totalSize,
        chunksTotal,
        chunksSent,
        status,
        manifestId,
        manifestFileIds,
        archiveName,
        encrypted,
        errorReason,
        archiveFormat,
        id,
      ],
    );
  },

  /** Successes whose manifests are re-downloadable, newest first. */
  async recentRestorable(limit = 20): Promise<SessionRecord[]> {
    const result = await getDb().execute(
      `SELECT * FROM backup_sessions
       WHERE status IN ('success', 'partial') AND manifest_file_ids IS NOT NULL
       ORDER BY started_at DESC LIMIT ?`,
      [limit],
    );
    return result.rows.map(asRecord);
  },

  async updateChunksSent(id: number, chunksSent: number): Promise<void> {
    await getDb().execute('UPDATE backup_sessions SET chunks_sent = ? WHERE id = ?', [chunksSent, id]);
  },

  /**
   * Grow `chunks_total` while the run is in flight so the progress display
   * never divides by zero. `finishSession` still sets the final value.
   */
  async updateChunksTotal(id: number, chunksTotal: number): Promise<void> {
    await getDb().execute(
      'UPDATE backup_sessions SET chunks_total = ? WHERE id = ?',
      [chunksTotal, id],
    );
  },

  async recent(limit = 50): Promise<SessionRecord[]> {
    const result = await getDb().execute(
      'SELECT * FROM backup_sessions ORDER BY started_at DESC LIMIT ?',
      [limit],
    );
    return result.rows.map(asRecord);
  },

  /** Latest run that finished and left something to show for it; partial counts. */
  async lastFinished(): Promise<SessionRecord | null> {
    const result = await getDb().execute(
      "SELECT * FROM backup_sessions WHERE status IN ('success', 'partial') ORDER BY started_at DESC LIMIT 1",
    );
    const row = result.rows[0];
    return row ? asRecord(row) : null;
  },

  async lastSuccess(): Promise<SessionRecord | null> {
    const result = await getDb().execute(
      "SELECT * FROM backup_sessions WHERE status = 'success' ORDER BY started_at DESC LIMIT 1",
    );
    const row = result.rows[0];
    return row ? asRecord(row) : null;
  },

  async totalUploadedSize(): Promise<number> {
    // Partial runs uploaded real bytes too; excluding them made the
    // "Total Ter-backup" tile read 0 for users whose runs end partial.
    const result = await getDb().execute(
      "SELECT COALESCE(SUM(total_size), 0) AS n FROM backup_sessions WHERE status IN ('success', 'partial')",
    );
    return Number(result.rows[0]?.n ?? 0);
  },

  async countAll(): Promise<number> {
    const result = await getDb().execute('SELECT COUNT(*) AS n FROM backup_sessions');
    return Number(result.rows[0]?.n ?? 0);
  },

  async countByStatus(): Promise<Record<string, number>> {
    const result = await getDb().execute(
      'SELECT status, COUNT(*) AS n FROM backup_sessions GROUP BY status',
    );
    const counts: Record<string, number> = {};
    for (const row of result.rows as Record<string, unknown>[]) {
      counts[String(row.status)] = Number(row.n ?? 0);
    }
    return counts;
  },

  async running(): Promise<SessionRecord | null> {
    const result = await getDb().execute(
      "SELECT * FROM backup_sessions WHERE status = 'running' ORDER BY started_at DESC LIMIT 1",
    );
    const row = result.rows[0];
    return row ? asRecord(row) : null;
  },

  /**
   * Close sessions still marked `running` that started before `before`. A
   * session left running belongs to a process that died mid-run (crash or
   * force-stop) and nothing will ever finish it. Passing the current process's
   * start time keeps a genuinely running session of this process untouched.
   */
  async failStaleRunning(before: number): Promise<number> {
    const result = await getDb().execute(
      `UPDATE backup_sessions
       SET status = 'failed', finished_at = ?, error_reason = 'Terputus'
       WHERE status = 'running' AND started_at < ?`,
      [Date.now(), before],
    );
    return Number(result.rowsAffected ?? 0);
  },

  async byId(id: number): Promise<SessionRecord | null> {
    const result = await getDb().execute('SELECT * FROM backup_sessions WHERE id = ? LIMIT 1', [id]);
    const row = result.rows[0];
    return row ? asRecord(row) : null;
  },

  async deleteById(id: number): Promise<void> {
    await getDb().execute('DELETE FROM backup_sessions WHERE id = ?', [id]);
  },

  async deleteOlderThan(ts: number): Promise<number> {
    const result = await getDb().execute('DELETE FROM backup_sessions WHERE started_at < ?', [ts]);
    return Number(result.rowsAffected ?? 0);
  },

  /** Persist an imported session into backup_sessions so it appears in restore history. */
  async insertImportedSession(session: {
    startedAt: number;
    finishedAt: number;
    category?: string;
    totalFiles: number;
    totalSize: number;
    chunksTotal: number;
    chunksSent: number;
    status: string;
    manifestId?: string | null;
    manifestFileIds?: string | null;
    archiveName?: string | null;
    encrypted?: number;
    archiveFormat?: string | null;
  }): Promise<number> {
    const result = await getDb().execute(
      `INSERT INTO backup_sessions (
        started_at, finished_at, category, total_files, total_size,
        chunks_total, chunks_sent, status, manifest_id, manifest_file_ids,
        archive_name, encrypted, archive_format
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.startedAt,
        session.finishedAt,
        session.category ?? 'all',
        session.totalFiles,
        session.totalSize,
        session.chunksTotal,
        session.chunksSent,
        session.status,
        session.manifestId ?? null,
        session.manifestFileIds ?? null,
        session.archiveName ?? null,
        session.encrypted ?? 0,
        session.archiveFormat ?? 'zip',
      ],
    );
    return Number(result.insertId ?? 0);
  },
};

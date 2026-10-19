import { getDb } from '../db';

export type NewChunk = {
  sessionId: number;
  chunkIndex: number;
  size: number;
  /** Uploaded part name (e.g. `backup_photo_2026-01-31.zip.001`). */
  partName: string;
};

export type StoredPart = {
  part_name: string;
  telegram_file_id: string | null;
};

export const chunksRepo = {
  async insert(chunk: NewChunk): Promise<number> {
    const result = await getDb().execute(
      'INSERT INTO chunks (session_id, chunk_index, size, part_name) VALUES (?, ?, ?, ?)',
      [chunk.sessionId, chunk.chunkIndex, chunk.size, chunk.partName],
    );
    return Number(result.insertId ?? 0);
  },

  async markUploaded(
    id: number,
    telegramMsgId: number,
    uploadedAt: number,
    telegramFileId?: string,
  ): Promise<void> {
    await getDb().execute(
      'UPDATE chunks SET telegram_msg_id = ?, uploaded_at = ?, telegram_file_id = ? WHERE id = ?',
      [telegramMsgId, uploadedAt, telegramFileId ?? null, id],
    );
  },

  /** Uploaded parts of a run that carry a re-downloadable file_id. */
  async listDownloadableParts(sessionId: number): Promise<StoredPart[]> {
    const result = await getDb().execute(
      `SELECT part_name, telegram_file_id FROM chunks
       WHERE session_id = ? AND telegram_file_id IS NOT NULL`,
      [sessionId],
    );
    return result.rows.map(row => row as unknown as StoredPart);
  },
};

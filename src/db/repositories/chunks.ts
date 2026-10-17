import { getDb } from '../db';

export type NewChunk = {
  sessionId: number;
  chunkIndex: number;
  size: number;
};

export const chunksRepo = {
  async insert(chunk: NewChunk): Promise<number> {
    const result = await getDb().execute(
      'INSERT INTO chunks (session_id, chunk_index, size) VALUES (?, ?, ?)',
      [chunk.sessionId, chunk.chunkIndex, chunk.size],
    );
    return Number(result.insertId ?? 0);
  },

  async markUploaded(id: number, telegramMsgId: number, uploadedAt: number): Promise<void> {
    await getDb().execute(
      'UPDATE chunks SET telegram_msg_id = ?, uploaded_at = ? WHERE id = ?',
      [telegramMsgId, uploadedAt, id],
    );
  },
};

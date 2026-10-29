import { sessionsRepo } from '../src/db/repositories/sessions';
import { getDb } from '../src/db/db';

test('lastFinished looks at successes and partial runs, not just successes', async () => {
  const execute = getDb().execute as unknown as jest.Mock;
  execute.mockClear();

  await sessionsRepo.lastFinished();

  const [sql] = execute.mock.calls[0];
  expect(sql).toContain("status IN ('success', 'partial')");
  expect(sql).toContain('ORDER BY started_at DESC LIMIT 1');
});

test('failStaleRunning closes only sessions that started before this process', async () => {
  const execute = getDb().execute as unknown as jest.Mock;
  execute.mockClear();

  const closed = await sessionsRepo.failStaleRunning(1000);

  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain("SET status = 'failed'");
  expect(sql).toContain("WHERE status = 'running' AND started_at < ?");
  expect(params[1]).toBe(1000);
  expect(typeof closed).toBe('number');
});

test('insertImportedSession writes a restorable session row with its manifest ids', async () => {
  const execute = getDb().execute as unknown as jest.Mock;
  execute.mockClear();

  await sessionsRepo.insertImportedSession({
    startedAt: 1000,
    finishedAt: 2000,
    totalFiles: 3,
    totalSize: 900,
    chunksTotal: 4,
    chunksSent: 4,
    status: 'success',
    manifestId: 'session-a',
    manifestFileIds: 'doc-1',
  });

  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain('INSERT INTO backup_sessions');
  expect(params).toContain('success');
  expect(params).toContain('doc-1');
});

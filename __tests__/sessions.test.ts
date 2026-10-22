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

import { retryDelayMs, sendDocumentWithRetry } from '../src/backup/uploadRetry';
import { TelegramApiError } from '../src/net/telegramApi';
import { resetThrottle, sendGapMs } from '../src/net/throttle';

const FILE = { path: '/cache/a.zip.001', name: 'a.zip.001', mime: 'application/zip' };

function apiWith(send: jest.Mock) {
  return { sendDocument: send };
}

test('retries a transient failure up to three attempts, then rejects', async () => {
  jest.useFakeTimers();
  const send = jest.fn(async () => {
    throw new TelegramApiError(500, 'server error');
  });

  const promise = sendDocumentWithRetry(apiWith(send), FILE, 'cap', false);
  const outcome = promise.then(
    () => 'resolved',
    error => error,
  );
  await jest.runAllTimersAsync();

  await expect(outcome).resolves.toBeInstanceOf(TelegramApiError);
  expect(send).toHaveBeenCalledTimes(3);
  jest.useRealTimers();
});

test('does not retry a non-transient 4xx', async () => {
  const send = jest.fn(async () => {
    throw new TelegramApiError(400, 'bad request');
  });

  await expect(sendDocumentWithRetry(apiWith(send), FILE, 'cap', false)).rejects.toBeInstanceOf(
    TelegramApiError,
  );
  expect(send).toHaveBeenCalledTimes(1);
});

test('returns the result once a retry succeeds', async () => {
  jest.useFakeTimers();
  const send = jest
    .fn()
    .mockRejectedValueOnce(new TelegramApiError(500, 'boom'))
    .mockResolvedValueOnce({ messageId: 9, date: 1 });

  const promise = sendDocumentWithRetry(apiWith(send), FILE, 'cap', false);
  await jest.runAllTimersAsync();

  await expect(promise).resolves.toEqual({ messageId: 9, date: 1 });
  expect(send).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});

test('429 waits out more attempts than a 500, and slows the next sends', async () => {
  jest.useFakeTimers();
  resetThrottle();
  const send = jest.fn(async () => {
    throw new TelegramApiError(429, 'too many requests', 0);
  });

  const promise = sendDocumentWithRetry(apiWith(send), FILE, 'cap', false);
  const outcome = promise.then(
    () => 'resolved',
    error => error,
  );
  await jest.runAllTimersAsync();

  await expect(outcome).resolves.toBeInstanceOf(TelegramApiError);
  // A pace problem deserves more patience than a server hiccup.
  expect(send).toHaveBeenCalledTimes(6);
  expect(sendGapMs()).toBeGreaterThan(1000);
  jest.useRealTimers();
  resetThrottle();
});

test('a clean send eases the pace back down', async () => {
  resetThrottle();
  const send = jest.fn(async () => ({ messageId: 1, date: 1 }));
  await sendDocumentWithRetry(apiWith(send), FILE, 'cap', false);
  expect(sendGapMs()).toBe(1000);
});

test('429 honours Retry-After; other errors back off exponentially', () => {
  expect(retryDelayMs(new TelegramApiError(429, 'slow', 5), 1)).toBe(5000);
  expect(retryDelayMs(new TelegramApiError(500, 'x'), 1)).toBe(1000);
  expect(retryDelayMs(new TelegramApiError(500, 'x'), 2)).toBe(2000);
  expect(retryDelayMs(new Error('network'), 3)).toBe(4000);
});

test('P2-5: an absurd Retry-After is capped so a run cannot park for hours', () => {
  // Telegram can answer with a Retry-After in the thousands of seconds; the
  // chunk must give up and be retried by the next run instead.
  expect(retryDelayMs(new TelegramApiError(429, 'slow', 7200), 1)).toBe(60_000);
});

test('forwards byte progress to the API instead of dropping it', async () => {
  const onProgress = jest.fn();
  const send = jest.fn(
    async (
      _file: unknown,
      _caption?: string,
      _onProgress?: (sent: number, total: number) => void,
      _silent?: boolean,
    ) => ({ messageId: 1, date: 1 }),
  );

  await sendDocumentWithRetry(apiWith(send), FILE, 'cap', false, onProgress);

  // Third argument is the API's own onProgress slot; it must be the caller's
  // callback, not `undefined` — otherwise no byte-level progress reaches the UI.
  expect(send.mock.calls[0][2]).toBe(onProgress);
});

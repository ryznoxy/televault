jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    wrap: (path: string) => `ReactNativeBlobUtil-file://${path}`,
    config: jest.fn(),
    fetch: jest.fn(),
  },
}));

import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  TelegramBotApi,
  TelegramApiError,
  blobTransport,
  REQUEST_TIMEOUT_MS,
  type HttpRequest,
  type HttpResponse,
} from '../src/net/telegramApi';

const blob = ReactNativeBlobUtil as unknown as { config: jest.Mock; fetch: jest.Mock };

function fakeTransport(response: HttpResponse) {
  const calls: HttpRequest[] = [];
  const transport = async (request: HttpRequest): Promise<HttpResponse> => {
    calls.push(request);
    return response;
  };
  return { transport, calls };
}

beforeEach(() => {
  blob.config.mockReset();
  blob.fetch.mockReset();
  blob.fetch.mockResolvedValue({
    text: async () => JSON.stringify({ ok: true, result: { message_id: 1, date: 1 } }),
    info: () => ({ status: 200, headers: {} }),
  });
  blob.config.mockReturnValue({ fetch: blob.fetch });
});

test('testConnection returns the bot username', async () => {
  const { transport } = fakeTransport({
    status: 200,
    body: JSON.stringify({ ok: true, result: { username: 'my_bot' } }),
  });
  const api = new TelegramBotApi('token', '42', transport);
  expect(await api.testConnection()).toBe('@my_bot');
});

test('P2-l: sendMessage sends chat_id and text with no parse_mode', async () => {
  const { transport, calls } = fakeTransport({
    status: 200,
    body: JSON.stringify({ ok: true, result: { message_id: 7, date: 1694524800 } }),
  });
  const api = new TelegramBotApi('token', '42', transport);
  const result = await api.sendMessage('hello');
  expect(result).toEqual({ messageId: 7, date: 1694524800 });
  expect(calls[0].url).toBe('https://api.telegram.org/bottoken/sendMessage');
  expect(calls[0].fields).toEqual({ chat_id: '42', text: 'hello' });
});

test('sendDocument forwards the file part and caption', async () => {
  const { transport, calls } = fakeTransport({
    status: 200,
    body: JSON.stringify({ ok: true, result: { message_id: 9, date: 1 } }),
  });
  const api = new TelegramBotApi('token', '42', transport);
  await api.sendDocument(
    { path: '/tmp/a.zip', name: 'a.zip', mime: 'application/zip' },
    'part 1/2',
  );
  expect(calls[0].file).toEqual({ path: '/tmp/a.zip', name: 'a.zip', mime: 'application/zip' });
  expect(calls[0].fields?.caption).toBe('part 1/2');
});

test('non-ok response throws TelegramApiError with http code', async () => {
  const { transport } = fakeTransport({
    status: 401,
    body: JSON.stringify({ ok: false, description: 'Unauthorized' }),
  });
  const api = new TelegramBotApi('token', '42', transport);
  await expect(api.sendMessage('x')).rejects.toMatchObject({
    name: 'TelegramApiError',
    httpCode: 401,
  });
  await expect(api.sendMessage('x')).rejects.toBeInstanceOf(TelegramApiError);
});

test('transport error never leaks the bot token in its message', async () => {
  const token = '123456:SECRET_TOKEN';
  const transport = async (request: { url: string }): Promise<HttpResponse> => {
    throw new Error(`Network request failed: ${request.url}`);
  };
  const api = new TelegramBotApi(token, '42', transport);
  const error = (await api.sendMessage('x').catch(e => e)) as Error;
  expect(error.message).not.toContain(token);
  expect(error.message).not.toContain('123456:SECRET_TOKEN');
  expect(error.message).toContain('https://api.telegram.org/bot<token>/sendMessage');
});

test('transport error preserves the URL shape so callers can still diagnose', async () => {
  const transport = async (request: { url: string }): Promise<HttpResponse> => {
    throw new Error(`timeout reaching ${request.url}`);
  };
  const api = new TelegramBotApi('topsecret', '42', transport);
  const error = (await api
    .sendDocument({ path: '/a.zip', name: 'a.zip', mime: 'application/zip' })
    .catch(e => e)) as Error;
  expect(error.message).toContain('https://api.telegram.org/bot<token>/sendDocument');
  expect(error.message).not.toContain('topsecret');
});

test('P2-h: blobTransport applies the request timeout', async () => {
  await blobTransport({ url: 'https://api.telegram.org/botx/getMe', method: 'GET' });

  expect(blob.config).toHaveBeenCalledWith({ timeout: REQUEST_TIMEOUT_MS });
  expect(blob.fetch).toHaveBeenCalledTimes(1);
});

test('P2-h: a stalled request becomes a clear, retryable transport error', async () => {
  blob.fetch.mockRejectedValue(new Error('Timeout'));
  const api = new TelegramBotApi('token', '42');

  const error = (await api.getMe().catch(e => e)) as Error;

  expect(error.message).toMatch(/timeout/i);
  expect(error.message).toContain('Telegram');
  // No `httpCode` is what makes `uploadRetry` treat it as transient (PRD §14).
  expect((error as { httpCode?: number }).httpCode).toBeUndefined();
});

test('P2-h: a non-timeout transport failure is passed through unchanged', async () => {
  blob.fetch.mockRejectedValue(new Error('Network request failed'));
  const api = new TelegramBotApi('token', '42');

  const error = (await api.getMe().catch(e => e)) as Error;

  expect(error.message).toContain('Network request failed');
});

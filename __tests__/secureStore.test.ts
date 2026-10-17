import { secureStore } from '../src/state/secureStore';

beforeEach(async () => {
  await secureStore.clear();
});

test('saving token keeps previously saved chat id', async () => {
  await secureStore.saveBotToken('123:ABC');
  await secureStore.saveChatId('-100200');
  const creds = await secureStore.get();
  expect(creds.botToken).toBe('123:ABC');
  expect(creds.chatId).toBe('-100200');
});

test('isConfigured is false until both token and chat id set', async () => {
  await secureStore.saveBotToken('123:ABC');
  expect(await secureStore.isConfigured()).toBe(false);
  await secureStore.saveChatId('-100200');
  expect(await secureStore.isConfigured()).toBe(true);
});

test('clear removes stored credentials', async () => {
  await secureStore.saveBotToken('123:ABC');
  await secureStore.clear();
  expect((await secureStore.get()).botToken).toBe('');
});

test('clear empties all three fields including encryption password', async () => {
  await secureStore.saveBotToken('123:ABC');
  await secureStore.saveChatId('-100200');
  await secureStore.saveEncryptionPassword('super-secret');
  expect((await secureStore.get()).encryptionPassword).toBe('super-secret');
  await secureStore.clear();
  const after = await secureStore.get();
  expect(after.botToken).toBe('');
  expect(after.chatId).toBe('');
  expect(after.encryptionPassword).toBe('');
});

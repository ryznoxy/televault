import * as Keychain from 'react-native-keychain';

const SERVICE = 'telebot_backup_credentials';

export type Credentials = {
  botToken: string;
  chatId: string;
  encryptionPassword: string;
};

const EMPTY: Credentials = { botToken: '', chatId: '', encryptionPassword: '' };

async function read(): Promise<Credentials> {
  const result = await Keychain.getGenericPassword({ service: SERVICE });
  if (!result || !result.password) {
    return EMPTY;
  }
  try {
    return { ...EMPTY, ...(JSON.parse(result.password) as Partial<Credentials>) };
  } catch {
    return EMPTY;
  }
}

async function write(credentials: Credentials): Promise<void> {
  await Keychain.setGenericPassword('telebot', JSON.stringify(credentials), {
    service: SERVICE,
  });
}

export const secureStore = {
  async get(): Promise<Credentials> {
    return read();
  },

  async saveBotToken(botToken: string): Promise<void> {
    await write({ ...(await read()), botToken });
  },

  async saveChatId(chatId: string): Promise<void> {
    await write({ ...(await read()), chatId });
  },

  async saveEncryptionPassword(encryptionPassword: string): Promise<void> {
    await write({ ...(await read()), encryptionPassword });
  },

  async isConfigured(): Promise<boolean> {
    const { botToken, chatId } = await read();
    return botToken.trim() !== '' && chatId.trim() !== '';
  },

  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};

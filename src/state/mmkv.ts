import { createMMKV } from 'react-native-mmkv';

export const mmkv = createMMKV({ id: 'telebot_settings' });

export const mmkvStorage = {
  getItem: (name: string): string | null => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string): void => {
    mmkv.set(name, value);
  },
  removeItem: (name: string): void => {
    mmkv.remove(name);
  },
};

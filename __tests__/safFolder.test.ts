import { NativeModules, Platform } from 'react-native';
import { listSafFolder } from '../src/backup/safFolder';

jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android },
}));

describe('listSafFolder', () => {
  it('returns entries from the native module', async () => {
    (NativeModules as any).SafFolder = {
      list: jest.fn().mockResolvedValue([
        { path: 'p', displayName: 'n', size: 1, modifiedAt: 2 },
      ]),
    };
    await expect(listSafFolder('content://tree/x')).resolves.toHaveLength(1);
  });

  it('rejects with a readable error when the native module is missing', async () => {
    (NativeModules as any).SafFolder = undefined;
    await expect(listSafFolder('content://tree/x')).rejects.toThrow('SafFolder');
  });

  it('is empty off Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    try {
      (NativeModules as any).SafFolder = { list: jest.fn() };
      await expect(listSafFolder('file://x')).resolves.toEqual([]);
    } finally {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    }
  });
});

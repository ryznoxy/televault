import { mmkv } from '../src/state/mmkv';
import { getErrorLog, clearErrorLog } from '../src/state/errorLog';
import {
  captureLastExit,
  exitReasonLabel,
  getLastExit,
  isSuspiciousExit,
} from '../src/state/lastExit';

beforeEach(() => {
  mmkv.clearAll();
  clearErrorLog();
});

describe('captureLastExit', () => {
  test('keeps nothing when the platform has no exit info', async () => {
    const result = await captureLastExit(undefined);
    expect(result).toBeNull();
    expect(getLastExit()).toBeNull();
  });

  test('stores the reason Android reports and logs suspicious ones once', async () => {
    const info = {
      at: 1_000,
      reason: 'LOW_MEMORY',
      description: 'excessive memory',
      trace: '',
    };
    const source = { lastExitReason: jest.fn(async () => info) };

    const first = await captureLastExit(source);
    expect(first).toEqual(info);
    expect(getLastExit()).toEqual(info);
    expect(getErrorLog()).toHaveLength(1);
    expect(getErrorLog()[0].scope).toBe('exit:LOW_MEMORY');

    // Android keeps the history, so the next boot reports the same death: no
    // second write, no second log entry.
    const second = await captureLastExit(source);
    expect(second).toEqual(info);
    expect(getErrorLog()).toHaveLength(1);
  });

  test('replaces the record when a newer death is reported', async () => {
    const source = {
      lastExitReason: jest
        .fn()
        .mockResolvedValueOnce({ at: 1_000, reason: 'LOW_MEMORY', description: '', trace: '' })
        .mockResolvedValueOnce({ at: 2_000, reason: 'CRASH', description: 'boom', trace: 'x' }),
    };

    await captureLastExit(source);
    const second = await captureLastExit(source);

    expect(second?.at).toBe(2_000);
    expect(getLastExit()?.reason).toBe('CRASH');
    expect(getErrorLog()).toHaveLength(2);
  });

  test('a native failure keeps the stored record instead of clearing it', async () => {
    mmkv.set('last_exit', JSON.stringify({ at: 1, reason: 'ANR', description: '', trace: '' }));
    const source = { lastExitReason: jest.fn(async () => Promise.reject(new Error('dead'))) };

    const result = await captureLastExit(source);
    expect(result?.reason).toBe('ANR');
  });

  test('ordinary closes are stored but not logged as errors', async () => {
    const source = {
      lastExitReason: jest.fn(async () => ({
        at: 1_000,
        reason: 'USER_REQUESTED',
        description: '',
        trace: '',
      })),
    };

    await captureLastExit(source);
    expect(getErrorLog()).toHaveLength(0);
  });
});

describe('isSuspiciousExit / exitReasonLabel', () => {
  test('kills are suspicious, user closes are not', () => {
    expect(isSuspiciousExit('LOW_MEMORY')).toBe(true);
    expect(isSuspiciousExit('CRASH')).toBe(true);
    expect(isSuspiciousExit('ANR')).toBe(true);
    expect(isSuspiciousExit('USER_REQUESTED')).toBe(false);
    expect(isSuspiciousExit('EXIT_SELF')).toBe(false);
  });

  test('labels cover the reasons a kill can take', () => {
    expect(exitReasonLabel('LOW_MEMORY')).toContain('memori');
    expect(exitReasonLabel('ANR')).toContain('ANR');
    expect(exitReasonLabel('USER_REQUESTED')).toBe('Ditutup pengguna');
    // Unknown reasons fall through so nothing is hidden.
    expect(exitReasonLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});

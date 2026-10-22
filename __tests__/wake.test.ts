import { lastWake, recordWake } from '../src/background/wake';
import { mmkv } from '../src/state/mmkv';

const KEY = 'scheduler_last_wake';

beforeEach(() => {
  mmkv.remove(KEY);
});

test('a wake reports both when and what woke it', () => {
  const before = Date.now();
  recordWake('alarm');
  const wake = lastWake();
  expect(wake?.source).toBe('alarm');
  expect(wake?.at).toBeGreaterThanOrEqual(before);
  expect(wake?.at).toBeLessThanOrEqual(Date.now());
});

test('the default source is the inexact job', () => {
  recordWake();
  expect(lastWake()?.source).toBe('job');
});

test('a timestamp stored by an older install has no source', () => {
  mmkv.set(KEY, '1700000000000');
  expect(lastWake()).toEqual({ at: 1700000000000, source: null });
});

test('nothing recorded yet means no wake', () => {
  expect(lastWake()).toBeNull();
});

test('a corrupted value is not reported as a wake', () => {
  mmkv.set(KEY, 'bukan angka|alarm');
  expect(lastWake()).toBeNull();
});
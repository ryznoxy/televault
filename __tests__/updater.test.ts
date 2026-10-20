import { appVersion, isNewerVersion, sha256For } from '../src/update/updater';

describe('appVersion fallback', () => {
  test.each([
    [{ appVersion: '1.2.4' }, '1.2.4'],
    [{ appVersion: 'unknown' }, '99.0.0'],
    [{}, '99.0.0'],
    [undefined, '99.0.0'],
  ])('(%p) → %p', (input, expected) => {
    expect(appVersion(input as { appVersion?: string } | undefined)).toBe(expected);
  });
});

describe('isNewerVersion', () => {
  test.each([
    ['1.1.0', '1.0.0', true],
    ['v1.1.0', '1.0.0', true],
    ['1.10.0', '1.9.0', true],
    ['1.0.1', '1.0.0', true],
    ['2.0.0', '1.9.9', true],
    ['1.0.0', '1.0.0', false],
    ['1.0.0', '1.0.1', false],
    ['1.1', '1.1.0', false],
    ['1.1.0-beta', '1.0.0', true],
  ])('%s vs %s → %p', (candidate, current, expected) => {
    expect(isNewerVersion(candidate, current)).toBe(expected);
  });
});

describe('sha256For', () => {
  const sums = [
    'ABCDEF0123456789abcdef0123456789abcdef0123456789abcdef0123456789  televault-1.2.0.apk',
    '0000000000000000000000000000000000000000000000000000000000000000  other.apk',
  ].join('\n');

  test('finds the APK line, case-insensitive suffix', () => {
    expect(sha256For('televault-1.2.0.apk', sums)).toBe(
      'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789',
    );
  });

  test('empty when absent or malformed', () => {
    expect(sha256For('missing.apk', sums)).toBe('');
    expect(sha256For('other.apk', 'not-a-hash  other.apk')).toBe('');
  });
});

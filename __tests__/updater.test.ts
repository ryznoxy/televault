import { appVersion, deviceVersionCode, isNewerVersion, sha256For, versionCodeFor } from '../src/update/updater';

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

describe('checkForUpdate throttle', () => {
  const okRelease = {
    ok: true,
    json: async () => ({
      tag_name: 'v9.9.9',
      assets: [
        { name: 'app-release.apk', browser_download_url: 'https://x/app-release.apk' },
        { name: 'SHA256SUMS', browser_download_url: 'https://x/SHA256SUMS' },
      ],
    }),
  } as unknown as Response;

  test('skips the API within the interval, forces past it', async () => {
    jest.resetModules();
    let storedAt = '1000000';
    jest.doMock('../src/state/mmkv', () => ({
      mmkv: {
        getString: () => storedAt,
        set: (_key: string, value: string) => {
          storedAt = value;
        },
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fresh = require('../src/update/updater');
    const fetchFn = jest.fn(async (url: RequestInfo | URL) =>
      String(url).endsWith('SHA256SUMS')
        ? ({ ok: true, text: async () => 'a'.repeat(64) + '  app-release.apk' } as unknown as Response)
        : okRelease,
    );
    // interval guard: fetchFn must not be called
    await fresh.checkForUpdate(fetchFn, '1.0.0', false, 2_000_000);
    expect(fetchFn).not.toHaveBeenCalled();
    // force bypasses the throttle and hits the API (+1 for SHA256SUMS)
    const update = await fresh.checkForUpdate(fetchFn, '1.0.0', true, 2_000_000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(update?.tag).toBe('v9.9.9');
    // a successful forced check stamps the throttle
    await fresh.checkForUpdate(fetchFn, '1.0.0', false, 2_000_000 + 1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('version code comparison', () => {
  test.each([
    ['v1.2.8', 10208],
    ['1.2.8', 10208],
    ['v1.10.0', 11000],
    ['notaversion', null],
  ])('versionCodeFor(%p) → %p', (tag, expected) => {
    expect(versionCodeFor(tag)).toBe(expected);
  });

  test.each([
    [{ buildVersionCode: 10206 }, 10206],
    [{}, null],
    [undefined, null],
  ])('deviceVersionCode(%p) → %p', (input, expected) => {
    expect(deviceVersionCode(input as { buildVersionCode?: number } | undefined)).toBe(expected);
  });

  test('release newer than device code wins even when appVersion is unreadable', async () => {
    jest.resetModules();
    jest.doMock('../src/state/mmkv', () => ({ mmkv: { getString: () => '', set: () => undefined } }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fresh = require('../src/update/updater');
    const release = {
      ok: true,
      json: async () => ({
        tag_name: 'v1.2.8',
        assets: [
          { name: 'app-release.apk', browser_download_url: 'https://x/app-release.apk' },
          { name: 'SHA256SUMS', browser_download_url: 'https://x/SHA256SUMS' },
        ],
      }),
    } as unknown as Response;
    const fetchFn = jest.fn(async (url: RequestInfo | URL) =>
      String(url).endsWith('SHA256SUMS')
        ? ({ ok: true, text: async () => 'a'.repeat(64) + '  app-release.apk' } as unknown as Response)
        : release,
    );
    // appVersion() falls back to '99.0.0' (unreadable), yet v1.2.8 > v1.2.6 by code
    const update = await fresh.checkForUpdate(
      fetchFn,
      fresh.appVersion(undefined),
      true,
      Date.now(),
      10206,
    );
    expect(update?.tag).toBe('v1.2.8');
  });

  test('same versionCode yields no banner', async () => {
    jest.resetModules();
    jest.doMock('../src/state/mmkv', () => ({ mmkv: { getString: () => '', set: () => undefined } }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fresh = require('../src/update/updater');
    const release = {
      ok: true,
      json: async () => ({
        tag_name: 'v1.2.8',
        assets: [
          { name: 'app-release.apk', browser_download_url: 'https://x/app-release.apk' },
          { name: 'SHA256SUMS', browser_download_url: 'https://x/SHA256SUMS' },
        ],
      }),
    } as unknown as Response;
    const fetchFn = jest.fn(async (url: RequestInfo | URL) =>
      String(url).endsWith('SHA256SUMS')
        ? ({ ok: true, text: async () => 'a'.repeat(64) + '  app-release.apk' } as unknown as Response)
        : release,
    );
    const update = await fresh.checkForUpdate(fetchFn, '1.2.8', true, Date.now(), 10208);
    expect(update).toBeNull();
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

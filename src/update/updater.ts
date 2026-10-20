import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { mmkv } from '../state/mmkv';

/** Repo the release workflow publishes to; the app must read it unauthenticated. */
export const RELEASE_REPO = 'ryznoxy/televault';

export type AvailableUpdate = {
  tag: string;
  apkUrl: string;
  /** SHA-256 of the APK, upper-case, from the release's SHA256SUMS asset. */
  sha256: string;
  size: number;
};

export function appVersion(constants: { appVersion?: string } | undefined = Platform.OS === 'android' ? (Platform.constants as { appVersion?: string }) : undefined): string {
  // `Platform.constants.appVersion` mirrors versionName from build.gradle
  // (injected from the release tag by CI). Absent in tests/other platforms.
  // Missing constants must read as "latest" — an unknown version would make
  // every release look newer and the banner would never go away.
  const version = constants?.appVersion;
  return version && version !== 'unknown' && /^\d/.test(version) ? version : '99.0.0';
}

/** Numeric-dot comparison; `1.10.0` > `1.9.0`. Non-numeric tails ignored. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parts = (version: string): number[] =>
    version
      .replace(/^v/, '')
      .split('-')[0]
      .split('.')
      .map(segment => parseInt(segment, 10) || 0);
  const a = parts(candidate);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/** versionCode encodes semver in CI: v1.2.8 → 10208 (major*10000 + minor*100 + patch). */
export function versionCodeFor(tag: string): number | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(tag);
  if (!match) return null;
  const [, major, minor, patch] = match.map(Number) as unknown as number[];
  return major * 10000 + minor * 100 + patch;
}

/** Numeric build versionCode from the device; null when unreadable. */
export function deviceVersionCode(
  constants: { buildVersionCode?: number } | undefined = Platform.OS === 'android'
    ? (Platform.constants as { buildVersionCode?: number })
    : undefined,
): number | null {
  const code = constants?.buildVersionCode;
  return typeof code === 'number' && Number.isFinite(code) ? code : null;
}

/** Pulls the APK's digest out of a `SHA256SUMS` file (one `<hash>  <name>` per line). */
export function sha256For(apkName: string, sums: string): string {
  const line = sums
    .split('\n')
    .find(entry => entry.trim().endsWith(apkName) && /^[0-9a-fA-F]{64}\s/.test(entry.trim()));
  return line ? line.trim().split(/\s+/)[0].toUpperCase() : '';
}

type ReleaseResponse = {
  tag_name?: unknown;
  assets?: { name?: unknown; browser_download_url?: unknown; size?: unknown }[];
};

// Unauthenticated GitHub API allows ~60 req/h per IP, shared by anything on
// the same network. One check per cold start can still burn it across
// restarts, so throttle to one successful check per interval. `force` is for
// an explicit pull-to-refresh style re-check.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'update_last_check_at';

function lastCheckAt(): number {
  const stored = mmkv.getString(LAST_CHECK_KEY);
  return stored ? Number(stored) || 0 : 0;
}

/** Returns the pending update, or null when the install is current. */
export async function checkForUpdate(
  fetchFn: typeof fetch = fetch,
  current: string = appVersion(),
  force = false,
  now = Date.now(),
  deviceCode: number | null = deviceVersionCode(),
): Promise<AvailableUpdate | null> {
  if (!force && now - lastCheckAt() < CHECK_INTERVAL_MS) return null;
  const response = await fetchFn(`https://api.github.com/repos/${RELEASE_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'televault-app' },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  const release = (await response.json()) as ReleaseResponse;
  if (typeof release.tag_name !== 'string') return null;
  // Record only after a successful API round-trip so a failed check retries
  // on the next start instead of waiting out the interval.
  mmkv.set(LAST_CHECK_KEY, String(now));
  // Prefer the numeric versionCode (CI encodes the tag into it) — versionName
  // via Platform.constants.appVersion has proven unreadable on some devices,
  // which silently pinned those installs to "latest".
  const releaseCode = versionCodeFor(release.tag_name);
  const newer =
    releaseCode !== null && deviceCode !== null
      ? releaseCode > deviceCode
      : isNewerVersion(release.tag_name, current);
  if (!newer) return null;

  const assets = release.assets ?? [];
  const apk = assets.find(
    asset =>
      typeof asset.name === 'string' &&
      typeof asset.browser_download_url === 'string' &&
      asset.name.endsWith('.apk'),
  );
  const sums = assets.find(asset => asset.name === 'SHA256SUMS');
  if (!apk?.browser_download_url || !sums?.browser_download_url) {
    throw new Error('Rilis terbaru belum punya APK atau checksum.');
  }
  const sumsResponse = await fetchFn(String(sums.browser_download_url), {
    headers: { 'User-Agent': 'televault-app' },
  });
  if (!sumsResponse.ok) throw new Error(`Checksum gagal diunduh (${sumsResponse.status})`);
  const sha256 = sha256For(String(apk.name), await sumsResponse.text());
  if (!sha256) throw new Error('Checksum APK tidak ditemukan di SHA256SUMS.');

  return {
    tag: release.tag_name,
    apkUrl: String(apk.browser_download_url),
    sha256,
    size: typeof apk.size === 'number' ? apk.size : 0,
  };
}

/**
 * Downloads the APK, verifies it against the release's checksum, then hands it
 * to the Android package installer (the OS shows its one unavoidable "Install"
 * prompt). Rejects before opening anything if the digest does not match.
 */
export async function downloadAndInstall(
  update: AvailableUpdate,
  onProgress: (sent: number, total: number) => void,
): Promise<void> {
  const destination = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${update.tag.replace(/^v/, '')}.apk`;
  // Cache bytes: the installer opens it once and it is deleted on mismatch;
  // Android clears the cache dir under storage pressure anyway.
  const state = ReactNativeBlobUtil.config({
    path: destination,
  });
  // Drop APKs from earlier update attempts so a failed install never leaves
  // several tens of MB behind.
  const oldApks = (await ReactNativeBlobUtil.fs.ls(ReactNativeBlobUtil.fs.dirs.CacheDir)).filter(
    name => name.endsWith('.apk') && name !== destination.split('/').pop(),
  );
  for (const name of oldApks) {
    await ReactNativeBlobUtil.fs.unlink(`${ReactNativeBlobUtil.fs.dirs.CacheDir}/${name}`);
  }
  const downloaded = await state.fetch('GET', update.apkUrl).progress(onProgress);
  const sha256 = (await ReactNativeBlobUtil.fs.hash(destination, 'sha256')).toUpperCase();
  if (sha256 !== update.sha256.toUpperCase()) {
    await downloaded.flush();
    await ReactNativeBlobUtil.fs.unlink(destination);
    throw new Error(
      'Checksum APK tidak cocok. Unduhan dibatalkan; coba lagi atau unduh manual dari halaman rilis.',
    );
  }
  // RNBU resolves the FileProvider URI itself from a plain absolute path;
  // a `file://` prefix here double-escapes it and the installer fails with
  // "Failed to find configured root that contains /file:/data/...".
  await ReactNativeBlobUtil.android.actionViewIntent(
    destination,
    'application/vnd.android.package-archive',
  );
}

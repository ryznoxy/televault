import ReactNativeBlobUtil from 'react-native-blob-util';
import { unzip } from 'react-native-zip-archive';
import { chunkName } from './chunker';
import { decryptFile, decryptFileWithKey, keyFromPassphrase } from './crypto';
import { sha256File } from './hasher';
import { trackTempDir, untrackTempDir } from './tempDirs';
import type { Manifest, ManifestEncryption, ManifestFile } from './manifest';

export type RestorePhase = 'joining' | 'verifying' | 'decrypting' | 'extracting' | 'done';

export type RestoreProgress = {
  file: string;
  index: number;
  total: number;
  phase: RestorePhase;
};

export type RestoreFileResult = {
  name: string;
  status: 'ok' | 'failed';
  outputPath?: string;
  extractedPath?: string;
  error?: string;
};

export type RestoreResult = {
  status: 'success' | 'partial' | 'failed';
  files: RestoreFileResult[];
  total: number;
  succeeded: number;
  failed: number;
};

export type RestoreOptions = {
  passphrase?: string;
  outputDir?: string;
  onProgress?: (progress: RestoreProgress) => void;
};

export type PartResolution = {
  parts: string[];
  missing: string[];
};

const MANIFEST_VERSION = '1.0';
/** Backup builds since the per-part encryption change write 2.0 manifests. */
const MANIFEST_VERSION_V2 = '2.0';
const LEGACY_MANIFEST_NAME = 'manifest.json';

/** A backup manifest, legacy (`manifest.json`) or named after its archive. */
export function isManifestName(name: string): boolean {
  return name === LEGACY_MANIFEST_NAME || name.endsWith('.manifest.json');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function baseName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

const URI_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * `restoreRunner` hands back bare on-disk paths, but the Android document
 * picker passes `sourceUris[0]` straight to `ContentResolver.openInputStream`,
 * which needs a real URI — a scheme-less path throws "Unknown URL". Prefix
 * `file://` for bare paths and leave an already-formed URI untouched.
 *
 * Note: on API 30+ sharing an app-private path with another app can also
 * require a `content://` FileProvider URI. That cannot be verified without a
 * device; if the save dialog still fails there, add a FileProvider authority.
 */
export function toFileUri(path: string): string {
  return URI_SCHEME.test(path) ? path : `file://${path}`;
}

function stripEnc(name: string): string {
  return name.endsWith('.enc') ? name.slice(0, -4) : name;
}

/**
 * A manifest file name is untrusted input interpolated straight into on-disk
 * paths during restore. Reject anything that could escape its target directory:
 * separators, `.`/`..`, and absolute paths / Windows drive letters. A `..` that
 * is merely part of a longer name (`backup..2024.pdf`) is a normal file name and
 * must be accepted — rejecting it made a whole manifest unrestorable.
 */
function isSafeName(name: string): boolean {
  return (
    name !== '' &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !/^[a-zA-Z]:/.test(name)
  );
}

function assertSafeName(name: string): void {
  if (!isSafeName(name)) {
    throw new Error(`Nama berkas tidak valid: ${name}`);
  }
}

/** Join a validated manifest name onto a directory, refusing anything unsafe. */
function safeJoin(dir: string, name: string): string {
  assertSafeName(name);
  return `${dir}/${name}`;
}

async function readText(path: string): Promise<string> {
  const raw = await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
  return typeof raw === 'string' ? raw : String(raw);
}

function parseEncryption(raw: unknown): ManifestEncryption {
  const record = raw as Record<string, unknown>;
  if (!record || typeof record !== 'object') {
    throw new Error('Parameter enkripsi di manifest tidak valid');
  }
  const { algorithm, kdf, iterations, salt } = record;
  if (algorithm !== 'AES-256-GCM' || kdf !== 'PBKDF2-SHA256') {
    throw new Error('Algoritma enkripsi di manifest tidak didukung');
  }
  if (typeof iterations !== 'number' || iterations <= 0) {
    throw new Error('Jumlah iterasi KDF di manifest tidak valid');
  }
  if (typeof salt !== 'string' || salt === '') {
    throw new Error('Salt enkripsi di manifest tidak valid');
  }
  return { algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations, salt };
}

function parseFileEntry(entry: unknown, index: number): ManifestFile {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Berkas ke-${index + 1} di manifest tidak valid`);
  }
  const record = entry as Record<string, unknown>;
  const { name, size, chunks, encrypted, sha256, iv, ivs } = record;
  if (typeof name !== 'string' || !isSafeName(name)) {
    throw new Error(`Berkas ke-${index + 1}: nama berkas tidak valid`);
  }
  if (typeof chunks !== 'number' || !Number.isInteger(chunks) || chunks < 1) {
    throw new Error(`Berkas ${name}: jumlah potongan tidak valid`);
  }
  if (typeof size !== 'number') {
    throw new Error(`Berkas ${name}: ukuran tidak valid`);
  }
  if (typeof encrypted !== 'boolean') {
    throw new Error(`Berkas ${name}: status enkripsi tidak valid`);
  }
  if (typeof sha256 !== 'string' || sha256 === '') {
    throw new Error(`Berkas ${name}: checksum SHA-256 tidak valid`);
  }
  const file: ManifestFile = { name, size, chunks, encrypted, sha256 };
  if (iv !== undefined) {
    if (typeof iv !== 'string' || iv === '') {
      throw new Error(`Berkas ${name}: IV tidak valid`);
    }
    file.iv = iv;
  }
  if (ivs !== undefined) {
    if (!Array.isArray(ivs) || ivs.some(item => typeof item !== 'string' || item === '')) {
      throw new Error(`Berkas ${name}: daftar IV tidak valid`);
    }
    if (ivs.length !== chunks) {
      throw new Error(
        `Berkas ${name}: jumlah IV (${ivs.length}) tidak cocok dengan jumlah potongan (${chunks})`,
      );
    }
    file.ivs = ivs as string[];
  }
  if (encrypted && !file.iv && !file.ivs) {
    throw new Error(`Berkas ${name}: berkas terenkripsi tanpa IV`);
  }
  return file;
}

export function parseManifest(json: string): Manifest {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('manifest.json tidak dapat dibaca (JSON tidak valid)');
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error('manifest.json tidak valid');
  }
  const record = raw as Record<string, unknown>;
  if (record.version !== MANIFEST_VERSION && record.version !== MANIFEST_VERSION_V2) {
    throw new Error(`Versi manifest tidak didukung: ${String(record.version)}`);
  }
  if (typeof record.session_id !== 'string') {
    throw new Error('manifest.json tidak memuat session_id');
  }
  if (typeof record.device !== 'string') {
    throw new Error('manifest.json tidak memuat device');
  }
  if (typeof record.created_at !== 'number') {
    throw new Error('manifest.json tidak memuat created_at');
  }
  if (!Array.isArray(record.files)) {
    throw new Error('manifest.json tidak memuat daftar berkas');
  }
  if (typeof record.total_size !== 'number') {
    throw new Error('manifest.json tidak memuat total_size');
  }
  const files = record.files.map((entry, index) => parseFileEntry(entry, index));
  const manifest: Manifest = {
    sessionId: record.session_id,
    device: record.device,
    createdAt: record.created_at,
    files,
    totalSize: record.total_size,
  };
  if (record.encryption !== undefined) {
    manifest.encryption = parseEncryption(record.encryption);
  }
  return manifest;
}

/** Locate the first manifest in a flat list of picked files by its basename. */
export function findManifestPath(paths: string[]): string | null {
  return paths.find(path => isManifestName(baseName(path))) ?? null;
}

/** Every manifest in a flat list of picked files, in the order they were picked. */
export function findManifestPaths(paths: string[]): string[] {
  return paths.filter(path => isManifestName(baseName(path)));
}

/**
 * A run in zip mode uploads one manifest per archive, so restoring a whole
 * session means picking several. Merge them into one set, keyed by file name so
 * a manifest picked twice does not duplicate an entry.
 */
export function mergeManifests(manifests: Manifest[]): Manifest {
  const first = manifests[0];
  if (!first) {
    throw new Error('Manifest tidak ditemukan di antara berkas yang dipilih');
  }
  const key = (manifest: Manifest): string =>
    manifest.encryption
      ? `${manifest.encryption.kdf}:${manifest.encryption.iterations}:${manifest.encryption.salt}`
      : 'plain';
  for (const manifest of manifests) {
    if (key(manifest) !== key(first)) {
      throw new Error('Manifest dengan parameter enkripsi berbeda tidak dapat digabung');
    }
  }
  const byName = new Map<string, ManifestFile>();
  for (const manifest of manifests) {
    for (const file of manifest.files) {
      const seen = byName.get(file.name);
      if (!seen) {
        byName.set(file.name, file);
        continue;
      }
      // Same name, different content: two runs backed up different files under
      // one name (a deleted photo replaced by another with the same name).
      // Silently keeping the first one lost the other, so refuse the merge and
      // let the user restore each session on its own.
      if (seen.sha256 !== file.sha256 || seen.size !== file.size || seen.chunks !== file.chunks) {
        throw new Error(
          `Dua berkas berbeda memakai nama yang sama: ${file.name}. Pulihkan tiap sesi secara terpisah.`,
        );
      }
    }
  }
  const files = [...byName.values()];
  return {
    ...first,
    files,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
  };
}

export async function loadManifestFromPaths(paths: string[]): Promise<Manifest> {
  const manifestPaths = findManifestPaths(paths);
  if (manifestPaths.length === 0) {
    throw new Error('Manifest tidak ditemukan di antara berkas yang dipilih');
  }
  const manifests: Manifest[] = [];
  for (const path of manifestPaths) {
    manifests.push(parseManifest(await readText(path)));
  }
  return mergeManifests(manifests);
}

/**
 * Read every manifest in a folder. `manifest.json` is checked first for a
 * legacy backup; otherwise the folder is enumerated for `*.manifest.json`.
 */
export async function loadManifestFromFolder(dir: string): Promise<Manifest> {
  const base = dir.replace(/\/+$/, '');
  const legacy = `${base}/${LEGACY_MANIFEST_NAME}`;
  if (await ReactNativeBlobUtil.fs.exists(legacy)) {
    return parseManifest(await readText(legacy));
  }
  const entries = await ReactNativeBlobUtil.fs.ls(base);
  const names = entries
    .map(entry => baseName(String(entry)))
    .filter(isManifestName)
    .sort();
  if (names.length === 0) {
    throw new Error('Manifest tidak ditemukan di folder yang dipilih');
  }
  const manifests: Manifest[] = [];
  for (const name of names) {
    manifests.push(parseManifest(await readText(safeJoin(base, name))));
  }
  return mergeManifests(manifests);
}

/**
 * Map a manifest entry to its parts among a flat list of picked files, matching
 * by basename so `content://`-derived copies resolve the same as real paths.
 */
export function resolveParts(file: ManifestFile, availablePaths: string[]): PartResolution {
  const byName = new Map<string, string>();
  for (const path of availablePaths) {
    byName.set(baseName(path), path);
  }
  const parts: string[] = [];
  const missing: string[] = [];
  for (let index = 1; index <= file.chunks; index += 1) {
    const name = chunkName(file.name, index);
    const path = byName.get(name);
    if (path !== undefined) {
      parts.push(path);
    } else {
      missing.push(name);
    }
  }
  return { parts, missing };
}

/**
 * Concatenate parts in ascending order. `'uri'` copies the source file through
 * the native layer in bounded blocks, so parts far larger than one JS read never
 * enter the JS heap.
 */
export async function joinChunks(parts: string[], outPath: string): Promise<void> {
  if (parts.length === 0) {
    throw new Error('Tidak ada potongan untuk digabung');
  }
  await ReactNativeBlobUtil.fs.unlink(outPath).catch(() => undefined);
  for (const part of parts) {
    await ReactNativeBlobUtil.fs.appendFile(outPath, part, 'uri');
  }
}

type Resolver = (file: ManifestFile) => PartResolution | Promise<PartResolution>;

async function restoreEntries(
  manifest: Manifest,
  outDir: string,
  options: RestoreOptions,
  resolve: Resolver,
): Promise<RestoreResult> {
  await ReactNativeBlobUtil.fs.mkdir(outDir).catch(() => undefined);
  const tempDir = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/restore_${Date.now()}`;
  await ReactNativeBlobUtil.fs.mkdir(tempDir).catch(() => undefined);
  trackTempDir(tempDir);

  const total = manifest.files.length;
  const files: RestoreFileResult[] = [];
  // v2 parts are encrypted one by one, so the key is derived once per manifest
  // instead of once per part (210k PBKDF2 iterations each).
  let runKey: Uint8Array | null = null;
  const keyFor = (): Uint8Array => {
    if (!manifest.encryption) {
      throw new Error('Manifest tidak memuat parameter enkripsi');
    }
    if (!options.passphrase) {
      throw new Error('Passphrase diperlukan untuk membuka berkas terenkripsi');
    }
    runKey ??= keyFromPassphrase(
      options.passphrase,
      manifest.encryption.salt,
      manifest.encryption.iterations,
    );
    return runKey;
  };

  for (let index = 0; index < total; index += 1) {
    const file = manifest.files[index];
    const emit = (phase: RestorePhase) =>
      options.onProgress?.({ file: file.name, index: index + 1, total, phase });
    try {
      const { parts, missing } = await resolve(file);
      if (missing.length > 0) {
        throw new Error(`Potongan hilang: ${missing.join(', ')}`);
      }

      let joined = '';
      let verified = '';
      if (file.encrypted && file.ivs) {
        // v2: every part is its own AES-GCM message, so decrypt each part with
        // its IV, append the plaintext, and verify the reassembled file.
        const key = keyFor();
        emit('joining');
        joined = safeJoin(tempDir, file.name);
        await ReactNativeBlobUtil.fs.unlink(joined).catch(() => undefined);
        for (let part = 0; part < parts.length; part += 1) {
          const iv: string | undefined = file.ivs[part];
          if (iv === undefined) {
            throw new Error(`IV potongan ${part + 1} hilang di manifest`);
          }
          emit('decrypting');
          const plain = safeJoin(tempDir, `${file.name}.${part + 1}.part`);
          try {
            await decryptFileWithKey(parts[part], key, iv, plain);
          } catch {
            throw new Error('Passphrase salah atau berkas rusak (gagal autentikasi AES-GCM)');
          }
          await ReactNativeBlobUtil.fs.appendFile(joined, plain, 'uri');
          await ReactNativeBlobUtil.fs.unlink(plain).catch(() => undefined);
        }
        emit('verifying');
        const hash = await sha256File(joined);
        if (hash.toLowerCase() !== file.sha256.toLowerCase()) {
          throw new Error('Checksum SHA-256 tidak cocok, berkas mungkin rusak');
        }
        verified = joined;
      } else {
        emit('joining');
        joined = safeJoin(tempDir, file.name);
        await joinChunks(parts, joined);

        emit('verifying');
        const hash = await sha256File(joined);
        if (hash.toLowerCase() !== file.sha256.toLowerCase()) {
          throw new Error('Checksum SHA-256 tidak cocok, berkas mungkin rusak');
        }

        verified = joined;
        if (file.encrypted) {
          // v1 backup: the whole archive was one AES-GCM message.
          if (!manifest.encryption) {
            throw new Error('Manifest tidak memuat parameter enkripsi');
          }
          if (!file.iv) {
            throw new Error('Berkas terenkripsi tanpa IV');
          }
          if (!options.passphrase) {
            throw new Error('Passphrase diperlukan untuk membuka berkas terenkripsi');
          }
          emit('decrypting');
          const decrypted = safeJoin(tempDir, stripEnc(file.name));
          try {
            await decryptFile(
              joined,
              options.passphrase,
              manifest.encryption.salt,
              file.iv,
              decrypted,
              manifest.encryption.iterations,
            );
          } catch {
            throw new Error('Passphrase salah atau berkas rusak (gagal autentikasi AES-GCM)');
          }
          verified = decrypted;
        }
      }

      const outputName = stripEnc(file.name);
      if (outputName.toLowerCase().endsWith('.zip')) {
        // Keep the archive itself as the saveable result; extraction is a bonus.
        const archive = safeJoin(outDir, outputName);
        await joinChunks([verified], archive);
        emit('extracting');
        const extracted = safeJoin(outDir, outputName.replace(/\.zip$/i, ''));
        await ReactNativeBlobUtil.fs.mkdir(extracted).catch(() => undefined);
        // Zip-slip: entry names come from an archive downloaded from the Telegram
        // chat, but the library validates each entry before writing — Android
        // ZipSecurity.validateExtractPath (canonical-path prefix) and iOS
        // isSafeExtractPath (standardized-path prefix) in 9.5.x. If this
        // dependency ever gets a major upgrade, re-verify that behavior.
        await unzip(archive, extracted);
        files.push({
          name: file.name,
          status: 'ok',
          outputPath: archive,
          extractedPath: extracted,
        });
      } else {
        const outputPath = safeJoin(outDir, outputName);
        await joinChunks([verified], outputPath);
        files.push({ name: file.name, status: 'ok', outputPath });
      }

      await ReactNativeBlobUtil.fs.unlink(verified).catch(() => undefined);
      if (verified !== joined) {
        await ReactNativeBlobUtil.fs.unlink(joined).catch(() => undefined);
      }
    } catch (error) {
      files.push({ name: file.name, status: 'failed', error: messageOf(error) });
    }
  }

  await ReactNativeBlobUtil.fs.unlink(tempDir).catch(() => undefined);
  untrackTempDir(tempDir);

  const succeeded = files.filter(file => file.status === 'ok').length;
  const failed = files.length - succeeded;
  const status: RestoreResult['status'] =
    failed === 0 ? 'success' : succeeded === 0 ? 'failed' : 'partial';
  options.onProgress?.({ file: '', index: total, total, phase: 'done' });
  return { status, files, total, succeeded, failed };
}

/** Restore from a directory that holds a manifest and the chunk files (iOS / `file://`). */
export async function restoreFromFolder(
  dir: string,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  const base = dir.replace(/\/+$/, '');
  const manifest = await loadManifestFromFolder(base);
  const outDir = options.outputDir ?? `${base}/restored`;
  return restoreEntries(manifest, outDir, options, async file => {
    const parts: string[] = [];
    const missing: string[] = [];
    for (let index = 1; index <= file.chunks; index += 1) {
      const name = chunkName(file.name, index);
      const path = safeJoin(base, name);
      if (await ReactNativeBlobUtil.fs.exists(path)) {
        parts.push(path);
      } else {
        missing.push(name);
      }
    }
    return { parts, missing };
  });
}

/**
 * Restore from a flat list of local file paths — the result of picking files and
 * converting each `content://` uri with `keepLocalCopy`. The manifest is located
 * by basename and every part is matched by basename, so nothing depends on a
 * directory the app cannot enumerate on Android.
 */
export async function restoreFromFiles(
  paths: string[],
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  const manifest = await loadManifestFromPaths(paths);
  // ponytail: cache is always writable; the caller hands the result to
  // saveDocuments. Upgrade path: let the caller pass a DocumentDir subpath.
  const outDir = options.outputDir ?? `${ReactNativeBlobUtil.fs.dirs.CacheDir}/restored`;
  return restoreEntries(manifest, outDir, options, file => resolveParts(file, paths));
}

import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { chunkFile, chunkName, cleanupChunks, MAX_CHUNK_SIZE, type ChunkFile } from './chunker';
import {
  encryptFileWithKey,
  isCryptoAvailable,
  keyFromPassphrase,
  MAX_ENCRYPTED_PART_SIZE,
  newSaltB64,
} from './crypto';
import { scanCategory, scanCustomFolders, ensureLocalPath, type ScanResult } from './fileScanner';
import { sha256File } from './hasher';
import { needsBackup } from './incremental';
import {
  createManifest,
  manifestFileName,
  manifestToJson,
  reassembleScriptName,
  reassemblyScripts,
  type ManifestEncryption,
  type ManifestFile,
} from './manifest';
import { requestBackupPermissions } from './permissions';
import { is7zAvailable, zipFiles } from './zipper';
import { sendDocumentWithRetry } from './uploadRetry';
import { trackTempDir, untrackTempDir } from './tempDirs';
import { filesRepo } from '../db/repositories/files';
import { sessionsRepo } from '../db/repositories/sessions';
import { chunksRepo } from '../db/repositories/chunks';
import { TelegramBotApi, type SendResult } from '../net/telegramApi';
import { secureStore } from '../state/secureStore';
import { getConfig } from '../state/settingsStore';
import { CATEGORY_NAMES_ID, Category, type CategoryKey } from '../types/models';

export type BackupProgress = {
  phase: 'scanning' | 'zipping' | 'uploading' | 'manifest' | 'done';
  category?: string;
  current: number;
  total: number;
  /** Whole-run counter: monotonic, never above `total`, reaches it on `done`. */
  overall: { current: number; total: number };
};

export type BackupResult = {
  status: 'success' | 'partial' | 'failed';
  chunksSent: number;
  files: number;
  totalSize: number;
  /** Files found this run but postponed by `maxFilesPerRun`. */
  deferred: number;
  error?: string;
  /**
   * Non-fatal observations the user should see (a category that read no files,
   * for instance). Present only when there is something to say.
   */
  notes?: string[];
};

const DEVICE = (() => {
  const constants = Platform.constants as { Manufacturer?: string; Model?: string };
  return `${constants?.Manufacturer ?? Platform.OS} ${constants?.Model ?? ''}`.trim();
})();

const PBKDF2_ITERATIONS = 210000;

/**
 * PRD §11/§19 lock auto-delete of chunked sources OFF for v1. Gated here as
 * well as in the UI so a config persisted by an older build cannot delete
 * originals; flip to `true` (and re-enable the toggle) when v2 ships it.
 */
const ALLOW_LOCAL_DELETE: boolean = false;

/** PRD §14: 1 req/sec throttle between successful chunk uploads. */
const CHUNK_THROTTLE_MS = 1000;

/**
 * PRD §14 / §21 gap #7: `CacheDir` holds the localized `content://` copies, the
 * category zip, the chunk slices and (with encryption) the whole `.enc` archive
 * at once, with nothing checking free space. Staging one category peaks at
 * roughly two copies of its source bytes — the zip plus the slices cut from it —
 * so the pre-flight check asks for `2 x bytes + margin`. The margin absorbs the
 * localized copies and the encrypted archive; it is deliberately not `4 x` so a
 * legitimate run on a tight device is not blocked.
 */
const STAGING_SPACE_COPIES = 2;
const STAGING_SPACE_MARGIN_BYTES = 64 * 1024 * 1024;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Free bytes on the volume `CacheDir` lives on, or `null` when it cannot be
 * measured. Android reports the app-internal volume (the same one `CacheDir` is
 * on) as a string under `internal_free`; iOS reports a number under `free`.
 * `df()` is not implemented on every platform/emulator, so an unmeasurable
 * value passes the check instead of blocking the run.
 */
async function freeSpaceBytes(): Promise<number | null> {
  try {
    const df = await ReactNativeBlobUtil.fs.df();
    const raw = df.internal_free ?? df.free;
    const free = Number(raw);
    return Number.isFinite(free) && free >= 0 ? free : null;
  } catch {
    return null;
  }
}

/**
 * Loaded when the JS process boots, so any session already marked `running`
 * when this is read was left behind by a process that died mid-run.
 */
export const PROCESS_START = Date.now();

function baseName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

function mimeFor(name: string): string {
  if (name.endsWith('.zip')) return 'application/zip';
  if (name.endsWith('.enc')) return 'application/octet-stream';
  return 'application/octet-stream';
}

/**
 * One bounded reason for the session row: History shows a single line, and a
 * run can lose hundreds of parts.
 */
export function summarizeErrors(errors: string[]): string | null {
  if (errors.length === 0) {
    return null;
  }
  const head = errors.slice(0, 3).join('; ');
  const rest = errors.length > 3 ? ` (+${errors.length - 3} lainnya)` : '';
  const text = `${head}${rest}`;
  return text.length > 500 ? `${text.slice(0, 497)}\u2026` : text;
}

/**
 * ponytail: destructive + irreversible. Only ever invoked for Category.CUSTOM
 * (watched folders), never CameraRoll photos/videos or the Documents tree, and
 * only after a chunk upload + filesRepo.markBackup succeeded. Each unlink is
 * isolated so one failure cannot abort the run.
 */
async function deleteLocalOriginals(items: ScanResult[]): Promise<void> {
  for (const item of items) {
    try {
      await ReactNativeBlobUtil.fs.unlink(item.path);
    } catch {
      // file already gone or locked; keep going
    }
  }
}

export async function runBackup(
  onProgress?: (progress: BackupProgress) => void,
): Promise<BackupResult> {
  const credentials = await secureStore.get();
  if (!credentials.botToken.trim() || !credentials.chatId.trim()) {
    return { status: 'failed', chunksSent: 0, files: 0, totalSize: 0, deferred: 0, error: 'Not configured' };
  }

  const config = getConfig();

  const permissions = await requestBackupPermissions(config.categories);
  if (!permissions.granted) {
    return {
      status: 'failed',
      chunksSent: 0,
      files: 0,
      totalSize: 0,
      deferred: 0,
      error: `Missing permissions: ${permissions.denied.join(', ')}`,
    };
  }

  if (config.archiveFormat === '7z' && !is7zAvailable()) {
    return {
      status: 'failed',
      chunksSent: 0,
      files: 0,
      totalSize: 0,
      deferred: 0,
      error: '7z tidak tersedia di build ini',
    };
  }

  // P1-8: never upload plaintext under an "encrypted" banner. If the user turned
  // encryption on, refuse the run instead of silently downgrading.
  if (config.encryptionEnabled && credentials.encryptionPassword.trim() === '') {
    return {
      status: 'failed',
      chunksSent: 0,
      files: 0,
      totalSize: 0,
      deferred: 0,
      error: 'Enkripsi aktif tetapi passphrase belum diatur. Atur passphrase di Pengaturan.',
    };
  }

  if (config.encryptionEnabled && !isCryptoAvailable()) {
    return {
      status: 'failed',
      chunksSent: 0,
      files: 0,
      totalSize: 0,
      deferred: 0,
      error: 'Enkripsi aktif tetapi modul kripto tidak tersedia di build ini.',
    };
  }

  const silent = config.silentNotifications;

  const api = new TelegramBotApi(credentials.botToken, credentials.chatId);
  const categories = config.categories.filter(
    category => category !== Category.CONTACT && category !== Category.SMS,
  );

  await sessionsRepo.failStaleRunning(PROCESS_START);
  const sessionId = await sessionsRepo.insert({
    startedAt: Date.now(),
    category: categories.join(','),
    status: 'running',
  });

  const stagingDir = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/staging_${sessionId}`;
  await ReactNativeBlobUtil.fs.mkdir(stagingDir).catch(() => undefined);
  trackTempDir(stagingDir);

  const wantEncryption = config.encryptionEnabled;
  const saltB64 = config.encryptionSalt || newSaltB64();
  const manifestEncryption: ManifestEncryption | undefined = wantEncryption
    ? { algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: PBKDF2_ITERATIONS, salt: saltB64 }
    : undefined;
  // Derive the run key once: 210k PBKDF2 iterations per 49 MB part would cost
  // seconds on a large archive for the same salt and passphrase (P0-1).
  const key = wantEncryption
    ? keyFromPassphrase(credentials.encryptionPassword, saltB64, PBKDF2_ITERATIONS)
    : null;

  let totalSent = 0;
  let totalChunks = 0;
  let skippedChunks = 0;
  let totalSize = 0;
  let totalFiles = 0;
  let deferred = 0;
  let failure = false;
  const errors: string[] = [];
  const notes: string[] = [];
  // Upload names must be unique across the run: two photos called IMG_0001.jpg
  // in different folders produced two manifest entries with the same name and
  // identical part names, so the restore matched one part set for both, dropped
  // the other entry while merging and overwrote the output path (P0-3).
  const usedNames = new Set<string>();
  const uniqueName = (name: string): string => {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let n = 2; ; n += 1) {
      const candidate = `${stem} (${n})${ext}`;
      if (!usedNames.has(candidate)) {
        usedNames.add(candidate);
        return candidate;
      }
    }
  };
  const manifestFiles: ManifestFile[] = [];
  // One manifest per archive in zip mode, named after that archive, so a
  // downloaded manifest and its scripts say which zip they belong to.
  const archiveGroups: { base: string; files: ManifestFile[] }[] = [];
  // Real uploaded artifact names; joined for the session's archive_name.
  const archiveNames: string[] = [];
  // P0-2: a file is recorded as backed up only after the manifest that names its
  // archive has been delivered. Collect the marks here, apply them once
  // `manifestId` is set; a manifest failure leaves every file pending.
  const pendingMarks: {
    path: string;
    hash: string;
    backupTime: number;
    modifiedAt: number;
  }[] = [];
  const pendingDeletes: ScanResult[] = [];

  // Feature A: one honest counter for the whole run, measured in files. `total`
  // is how many source files this run will process, known once every category has
  // been scanned. `current` may be fractional: files finished plus the fraction of
  // the in-flight archive already sent to Telegram, so the bar moves inside a
  // 49 MB chunk instead of sitting still. `setOverall` only ever grows, so the
  // ring never rewinds — a retried chunk restarts its byte count from zero.
  let overallCurrent = 0;
  let overallTotal = 0;
  const emit = (
    phase: BackupProgress['phase'],
    category: CategoryKey | undefined,
    current: number,
    total: number,
  ): void => {
    onProgress?.({
      phase,
      category,
      current,
      total,
      overall: { current: overallCurrent, total: overallTotal },
    });
  };
  const setOverall = (value: number): void => {
    overallCurrent = Math.max(overallCurrent, Math.min(overallTotal, value));
  };

  /**
   * Slice one archive into upload parts, encrypt each part on its own when
   * encryption is on, and send them. `entryName` is the name of the reassembled
   * file in the manifest (ending in `.enc` when encrypted); every part is
   * uploaded as `chunkName(entryName, index)` so both the reassembly script and
   * the restore find it back by name.
   *
   * Encrypting per part keeps peak RAM at one part instead of the whole archive,
   * which is what the old whole-archive encryption needed and what killed the
   * app on real photo libraries (P0-1). Encrypted parts are smaller than the Bot
   * API limit because the JS crypto path needs several copies of one part.
   */
  const uploadParts = async (
    sourcePath: string,
    entryName: string,
    category: CategoryKey,
    progressOf: (chunkIndex: number, chunkCount: number) => { current: number; total: number },
    /** Fraction (0–1) of the whole archive sent so far, across every chunk. */
    onBytes?: (fraction: number) => void,
  ): Promise<{ chunks: ChunkFile[]; failed: ChunkFile[]; ivs: string[] }> => {
    const chunks = await chunkFile(
      sourcePath,
      key ? MAX_ENCRYPTED_PART_SIZE : MAX_CHUNK_SIZE,
      stagingDir,
    );
    const chunkIds = new Map<number, number>();
    for (const chunk of chunks) {
      const rowId = await chunksRepo.insert({
        sessionId,
        chunkIndex: chunk.index,
        size: chunk.size,
      });
      chunkIds.set(chunk.index, rowId);
    }
    totalChunks += chunks.length;
    // P2: publish the growing chunk total so an in-run "n / chunks_total"
    // display never divides by zero.
    await sessionsRepo.updateChunksTotal(sessionId, totalChunks);

    const failed: ChunkFile[] = [];
    const ivs: string[] = [];
    for (const chunk of chunks) {
      const caption =
        chunks.length === 1 ? entryName : `${entryName} part ${chunk.index}/${chunks.length}`;
      // The manifest stores `entryName` plus the part count, and the
      // reassembly scripts rebuild `<entryName>` from `<entryName>.001`…, so
      // every part carries that name — a single part included.
      const partName = chunkName(entryName, chunk.index);
      // `chunk.index` is 1-based, so the chunks already sent are `index - 1`.
      const sentBefore = chunk.index - 1;
      const reportBytes = onBytes
        ? (sent: number, total: number): void => {
            const within = total > 0 ? Math.min(1, sent / total) : 0;
            onBytes((sentBefore + within) / chunks.length);
            // Re-emit so the screen and the notification see the in-flight byte
            // position, not only the moment a chunk finished.
            const progress = progressOf(chunk.index, chunks.length);
            emit('uploading', category, progress.current, progress.total);
          }
        : undefined;
      // The ciphertext lives in staging until it has been sent; the plaintext
      // part stays until the category is done (cleanupChunks unlinks it).
      let uploadPath = chunk.path;
      if (key) {
        const encPath = `${stagingDir}/${partName}.enc`;
        ivs[chunk.index - 1] = (await encryptFileWithKey(chunk.path, key, encPath)).ivB64;
        uploadPath = encPath;
      }
      let result: SendResult;
      try {
        result = await sendDocumentWithRetry(
          api,
          { path: uploadPath, name: partName, mime: mimeFor(entryName) },
          caption,
          silent,
          reportBytes,
        );
      } catch (error) {
        // PRD §14: retried 3x already; skip this chunk and keep the run going.
        skippedChunks += 1;
        failed.push(chunk);
        errors.push(
          `${category}: potongan ${partName} gagal diunggah (${
            error instanceof Error ? error.message : String(error)
          })`,
        );
        continue;
      } finally {
        if (uploadPath !== chunk.path) {
          await ReactNativeBlobUtil.fs.unlink(uploadPath).catch(() => undefined);
        }
      }
      const rowId = chunkIds.get(chunk.index);
      if (rowId !== undefined) {
        await chunksRepo.markUploaded(rowId, result.messageId, Date.now());
      }
      totalSent += 1;
      await sessionsRepo.updateChunksSent(sessionId, totalSent);
      const progress = progressOf(chunk.index, chunks.length);
      emit('uploading', category, progress.current, progress.total);
      // ponytail: fixed 1s throttle keeps under Bot API ~30 msg/s; a 429 now
      // backs off per Retry-After inside sendDocumentWithRetry.
      await sleep(CHUNK_THROTTLE_MS);
    }
    return { chunks, failed, ivs };
  };

  /**
   * Hash the archive, then slice + encrypt + upload it. The hash covers the
   * file the user gets back from a restore (the plaintext archive), so a v2
   * manifest entry can be verified after decryption and reassembly.
   */
  const stageAndUpload = async (
    sourcePath: string,
    entryName: string,
    category: CategoryKey,
    progressOf: (chunkIndex: number, chunkCount: number) => { current: number; total: number },
    onBytes?: (fraction: number) => void,
  ): Promise<{
    chunks: ChunkFile[];
    failed: ChunkFile[];
    ivs: string[];
    hash: string;
    size: number;
  }> => {
    const hash = await sha256File(sourcePath);
    const size = (await ReactNativeBlobUtil.fs.stat(sourcePath)).size;
    const { chunks, failed, ivs } = await uploadParts(
      sourcePath,
      entryName,
      category,
      progressOf,
      onBytes,
    );
    return { chunks, failed, ivs, hash, size };
  };

  // Pass 1 — scan every selected category, record each scanned file, and build
  // the run's whole work list before any upload. Knowing the list up front is
  // what makes the overall counter honest and lets a capped run defer the rest.
  type QueuedFile = { item: ScanResult; uploadName: string };
  type Queued = { category: CategoryKey; pending: QueuedFile[] };
  const queue: Queued[] = [];
  // One read of the tracking table instead of two queries per scanned file: a
  // large library spent minutes in SQLite round-trips before any upload (P1-9).
  const trackedRows = await filesRepo.listAll();
  const tracked = new Map(trackedRows.map(row => [row.path, row]));
  const trackedPerCategory = new Map<string, number>();
  for (const row of trackedRows) {
    trackedPerCategory.set(row.category, (trackedPerCategory.get(row.category) ?? 0) + 1);
  }
  for (const category of categories) {
    const customUris = config.watchedFolders.map(folder => folder.uri);
    if (category === Category.CUSTOM && customUris.length === 0 && !config.customFolderUri) {
      continue;
    }
    try {
      emit('scanning', category, 0, 0);
      const scanned =
        category === Category.CUSTOM && customUris.length > 0
          ? await scanCustomFolders(customUris)
          : await scanCategory(category, config.customFolderUri);

      // A category that reads nothing is not an error, but it must not look
      // like a successful backup either. Only speak up when it matters: DOC on
      // Android 11+ legitimately sees nothing (scoped storage), and a category
      // that used to hold tracked files is a real regression. An empty gallery
      // stays quiet instead of nagging on every run (P1-7).
      if (scanned.length === 0) {
        const trackedHere = trackedPerCategory.get(category) ?? 0;
        if (category === Category.DOC) {
          notes.push('Dokumen: 0 berkas terbaca. Android 11+ membatasi akses folder Download.');
        } else if (trackedHere > 0) {
          notes.push(`${CATEGORY_NAMES_ID[category]}: 0 berkas terbaca, padahal sebelumnya ada.`);
        }
      }

      const pending: QueuedFile[] = [];
      const rows: { path: string; category: string; size: number; modifiedAt: number }[] = [];
      for (const item of scanned) {
        if (needsBackup(tracked.get(item.path) ?? null, item)) {
          // The name is fixed here, before anything is uploaded, so the same
          // file keeps the same part names on every retry of this run.
          pending.push({ item, uploadName: uniqueName(item.displayName) });
        }
        rows.push({
          path: item.path,
          category: item.category,
          size: item.size,
          modifiedAt: item.modifiedAt,
        });
      }
      await filesRepo.upsertMany(rows);
      if (pending.length === 0) {
        continue;
      }
      // Feature B: cap this category's share of the run, keeping scan order.
      // The excess stays `pending` in the DB (needsBackup returns true while
      // last_backup is NULL) and the next run picks it up.
      const cap = Math.max(1, Math.floor(config.maxFilesPerRun));
      const capped = pending.slice(0, cap);
      deferred += pending.length - capped.length;
      queue.push({ category, pending: capped });
      overallTotal += capped.length;
    } catch (error) {
      failure = true;
      errors.push(`${category}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Pass 2 — process the queue. Every file counted in `overallTotal` is handled
  // here, so the overall counter reaches the total on the final event.
  for (const { category, pending } of queue) {
    const localized: string[] = [];
    // Files already finished before this category; byte progress is reported as an
    // offset from here so a category archive moves the bar by its own file count.
    const categoryBase = overallCurrent;
    try {
      // P2-i: fail the category before staging rather than filling the disk.
      const stagedBytes = pending.reduce((sum, entry) => sum + entry.item.size, 0);
      const free = await freeSpaceBytes();
      if (free !== null && free < stagedBytes * STAGING_SPACE_COPIES + STAGING_SPACE_MARGIN_BYTES) {
        throw new Error(
          'Ruang penyimpanan tidak cukup untuk menyiapkan arsip. Kosongkan sebagian ruang lalu coba lagi.',
        );
      }
      if (config.compressZip) {
        const zipName = uniqueName(`${category}_${Date.now()}.zip`);
        const zipPath = `${stagingDir}/${zipName}`;
        emit('zipping', category, 0, pending.length);
        const zipSources: string[] = [];
        const sourceHashes = new Map<string, string>();
        for (const { item } of pending) {
          const local = await ensureLocalPath(item.path);
          if (local !== item.path) {
            localized.push(local);
          }
          zipSources.push(local);
          // PRD §5.6: files.hash describes the source file, not the archive.
          sourceHashes.set(item.path, await sha256File(local));
        }
        await zipFiles(zipSources, zipPath);

        const entryName = wantEncryption ? `${zipName}.enc` : zipName;
        const { chunks, failed, ivs, hash, size } = await stageAndUpload(
          zipPath,
          entryName,
          category,
          (index, count) => ({ current: index, total: count }),
          fraction => setOverall(categoryBase + pending.length * fraction),
        );
        // ponytail: an incomplete archive is left out of the manifest entirely.
        // The manifest format is fixed and every entry it holds is assumed
        // complete (reassembly enumerates all `chunks` parts), so a partial
        // entry would need a format change to stay unambiguous. Its source files
        // are never marked backed up (P0-2 defers the mark to the manifest), so
        // they stay pending and the next run re-scans and retries them.
        if (failed.length === 0) {
          const entry: ManifestFile = {
            name: entryName,
            size,
            chunks: chunks.length,
            encrypted: wantEncryption,
            sha256: hash,
          };
          if (wantEncryption) {
            entry.ivs = ivs;
          }
          manifestFiles.push(entry);
          archiveNames.push(entry.name);
          archiveGroups.push({ base: entry.name, files: [entry] });
          totalSize += size;
          totalFiles += pending.length;

          const backupTime = Date.now();
          for (const { item } of pending) {
            pendingMarks.push({
              path: item.path,
              hash: sourceHashes.get(item.path) ?? '',
              backupTime,
              modifiedAt: item.modifiedAt,
            });
          }

          if (ALLOW_LOCAL_DELETE && config.deleteLocalAfterBackup && category === Category.CUSTOM) {
            pendingDeletes.push(...pending.map(entry => entry.item));
          }
        }

        await cleanupChunks(chunks, zipPath);
        setOverall(categoryBase + pending.length);
      } else {
        for (let index = 0; index < pending.length; index += 1) {
          const { item, uploadName } = pending[index];
          const fileBase = overallCurrent;
          const local = await ensureLocalPath(item.path);
          if (local !== item.path) {
            localized.push(local);
          }
          const sourceHash = await sha256File(local);
          const entryName = wantEncryption ? `${uploadName}.enc` : uploadName;
          const { chunks, failed, ivs, hash, size } = await stageAndUpload(
            local,
            entryName,
            category,
            () => ({ current: index + 1, total: pending.length }),
            fraction => setOverall(fileBase + fraction),
          );

          // Same rule as the compressed path: a file whose upload lost a part is
          // never marked backed up, so its source stays pending and is retried
          // on the next run.
          if (failed.length === 0) {
            const entry: ManifestFile = {
              name: entryName,
              size,
              chunks: chunks.length,
              encrypted: wantEncryption,
              sha256: hash,
            };
            if (wantEncryption) {
              entry.ivs = ivs;
            }
            manifestFiles.push(entry);
            archiveNames.push(entry.name);
            totalSize += size;
            totalFiles += 1;
            pendingMarks.push({
              path: item.path,
              hash: sourceHash,
              backupTime: Date.now(),
              modifiedAt: item.modifiedAt,
            });
            if (ALLOW_LOCAL_DELETE && config.deleteLocalAfterBackup && category === Category.CUSTOM) {
              pendingDeletes.push(item);
            }
          }
          await cleanupChunks(chunks, local);
          setOverall(fileBase + 1);
        }
      }
    } catch (error) {
      failure = true;
      errors.push(`${category}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      for (const local of localized) {
        await ReactNativeBlobUtil.fs.unlink(local).catch(() => undefined);
      }
    }
  }

  let manifestId: string | null = null;
  if (manifestFiles.length > 0) {
    // Zip mode: one manifest + scripts per archive, named after the archive.
    // Uncompressed mode: one manifest for the run, named after its session.
    const groups: { base: string; files: ManifestFile[] }[] = config.compressZip
      ? archiveGroups
      : [{ base: `session_${sessionId}`, files: manifestFiles }];
    try {
      const metaDir = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/meta_${sessionId}`;
      await ReactNativeBlobUtil.fs.mkdir(metaDir).catch(() => undefined);
      const sentIds: string[] = [];
      for (let index = 0; index < groups.length; index += 1) {
        emit('manifest', undefined, index, groups.length);
        const group = groups[index];
        const manifest = createManifest(
          DEVICE,
          Date.now(),
          group.files,
          String(sessionId),
          manifestEncryption,
        );
        const manifestName = manifestFileName(group.base);
        const shPath = `${metaDir}/${reassembleScriptName(group.base, 'sh')}`;
        const batPath = `${metaDir}/${reassembleScriptName(group.base, 'bat')}`;
        const manifestPath = `${metaDir}/${manifestName}`;
        const scripts = reassemblyScripts(manifest, manifestName);
        await ReactNativeBlobUtil.fs.writeFile(shPath, scripts.sh, 'utf8');
        await ReactNativeBlobUtil.fs.writeFile(batPath, scripts.bat, 'utf8');
        await ReactNativeBlobUtil.fs.writeFile(manifestPath, manifestToJson(manifest), 'utf8');

        await api.sendDocument(
          { path: shPath, name: baseName(shPath), mime: 'text/x-shellscript' },
          undefined,
          undefined,
          silent,
        );
        await api.sendDocument(
          { path: batPath, name: baseName(batPath), mime: 'application/x-bat' },
          undefined,
          undefined,
          silent,
        );
        const manifestResult = await api.sendDocument(
          { path: manifestPath, name: manifestName, mime: 'application/json' },
          `Manifest for ${group.base}`,
          undefined,
          silent,
        );
        sentIds.push(String(manifestResult.messageId));
      }
      emit('manifest', undefined, groups.length, groups.length);
      // A zip run sends one manifest per archive; keep every id so Stats can
      // deep-link as many messages as the run produced (P2-6).
      manifestId = sentIds.length > 0 ? sentIds.join(',') : null;
      await ReactNativeBlobUtil.fs.unlink(metaDir).catch(() => undefined);
    } catch (error) {
      failure = true;
      errors.push(`manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // P0-2: apply the deferred marks only now that the manifest naming these
  // archives was delivered. A manifest failure leaves every file pending, so
  // the next run retries them instead of orphaning them in Telegram.
  if (manifestId !== null) {
    try {
      for (const mark of pendingMarks) {
        await filesRepo.markBackup(mark.path, mark.hash, mark.backupTime, mark.modifiedAt);
      }
      if (ALLOW_LOCAL_DELETE && config.deleteLocalAfterBackup && pendingDeletes.length > 0) {
        await deleteLocalOriginals(pendingDeletes);
      }
    } catch (error) {
      // A repo write must not escape the run and leave the session `running`;
      // an unmarked file simply stays pending and is retried next run.
      failure = true;
      errors.push(`mark: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // A run where every file was already backed up uploads nothing and records no
  // error; that is not a failure. A run that uploaded chunks but produced no
  // manifest entry has nothing restorable, so it failed outright. A skipped
  // chunk in an otherwise manifest-bearing run leaves the archive incomplete
  // but the run continues, so it is a partial run, not a failed one.
  const nothingRestorable = manifestFiles.length === 0 && (totalSent > 0 || skippedChunks > 0);
  const status: BackupResult['status'] =
    failure || nothingRestorable
      ? manifestFiles.length === 0
        ? 'failed'
        : 'partial'
      : skippedChunks > 0
        ? 'partial'
        : 'success';
  // Multi-category runs join their real artifact names; single-category runs
  // record the one real name. No name is fabricated.
  const archiveName = archiveNames.length > 0 ? archiveNames.join(', ') : null;
  await sessionsRepo.finishSession(
    sessionId,
    Date.now(),
    totalFiles,
    totalSize,
    totalChunks,
    totalSent,
    status,
    manifestId,
    archiveName,
    wantEncryption ? 1 : 0,
    summarizeErrors(errors),
    config.archiveFormat,
  );

  await ReactNativeBlobUtil.fs.unlink(stagingDir).catch(() => undefined);
  untrackTempDir(stagingDir);

  const suppressFailure = status === 'failed' && !config.alertOnFailure;
  if (config.notifyBotSummary && !suppressFailure) {
    try {
      const skippedNote = skippedChunks > 0 ? ` ${skippedChunks} potongan terlewat.` : '';
      const notesNote = notes.length > 0 ? ` ${notes.join(' ')}` : '';
      await api.sendMessage(
        `Backup ${status}. ${totalSent} chunks uploaded, ${totalFiles} files, ${Math.round(
          totalSize / 1024,
        )} KB total.${skippedNote}${notesNote}`,
        silent,
      );
    } catch {
      // summary message is best-effort
    }
  }

  overallCurrent = overallTotal;
  emit('done', undefined, totalSent, totalSent);
  return {
    status,
    chunksSent: totalSent,
    files: totalFiles,
    totalSize,
    deferred,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    ...(notes.length > 0 ? { notes } : {}),
  };
}

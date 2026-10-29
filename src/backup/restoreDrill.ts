import ReactNativeBlobUtil from 'react-native-blob-util';
import { TelegramBotApi } from '../net/telegramApi';
import { sessionsRepo } from '../db/repositories/sessions';
import { chunksRepo, type StoredPart } from '../db/repositories/chunks';
import { secureStore } from '../state/secureStore';
import { restoreFromTelegram } from './restoreRunner';
import { trackTempDir, untrackTempDir } from './tempDirs';
import { logError } from '../state/errorLog';

export type DrillResult = {
  ok: boolean;
  /** Files restored and hash-verified in the sandbox. */
  files: number;
  message: string;
};

/**
 * Restores a single smallest complete archive or direct entry into a throwaway
 * cache dir and deletes it. Every entry's SHA-256 is verified by the restore
 * runner itself, so a pass here proves the backup on Telegram is genuinely
 * recoverable — the backup that was never test-restored is a hope, not a
 * backup.
 *
 * A run that restored a whole session could burn hundreds of downloads just to
 * prove one of them works, and a single entry whose part lacks a local
 * `file_id` used to fail the whole drill with a raw "Potongan hilang". Both are
 * fixed here: the drill restores at most one entry, and only an entry whose
 * every part still has a stored `file_id`; bolong sessions are skipped, not
 * failed.
 */
export async function runRestoreDrill(
  onProgress?: (phase: string) => void,
): Promise<DrillResult> {
  const sessions = await sessionsRepo.recentRestorable(50);
  if (sessions.length === 0) {
    return { ok: false, files: 0, message: 'Belum ada backup yang bisa dipulihkan.' };
  }
  const credentials = await secureStore.get();
  if (!credentials.botToken.trim() || !credentials.chatId.trim()) {
    return { ok: false, files: 0, message: 'Kredensial bot belum diisi.' };
  }
  const api = new TelegramBotApi(credentials.botToken, credentials.chatId);
  const outDir = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/drill_${Date.now()}`;
  await ReactNativeBlobUtil.fs.mkdir(outDir).catch(() => undefined);
  trackTempDir(outDir);

  // Smallest session first: the drill wants the cheapest healthy proof, and a
  // bolong session is passed over for the next one rather than failed outright.
  const bySize = [...sessions].sort((a, b) => a.total_size - b.total_size);
  let missingPartCount = 0;
  try {
    for (const session of bySize) {
      onProgress?.('memeriksa cadangan\u2026');
      const { group: target, missing } = smallestCompleteGroup(
        await chunksRepo.listParts(session.id),
      );
      missingPartCount += missing;
      if (!target) {
        continue;
      }
      onProgress?.('mengunduh & memverifikasi\u2026');
      const result = await restoreFromTelegram(api, session.id, session.manifest_file_ids ?? '', {
        outputDir: outDir,
        passphrase: credentials.encryptionPassword || undefined,
        only: file => file.name === target.name,
      });
      const ok = result.status === 'success' && result.failed === 0;
      const reasons = result.files
        .filter(file => file.status === 'failed' && file.error)
        .map(file => `${file.name}: ${file.error}`);
      if (!ok) {
        logError('drill', reasons.join(' | ') || `status ${result.status}`);
      }
      const skipped = missingPartCount > 0
        ? `; ${missingPartCount} part lain tidak punya file_id di DB dan dilewati.`
        : '';
      return {
        ok,
        files: result.succeeded,
        message: ok
          ? `Backup ${target.name} terverifikasi: ${result.succeeded} berkas, hash cocok${skipped}`
          : `Drill GAGAL: ${result.succeeded} berhasil dari ${result.total}. ${reasons[0] ?? ''}`,
      };
    }
  } finally {
    await ReactNativeBlobUtil.fs.unlink(outDir).catch(() => undefined);
    untrackTempDir(outDir);
  }

  return {
    ok: false,
    files: 0,
    message:
      `Tidak ada backup utuh yang bisa diuji: ${missingPartCount} part tidak tersimpan file_id-nya di DB lokal. ` +
      'Pulihkan lewat "Impor manifest dari Telegram" (kirim berkas .manifest.json ke bot).',
  };
}

type CompleteGroup = {
  /** Entry name without the numeric part suffix (the manifest file name). */
  name: string;
  /** Summed uploaded part sizes — the size this entry costs to prove. */
  bytes: number;
};

/** Suffix `NNN` in `name.NNN` marks a part of a multi-part entry. */
const PART_SUFFIX = /^(.*)\.(\d{3})$/;

/**
 * Group all chunk rows into entries and pick the smallest complete one, plus the
 * number of parts that can never be re-downloaded.
 *
 * A part name is either `name.NNN` (multi-part archive) or `name` itself (a
 * single-part direct entry). Every chunk row exists on disk whether or not its
 * upload stored a `file_id`, so a complete entry is one whose every row in the
 * `1..max` range has a non-null `telegram_file_id`. An entry with a NULL row, or
 * a gap (rows 1 and 3 but no 2), is bolong and skipped.
 */
export function smallestCompleteGroup(parts: StoredPart[]): {
  group: CompleteGroup | null;
  missing: number;
} {
  const byBase = new Map<string, Map<number, boolean>>();
  const bytes = new Map<string, number>();
  for (const part of parts) {
    const match = PART_SUFFIX.exec(part.part_name);
    const base = match ? match[1] : part.part_name;
    const index = match ? Number(match[2]) : 1;
    let rows = byBase.get(base);
    if (!rows) {
      rows = new Map();
      byBase.set(base, rows);
    }
    rows.set(index, part.telegram_file_id !== null);
    bytes.set(base, (bytes.get(base) ?? 0) + part.size);
  }

  let best: CompleteGroup | null = null;
  let missing = 0;
  for (const [name, rows] of byBase) {
    const max = Math.max(...rows.keys());
    let complete = true;
    for (let index = 1; index <= max; index += 1) {
      if (rows.get(index) !== true) {
        complete = false;
        missing += 1;
      }
    }
    if (complete && (!best || (bytes.get(name) ?? 0) < best.bytes)) {
      best = { name, bytes: bytes.get(name) ?? 0 };
    }
  }
  return { group: best, missing };
}
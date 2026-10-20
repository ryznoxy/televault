import ReactNativeBlobUtil from 'react-native-blob-util';
import { TelegramBotApi } from '../net/telegramApi';
import { sessionsRepo } from '../db/repositories/sessions';
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
 * Restores the smallest successful session into a throwaway cache dir and
 * deletes it. Every manifest entry's SHA-256 is verified by the restore
 * runner itself, so a pass here proves the backup on Telegram is genuinely
 * recoverable — the backup that was never test-restored is a hope, not a
 * backup.
 */
export async function runRestoreDrill(
  onProgress?: (phase: string) => void,
): Promise<DrillResult> {
  const sessions = await sessionsRepo.recentRestorable(50);
  if (sessions.length === 0) {
    return { ok: false, files: 0, message: 'Belum ada backup yang bisa dipulihkan.' };
  }
  const target = sessions.reduce((smallest, session) =>
    session.total_size < smallest.total_size ? session : smallest,
  );
  const credentials = await secureStore.get();
  if (!credentials.botToken.trim() || !credentials.chatId.trim()) {
    return { ok: false, files: 0, message: 'Kredensial bot belum diisi.' };
  }
  const api = new TelegramBotApi(credentials.botToken, credentials.chatId);
  const outDir = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/drill_${Date.now()}`;
  await ReactNativeBlobUtil.fs.mkdir(outDir).catch(() => undefined);
  trackTempDir(outDir);
  try {
    onProgress?.('mengunduh & memverifikasi\u2026');
    const result = await restoreFromTelegram(api, target.id, target.manifest_file_ids ?? '', {
      outputDir: outDir,
      passphrase: credentials.encryptionPassword || undefined,
    });
    const ok = result.status === 'success' && result.failed === 0;
    const reasons = result.files
      .filter(file => file.status === 'failed' && file.error)
      .map(file => `${file.name}: ${file.error}`);
    if (!ok) {
      logError('drill', reasons.join(' | ') || `status ${result.status}`);
    }
    return {
      ok,
      files: result.succeeded,
      message: ok
        ? `Backup ${target.archive_name ?? target.id} terverifikasi: ${result.succeeded} berkas, hash cocok.`
        : `Drill GAGAL: ${result.succeeded} berhasil, ${result.failed} gagal dari ${result.total}. ${reasons[0] ?? ''}`,
    };
  } finally {
    await ReactNativeBlobUtil.fs.unlink(outDir).catch(() => undefined);
    untrackTempDir(outDir);
  }
}

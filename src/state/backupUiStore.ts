import { create } from 'zustand';
import {
  runBackupInForeground,
  BACKUP_IN_FLIGHT_ERROR,
} from '../background/foregroundService';
import type { BackupProgress, BackupResult } from '../backup/backupRunner';
import type { CategoryKey } from '../types/models';

export type ProgressLabel = {
  current: number;
  total: number;
  category?: string;
  verb?: string;
};

type BackupUiState = {
  busy: boolean;
  failed: boolean;
  progress: number;
  status: string | null;
  progressLabel: ProgressLabel | null;
  /** Start a backup; UI lives here so switching screens never loses it. */
  startBackup: (onFinished?: (result: BackupResult) => void | Promise<void>) => Promise<void>;
};

export function phaseText(phase: string, category?: string, current = 0, total = 0): string {
  const cat = category ? ` (${category})` : '';
  switch (phase) {
    case 'scanning':
      return `Memindai berkas${cat}\u2026`;
    case 'zipping':
      return `Mengarsipkan${cat}\u2026`;
    case 'uploading':
      return total > 0 ? `Mengunggah ${current}/${total}${cat}\u2026` : `Mengunggah${cat}\u2026`;
    case 'manifest':
      return total > 0 ? `Mengirim manifest ${current}/${total}\u2026` : 'Mengirim manifest\u2026';
    default:
      return 'Selesai';
  }
}

export function barVerb(phase: string): string {
  switch (phase) {
    case 'scanning':
      return 'Memindai';
    case 'zipping':
      return 'Mengarsipkan';
    case 'uploading':
      return 'Mengunggah';
    case 'manifest':
      return 'Manifest';
    default:
      return 'Selesai';
  }
}

export const useBackupUiStore = create<BackupUiState>()(set => ({
  busy: false,
  failed: false,
  progress: 0,
  status: null,
  progressLabel: null,
  startBackup: async onFinished => {
    set({ busy: true, failed: false, progress: 0, status: 'Memulai backup\u2026', progressLabel: null });
    try {
      const result = await runBackupInForeground((next: BackupProgress) => {
        set({
          status: phaseText(next.phase, next.category, next.current, next.total),
          progress:
            next.overall.total > 0 ? next.overall.current / next.overall.total : 0,
          progressLabel:
            next.overall.total > 0
              ? {
                  current: next.overall.current,
                  total: next.overall.total,
                  category: next.category,
                  verb: barVerb(next.phase),
                }
              : null,
        });
      });
      const note = result.notes && result.notes.length > 0 ? ` ${result.notes.join(' ')}` : '';
      if (result.status === 'failed' && result.error === BACKUP_IN_FLIGHT_ERROR) {
        set({ failed: true, status: `${BACKUP_IN_FLIGHT_ERROR}.` });
      } else {
        set({
          failed: result.status === 'failed',
          progress: 1,
          status: `${summaryOf(result)}${note}`,
        });
      }
      await onFinished?.(result);
    } catch (error) {
      set({ failed: true, status: error instanceof Error ? error.message : 'Backup gagal' });
    } finally {
      set({ busy: false });
    }
  },
}));

function summaryOf(result: BackupResult): string {
  if (result.status === 'success') {
    if (result.files === 0) return 'Semua berkas sudah tercadangkan. Tidak ada yang baru.';
    if (result.deferred > 0)
      return `Backup selesai. ${result.files} berkas diunggah, ${result.deferred} tersisa dan akan lanjut otomatis di backup berikutnya.`;
    return `Backup selesai. ${result.files} berkas diunggah.`;
  }
  if (result.status === 'partial') return 'Backup selesai dengan peringatan. Lihat Riwayat untuk detail.';
  return `Backup gagal. ${result.error ?? 'Coba lagi nanti.'}`;
}

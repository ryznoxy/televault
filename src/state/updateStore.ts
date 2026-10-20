import { create } from 'zustand';
import { checkForUpdate, downloadAndInstall, type AvailableUpdate } from '../update/updater';
import { mmkv } from './mmkv';
import { logError } from './errorLog';

export type UpdatePhase = 'idle' | 'downloading' | 'opening';

type UpdateUiState = {
  update: AvailableUpdate | null;
  phase: UpdatePhase;
  progress: number;
  /** Incremented to abort the in-flight download loop via progress callback. */
  cancelRequested: boolean;
  dismiss: () => void;
  setUpdate: (update: AvailableUpdate | null) => void;
  check: () => Promise<void>;
  startDownload: (onError: (message: string) => void) => Promise<void>;
  cancelDownload: () => void;
};

export const useUpdateStore = create<UpdateUiState>()((set, get) => ({
  update: null,
  phase: 'idle',
  progress: 0,
  cancelRequested: false,
  dismiss: () => set({ update: null }),
  setUpdate: update => set({ update }),
  check: async () => {
    try {
      const available = await checkForUpdate();
      if (available) set({ update: available });
    } catch (error) {
      // offline or rate-limited: no banner is the correct quiet fallback
      logError('update-check', error);
    }
  },
  startDownload: async onError => {
    const { update, phase } = get();
    if (!update || phase !== 'idle') return;
    set({ phase: 'downloading', progress: 0, cancelRequested: false });
    try {
      await downloadAndInstall(
        update,
        (sent, total) => {
          if (total > 0) set({ progress: sent / total });
          if (get().cancelRequested) {
            // RNBU aborts when the progress callback throws.
            throw new Error('__cancelled__');
          }
        },
      );
      set({ phase: 'opening' });
      // Reset to idle once the installer prompt is up.
      setTimeout(() => set({ phase: 'idle', progress: 0 }), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ phase: 'idle', progress: 0, cancelRequested: false });
      if (message !== '__cancelled__') {
        logError('update-download', error);
        onError(message);
      }
    }
  },
  cancelDownload: () => {
    if (get().phase === 'downloading') set({ cancelRequested: true });
    else set({ update: null, phase: 'idle', progress: 0 });
  },
}));

export const UPDATE_DISMISS_KEY = 'update_dismissed_tag';
export function isUpdateDismissed(tag: string): boolean {
  return mmkv.getString(UPDATE_DISMISS_KEY) === tag;
}
export function dismissUpdateTag(tag: string): void {
  mmkv.set(UPDATE_DISMISS_KEY, tag);
}

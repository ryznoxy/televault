import { create } from 'zustand';
import {
  checkForUpdate,
  downloadAndInstall,
  deviceVersionCode,
  versionCodeFor,
  type AvailableUpdate,
} from '../update/updater';
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
  /**
   * Returns the pending release, or null when the install is current. `force`
   * is the explicit check in Settings: it skips the interval throttle and shows
   * a release the user dismissed earlier.
   */
  check: (force?: boolean) => Promise<AvailableUpdate | null>;
  startDownload: (onError: (message: string) => void) => Promise<void>;
  cancelDownload: () => void;
};

export const UPDATE_DISMISS_KEY = 'update_dismissed_tag';
/** Remembered release, so a restart inside the check interval still shows it. */
const PENDING_KEY = 'update_pending_release';

/**
 * The release found earlier, still newer than what is installed. The local
 * versionCode decides: an update that has since been installed is dropped here
 * instead of being offered again.
 */
export function pendingFromStorage(): AvailableUpdate | null {
  const raw = mmkv.getString(PENDING_KEY);
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw) as AvailableUpdate;
    if (!stored?.tag || !stored.apkUrl) {
      return null;
    }
    const releaseCode = versionCodeFor(stored.tag);
    const device = deviceVersionCode();
    if (releaseCode !== null && device !== null && releaseCode <= device) {
      return null;
    }
    return stored;
  } catch {
    // A value from a broken write must not keep the app from starting.
    return null;
  }
}

export function isUpdateDismissed(tag: string): boolean {
  return mmkv.getString(UPDATE_DISMISS_KEY) === tag;
}
export function dismissUpdateTag(tag: string): void {
  mmkv.set(UPDATE_DISMISS_KEY, tag);
}

// All of the above is read while this module is created, so it has to be
// declared before the store: the bundle lowers `const` to `var`, which makes a
// later declaration read as `undefined` instead of throwing - and the native
// MMKV rejects a key that is not a string.
export const useUpdateStore = create<UpdateUiState>()((set, get) => ({
  // A release found in an earlier session is shown straight away: the automatic
  // check is throttled, so without this a restart in the quiet hour would hide
  // an update the user was already told about.
  update: pendingFromStorage(),
  phase: 'idle',
  progress: 0,
  cancelRequested: false,
  dismiss: () => {
    const tag = get().update?.tag;
    if (tag) {
      // Remembered, so the automatic check stops asking about this release. The
      // manual check in Settings ignores it and shows the alert again.
      dismissUpdateTag(tag);
    }
    mmkv.remove(PENDING_KEY);
    set({ update: null });
  },
  setUpdate: update => set({ update }),
  check: async (force = false) => {
    try {
      const available = await checkForUpdate(undefined, undefined, force);
      if (available && (force || !isUpdateDismissed(available.tag))) {
        set({ update: available });
        mmkv.set(PENDING_KEY, JSON.stringify(available));
      }
      return available;
    } catch (error) {
      // offline or rate-limited: no alert is the correct quiet fallback
      logError('update-check', error);
      if (force) throw error;
      return null;
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

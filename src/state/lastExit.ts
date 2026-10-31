import { mmkv } from './mmkv';
import { logError } from './errorLog';

/**
 * How the previous process of this app died, as Android reports it
 * (`ActivityManager.getHistoricalProcessExitReasons`). A run that disappears
 * when the UI opens leaves exactly one of these behind — an LMKD kill, a crash,
 * or an ANR — and each needs a different fix, so the reason is kept around
 * until a newer death replaces it.
 */
export type LastExit = {
  at: number;
  reason: string;
  description: string;
  trace: string;
};

type ExitSource = { lastExitReason?: () => Promise<LastExit | null> };

const KEY = 'last_exit';

export function getLastExit(): LastExit | null {
  const raw = mmkv.getString(KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as LastExit;
  } catch {
    return null;
  }
}

/**
 * Reasons that mean the system killed us or we fell over: worth surfacing as a
 * warning. `USER_REQUESTED` / `USER_STOPPED` / `EXIT_SELF` are ordinary closes.
 */
const SUSPICIOUS = new Set([
  'LOW_MEMORY',
  'CRASH',
  'CRASH_NATIVE',
  'ANR',
  'SIGNALED',
  'RESOURCE_USAGE',
  'DEPENDENCY_DIED',
  'INIT_FAILURE',
]);

export function isSuspiciousExit(reason: string): boolean {
  return SUSPICIOUS.has(reason);
}

/**
 * Reads the exit reason once per boot. Android keeps a history, so the same
 * death is reported on every launch; an equal `at` means it is already stored
 * and must not be logged again.
 */
export async function captureLastExit(source?: ExitSource): Promise<LastExit | null> {
  const stored = getLastExit();
  if (!source?.lastExitReason) {
    return stored;
  }
  let info: LastExit | null;
  try {
    info = await source.lastExitReason();
  } catch {
    return stored;
  }
  if (!info || info.at === stored?.at) {
    return stored;
  }
  try {
    mmkv.set(KEY, JSON.stringify(info));
  } catch {
    return stored;
  }
  if (isSuspiciousExit(info.reason)) {
    logError(`exit:${info.reason}`, info.description || new Date(info.at).toISOString());
  }
  return info;
}

/** Indonesian label for the exit row; the raw reason is the fallback. */
export function exitReasonLabel(reason: string): string {
  switch (reason) {
    case 'LOW_MEMORY':
      return 'Sistem kehabisan memori (OOM)';
    case 'CRASH':
    case 'CRASH_NATIVE':
      return 'Aplikasi crash';
    case 'ANR':
      return 'Aplikasi tidak merespons (ANR)';
    case 'SIGNALED':
      return 'Dihentikan sistem';
    case 'RESOURCE_USAGE':
      return 'Dibatasi sistem (pemakaian berlebih)';
    case 'DEPENDENCY_DIED':
      return 'Layanan terkait berhenti';
    case 'INIT_FAILURE':
      return 'Gagal inisialisasi';
    case 'USER_REQUESTED':
    case 'USER_STOPPED':
      return 'Ditutup pengguna';
    case 'EXIT_SELF':
      return 'Keluar normal';
    case 'PERMISSION_CHANGE':
      return 'Izin aplikasi berubah';
    case 'OTHER':
      return 'Sistem menghentikan proses';
    default:
      return reason || 'Tidak diketahui';
  }
}

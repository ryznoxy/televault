import ReactNativeBlobUtil from 'react-native-blob-util';

/**
 * The one channel both runtimes can share for "stop this run".
 *
 * A run can happen where the UI cannot reach it: the exact alarm's foreground
 * service runs the backup in its own JS runtime, and the app's Kotlin side has
 * no JS either. A variable would therefore never be seen, so the request is
 * left as a file in the app's private dir — the same dir native calls
 * `filesDir` and JS calls `DocumentDir` — and the runner polls for it.
 */
const FLAG_NAME = 'run_stop_request';

function flagPath(): string {
  return `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${FLAG_NAME}`;
}

/** Ask the run in flight, wherever it is, to stop after the current chunk. */
export async function requestRunStop(): Promise<void> {
  await ReactNativeBlobUtil.fs.writeFile(flagPath(), '1', 'utf8');
}

/**
 * Cleared when a run starts: a request left over from a finished run must not
 * abort the next one.
 */
export async function clearRunStop(): Promise<void> {
  await ReactNativeBlobUtil.fs.unlink(flagPath()).catch(() => undefined);
}

export async function runStopRequested(): Promise<boolean> {
  try {
    return await ReactNativeBlobUtil.fs.exists(flagPath());
  } catch {
    return false;
  }
}
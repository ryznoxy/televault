import BackgroundFetch, { type HeadlessEvent } from 'react-native-background-fetch';
import { runScheduledBackup } from './scheduler';
import { refreshStatusNotification } from './androidStatus';
import { recordWake } from './wake';
import { logError } from '../state/errorLog';

export async function headlessTask(event: HeadlessEvent): Promise<void> {
  if (event.timeout) {
    BackgroundFetch.finish(event.taskId);
    return;
  }
  recordWake('job');
  try {
    await runScheduledBackup();
  } catch (error) {
    // A rejection used to vanish here: the fetch was finished anyway and the
    // reason never reached the Troubleshooting log.
    logError('scheduler', error);
  } finally {
    BackgroundFetch.finish(event.taskId);
    refreshStatusNotification();
  }
}

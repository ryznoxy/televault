import BackgroundFetch, { type HeadlessEvent } from 'react-native-background-fetch';
import { runScheduledBackup } from './scheduler';

export async function headlessTask(event: HeadlessEvent): Promise<void> {
  if (event.timeout) {
    BackgroundFetch.finish(event.taskId);
    return;
  }
  try {
    await runScheduledBackup();
  } finally {
    BackgroundFetch.finish(event.taskId);
  }
}

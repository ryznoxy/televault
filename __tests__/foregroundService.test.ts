import BackgroundService from 'react-native-background-actions';
import { runBackupInForeground } from '../src/background/foregroundService';
import { runBackup, type BackupProgress } from '../src/backup/backupRunner';

jest.mock('react-native-background-actions', () => {
  // Faithful reproduction of `BackgroundServer` in the real plugin
  // (`_generateTask`): the generated task only resolves after `stop()` is
  // called, and `stop()` is only reached via `task().then(() => self.stop())`.
  // A raw-task rejection therefore leaves the service "running" and never
  // resolves the outer promise — exactly the P1-3 bug.
  const state: {
    running: boolean;
    stopTask: () => void;
    task: (() => Promise<void>) | null;
  } = { running: false, stopTask: () => {}, task: null };
  const start = jest.fn(async (task: () => Promise<void>) => {
    state.running = true;
    state.task = async () => {
      await new Promise<void>(resolve => {
        state.stopTask = resolve;
        task().then(() => {
          server.stop().catch(() => undefined);
        });
      });
    };
  });
  const stop = jest.fn(async () => {
    state.stopTask();
    state.running = false;
  });
  const server = {
    start,
    stop,
    updateNotification: jest.fn(async () => undefined),
    isRunning: jest.fn(() => state.running),
    __setRunning: (v: boolean) => {
      state.running = v;
    },
    __task: () => state.task,
  };
  return { __esModule: true, default: server };
});

jest.mock('../src/backup/backupRunner', () => ({
  runBackup: jest.fn(),
}));

const startMock = BackgroundService.start as unknown as jest.Mock;
const stopMock = BackgroundService.stop as unknown as jest.Mock;
const isRunningMock = BackgroundService.isRunning as unknown as jest.Mock;
const updateNotificationMock = BackgroundService.updateNotification as unknown as jest.Mock;
const runBackupMock = runBackup as unknown as jest.Mock;
const mockControl = BackgroundService as unknown as {
  __setRunning: (v: boolean) => void;
  __task: () => (() => Promise<void>) | null;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockControl.__setRunning(false);
  runBackupMock.mockResolvedValue({
    status: 'success',
    chunksSent: 2,
    files: 1,
    totalSize: 5,
  });
});

test('returns the real result once the task finishes, not a fabricated failure', async () => {
  const promise = runBackupInForeground();
  const task = mockControl.__task();
  if (!task) throw new Error('mock task not registered');
  await task();

  await expect(promise).resolves.toEqual({
    status: 'success',
    chunksSent: 2,
    files: 1,
    totalSize: 5,
  });
});

test('a second overlapping call reuses the in-flight run and starts one service', async () => {
  const first = runBackupInForeground();
  const second = runBackupInForeground();

  const task = mockControl.__task();
  if (!task) throw new Error('mock task not registered');
  await task();

  await expect(first).resolves.toMatchObject({ status: 'success' });
  await expect(second).resolves.toMatchObject({ status: 'success' });
  expect(startMock).toHaveBeenCalledTimes(1);
});

test('does not start a service while another one is already running', async () => {
  mockControl.__setRunning(true);

  const result = await runBackupInForeground();

  expect(result.status).toBe('failed');
  expect(result.error).toBe('Backup lain sedang berjalan');
  expect(startMock).not.toHaveBeenCalled();
});

test('forwards progress to the caller and to the notification', async () => {
  runBackupMock.mockImplementation(async (onProgress?: (progress: BackupProgress) => void) => {
    onProgress?.({
      phase: 'uploading',
      category: 'photo',
      current: 1,
      total: 2,
      overall: { current: 1, total: 2 },
    });
    return { status: 'success', chunksSent: 1, files: 1, totalSize: 5 };
  });

  const seen: BackupProgress[] = [];
  const promise = runBackupInForeground(progress => seen.push(progress));
  const task = mockControl.__task();
  if (!task) throw new Error('mock task not registered');
  await task();

  await expect(promise).resolves.toMatchObject({ status: 'success' });
  expect(seen).toEqual([
    { phase: 'uploading', category: 'photo', current: 1, total: 2, overall: { current: 1, total: 2 } },
  ]);
  expect(updateNotificationMock).toHaveBeenCalledWith({ taskDesc: 'uploading 50%' });
});

test('when runBackup throws, the caller still gets a failed result with the error and the service stops', async () => {
  runBackupMock.mockRejectedValueOnce(new Error('crypto module exploded'));

  const promise = runBackupInForeground();
  const task = mockControl.__task();
  if (!task) throw new Error('mock task not registered');
  await task();

  await expect(promise).resolves.toEqual({
    status: 'failed',
    chunksSent: 0,
    files: 0,
    totalSize: 0,
    deferred: 0,
    error: 'crypto module exploded',
  });
  expect(stopMock).toHaveBeenCalledTimes(1);
  expect(isRunningMock()).toBe(false);
});

test('after a runBackup throw the service accepts a subsequent call again', async () => {
  runBackupMock.mockRejectedValueOnce(new Error('first run blew up'));

  const first = runBackupInForeground();
  const firstTask = mockControl.__task();
  if (!firstTask) throw new Error('mock task not registered');
  await firstTask();
  await expect(first).resolves.toMatchObject({ status: 'failed' });

  runBackupMock.mockResolvedValueOnce({
    status: 'success',
    chunksSent: 1,
    files: 1,
    totalSize: 1,
  });

  const second = runBackupInForeground();
  expect(startMock).toHaveBeenCalledTimes(2);
  const secondTask = mockControl.__task();
  if (!secondTask) throw new Error('mock task not registered');
  await secondTask();

  await expect(second).resolves.toMatchObject({ status: 'success' });
});

import { refreshStatusNotification } from '../src/background/androidStatus';
import { useSettingsStore } from '../src/state/settingsStore';

type Native = { showStatus: jest.Mock; hideStatus: jest.Mock };

function fakeNative(): Native {
  return { showStatus: jest.fn(), hideStatus: jest.fn() };
}

/** The notification is posted in a promise chain; let it settle. */
const flush = () => new Promise<void>(resolve => setImmediate(() => resolve()));

beforeEach(() => {
  // The notification only exists while automation is on.
  useSettingsStore.getState().setScheduleMode('time');
  useSettingsStore.getState().setAutomationPaused(false);
});

test('a partial run counts as the last backup, not "belum pernah berjalan"', async () => {
  const native = fakeNative();
  const startedAt = Date.now() - 90 * 60_000;
  const repo = {
    lastFinished: jest.fn(async () => ({
      started_at: startedAt,
      finished_at: null,
      status: 'partial',
    })),
  };

  refreshStatusNotification(native as never, repo as never);
  await flush();

  expect(native.showStatus).toHaveBeenCalledWith('TeleVault aktif', expect.stringContaining('terakhir'));
  expect(native.showStatus).not.toHaveBeenCalledWith(
    'TeleVault aktif',
    expect.stringContaining('belum pernah'),
  );
});

test('no session at all still says none ran yet', async () => {
  const native = fakeNative();
  const repo = { lastFinished: jest.fn(async () => null) };

  refreshStatusNotification(native as never, repo as never);
  await flush();

  expect(native.showStatus).toHaveBeenCalledWith(
    'TeleVault aktif',
    'Backup otomatis \u00b7 belum pernah berjalan',
  );
});

test('a failed read keeps the notification instead of hiding it', async () => {
  const native = fakeNative();
  const repo = { lastFinished: jest.fn(async () => Promise.reject(new Error('db'))) };

  refreshStatusNotification(native as never, repo as never);
  await flush();

  expect(native.showStatus).toHaveBeenCalledWith('TeleVault aktif', 'Backup otomatis aktif');
  expect(native.hideStatus).not.toHaveBeenCalled();
});

test('paused automation hides the notification without reading the table', async () => {
  const native = fakeNative();
  const repo = { lastFinished: jest.fn() };
  useSettingsStore.getState().setAutomationPaused(true);

  refreshStatusNotification(native as never, repo as never);
  await flush();

  expect(native.hideStatus).toHaveBeenCalled();
  expect(repo.lastFinished).not.toHaveBeenCalled();
});
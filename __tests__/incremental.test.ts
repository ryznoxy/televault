import { needsBackup } from '../src/backup/incremental';

test('untracked file needs backup', () => {
  expect(needsBackup(null, { modifiedAt: 100 })).toBe(true);
});

test('tracked but never backed up needs backup', () => {
  expect(needsBackup({ last_backup: null, modified_at: 100 }, { modifiedAt: 100 })).toBe(true);
});

test('unchanged file is skipped', () => {
  expect(needsBackup({ last_backup: 5, modified_at: 100 }, { modifiedAt: 100 })).toBe(false);
});

test('changed file needs backup', () => {
  expect(needsBackup({ last_backup: 5, modified_at: 100 }, { modifiedAt: 200 })).toBe(true);
});

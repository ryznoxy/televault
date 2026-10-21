import { relativeTime, statusBody, statusVisible } from '../src/background/statusText';
import { ScheduleMode } from '../src/types/models';

describe('status notification text', () => {
  test.each([
    [0, 'baru saja'],
    [59_000, 'baru saja'],
    [60_000, '1 menit lalu'],
    [59 * 60_000, '59 menit lalu'],
    [60 * 60_000, '1 jam lalu'],
    [23 * 60 * 60_000, '23 jam lalu'],
    [24 * 60 * 60_000, '1 hari lalu'],
  ])('relativeTime(%p) → %p', (ago, expected) => {
    expect(relativeTime(1_000_000_000 - ago, 1_000_000_000)).toBe(expected);
  });

  test('body names the last backup, or says none ran yet', () => {
    expect(statusBody(null)).toBe('Backup otomatis \u00b7 belum pernah berjalan');
    expect(statusBody(1_000_000_000 - 2 * 60 * 60_000, 1_000_000_000)).toBe(
      'Backup otomatis \u00b7 terakhir 2 jam lalu',
    );
  });

  test('only shows while automation is on', () => {
    expect(statusVisible({ automationPaused: false, scheduleMode: ScheduleMode.INTERVAL })).toBe(
      true,
    );
    expect(statusVisible({ automationPaused: true, scheduleMode: ScheduleMode.INTERVAL })).toBe(
      false,
    );
    expect(statusVisible({ automationPaused: false, scheduleMode: ScheduleMode.MANUAL })).toBe(
      false,
    );
  });
});

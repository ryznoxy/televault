import type { SessionRecord } from '../src/db/repositories/sessions';
import {
  filterSessions,
  formatBytesGB,
  formatDuration,
  sessionDateLabel,
  sessionsToCsv,
  sortSessions,
  telegramMessageUrl,
} from '../src/state/history';

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 1,
    started_at: 1_700_000_000_000,
    finished_at: 1_700_000_012_000,
    category: 'photo',
    total_files: 3,
    total_size: 2048,
    chunks_total: 2,
    chunks_sent: 2,
    status: 'success',
    manifest_id: '42',
    manifest_file_ids: 'file-42',
    archive_name: 'photo_1700000000000.zip',
    encrypted: 1,
    error_reason: null,
    archive_format: 'zip',
    ...overrides,
  };
}

describe('formatDuration', () => {
  it('renders seconds, minutes and hours', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(192_000)).toBe('3m 12s');
    expect(formatDuration(3_840_000)).toBe('1j 4m');
    expect(formatDuration(60_000)).toBe('1m');
    expect(formatDuration(3_600_000)).toBe('1j');
  });

  it('guards non-positive input', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-5)).toBe('0s');
    expect(formatDuration(Number.NaN)).toBe('0s');
  });
});

describe('formatBytesGB', () => {
  it('scales through B / KB / MB / GB', () => {
    expect(formatBytesGB(0)).toBe('0 KB');
    expect(formatBytesGB(500)).toBe('500 B');
    expect(formatBytesGB(2048)).toBe('2.0 KB');
    expect(formatBytesGB(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytesGB(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });
});

describe('sessionDateLabel', () => {
  const now = new Date(2026, 0, 15, 12, 0, 0).getTime();

  it('labels today and yesterday', () => {
    expect(sessionDateLabel(new Date(2026, 0, 15, 9, 5).getTime(), now)).toBe('Hari ini, 09:05');
    expect(sessionDateLabel(new Date(2026, 0, 14, 23, 30).getTime(), now)).toBe('Kemarin, 23:30');
  });

  it('formats older dates without a WIB suffix', () => {
    const label = sessionDateLabel(new Date(2025, 11, 3, 8, 7).getTime(), now);
    expect(label).toContain('2025');
    expect(label).toContain('08:07');
    expect(label).not.toContain('WIB');
  });
});

describe('telegramMessageUrl', () => {
  it('builds a private channel link from a -100 id', () => {
    expect(telegramMessageUrl('-100192837482', 42)).toBe('https://t.me/c/192837482/42');
    expect(telegramMessageUrl('-100192837482', '7')).toBe('https://t.me/c/192837482/7');
  });

  it('builds a public username link', () => {
    expect(telegramMessageUrl('@mychannel', 5)).toBe('https://t.me/mychannel/5');
  });

  it('returns null when the message id is missing or unparseable', () => {
    expect(telegramMessageUrl('-100192837482', null)).toBeNull();
    expect(telegramMessageUrl('-100192837482', '')).toBeNull();
    expect(telegramMessageUrl('-100192837482', 'abc')).toBeNull();
    expect(telegramMessageUrl('', 5)).toBeNull();
  });

  it('P2-6: links the first id of a multi-archive session', () => {
    // A zip run stores one manifest id per archive, comma separated, and only
    // the first one is linked.
    expect(telegramMessageUrl('-100192837482', '11,22,33')).toBe('https://t.me/c/192837482/11');
  });
});

describe('sessionsToCsv', () => {
  it('writes a header and one line per row', () => {
    const csv = sessionsToCsv([makeSession()]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('archive_name');
    expect(lines[0]).toContain('error_reason');
    expect(lines[1]).toContain('photo_1700000000000.zip');
    expect(lines).toHaveLength(2);
  });

  it('escapes commas, quotes and newlines', () => {
    const csv = sessionsToCsv([
      makeSession({ archive_name: 'a,b"c', error_reason: 'line1\nline2' }),
    ]);
    expect(csv).toContain('"a,b""c"');
    expect(csv).toContain('"line1\nline2"');
  });
});

describe('filterSessions', () => {
  const rows = [
    makeSession({ id: 1, status: 'success', archive_name: 'photo_a.zip' }),
    makeSession({ id: 2, status: 'failed', archive_name: 'video_b.zip', error_reason: 'Koneksi putus' }),
    makeSession({ id: 3, status: 'running', archive_name: 'doc_c.zip' }),
  ];

  it('filters by status', () => {
    expect(filterSessions(rows, { status: 'failed' }).map(r => r.id)).toEqual([2]);
    expect(filterSessions(rows, { status: 'all' })).toHaveLength(3);
  });

  it('matches the query case-insensitively over name/status/hash', () => {
    expect(filterSessions(rows, { query: 'VIDEO' }).map(r => r.id)).toEqual([2]);
    expect(filterSessions(rows, { query: 'running' }).map(r => r.id)).toEqual([3]);
    expect(filterSessions(rows, { query: '42' })).toHaveLength(3);
  });
});

describe('sortSessions', () => {
  it('sorts by started_at', () => {
    const rows = [
      makeSession({ id: 1, started_at: 100 }),
      makeSession({ id: 2, started_at: 300 }),
      makeSession({ id: 3, started_at: 200 }),
    ];
    expect(sortSessions(rows, 'newest').map(r => r.id)).toEqual([2, 3, 1]);
    expect(sortSessions(rows, 'oldest').map(r => r.id)).toEqual([1, 3, 2]);
    expect(rows.map(r => r.id)).toEqual([1, 2, 3]);
  });
});

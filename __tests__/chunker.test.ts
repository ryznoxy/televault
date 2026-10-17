import { computeChunkRanges, chunkName, MAX_CHUNK_SIZE } from '../src/backup/chunker';

test('file within one chunk returns a single range covering the whole file', () => {
  expect(computeChunkRanges(1000)).toEqual([{ index: 1, start: 0, end: 1000, size: 1000 }]);
});

test('file exactly at chunk limit stays a single chunk', () => {
  const ranges = computeChunkRanges(MAX_CHUNK_SIZE);
  expect(ranges).toHaveLength(1);
});

test('120MB splits into three ranges that cover the whole file', () => {
  const size = 120 * 1024 * 1024;
  const ranges = computeChunkRanges(size);
  expect(ranges).toHaveLength(3);
  expect(ranges.reduce((sum, r) => sum + r.size, 0)).toBe(size);
  expect(ranges[0]).toMatchObject({ index: 1, start: 0 });
  expect(ranges[1].start).toBe(ranges[0].end);
  expect(ranges[2].end).toBe(size);
});

test('chunk names are zero-padded to three digits', () => {
  expect(chunkName('DCIM.zip', 1)).toBe('DCIM.zip.001');
  expect(chunkName('DCIM.zip', 12)).toBe('DCIM.zip.012');
});

test('config-driven chunk size splits a 3GB file into 2 vs 7 ranges', () => {
  const size = 3 * 1024 * 1024 * 1024;
  expect(computeChunkRanges(size, 2000 * 1024 * 1024)).toHaveLength(2);
  expect(computeChunkRanges(size, 500 * 1024 * 1024)).toHaveLength(7);
});

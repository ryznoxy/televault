import ReactNativeBlobUtil from 'react-native-blob-util';

// ponytail: 49 MB keeps under the public Bot API (api.telegram.org) 50 MB
// per-file upload cap. Always used: larger slices only work against a
// self-hosted Bot API server, which this build does not target.
export const MAX_CHUNK_SIZE = 49 * 1024 * 1024;

export type ChunkRange = {
  index: number;
  start: number;
  end: number;
  size: number;
};

export type ChunkFile = {
  index: number;
  path: string;
  size: number;
};

export function computeChunkRanges(size: number, chunkSize = MAX_CHUNK_SIZE): ChunkRange[] {
  if (size <= chunkSize) {
    return [{ index: 1, start: 0, end: size, size }];
  }
  const ranges: ChunkRange[] = [];
  let offset = 0;
  let index = 1;
  while (offset < size) {
    const length = Math.min(chunkSize, size - offset);
    ranges.push({ index, start: offset, end: offset + length, size: length });
    offset += length;
    index += 1;
  }
  return ranges;
}

export function chunkName(fileName: string, index: number): string {
  return `${fileName}.${String(index).padStart(3, '0')}`;
}

/**
 * Name a part is uploaded under. A file that fits in one part keeps its own
 * name, so Telegram shows a photo/video preview instead of an opaque document
 * called `IMG_0001.jpg.001`. Files that are actually split keep the numbered
 * parts the reassembly scripts expect.
 */
export function partNameFor(fileName: string, index: number, count: number): string {
  return count === 1 ? fileName : chunkName(fileName, index);
}

/**
 * Slice a file into `.001`, `.002`, … parts. Parts land in `outDir` (the cache
 * staging dir) because the source may live in a public directory this app
 * cannot write to under scoped storage. A file that fits one chunk is returned
 * as-is, without copying.
 */
export async function chunkFile(
  sourcePath: string,
  chunkSize = MAX_CHUNK_SIZE,
  outDir?: string,
): Promise<ChunkFile[]> {
  const stat = await ReactNativeBlobUtil.fs.stat(sourcePath);
  const ranges = computeChunkRanges(stat.size, chunkSize);
  if (ranges.length === 1) {
    return [{ index: 1, path: sourcePath, size: stat.size }];
  }
  const slash = sourcePath.lastIndexOf('/');
  const dir = outDir ?? (slash >= 0 ? sourcePath.slice(0, slash) : '');
  const fileName = slash >= 0 ? sourcePath.slice(slash + 1) : sourcePath;
  const chunks: ChunkFile[] = [];
  for (const range of ranges) {
    const path = `${dir}/${chunkName(fileName, range.index)}`;
    await ReactNativeBlobUtil.fs.slice(sourcePath, path, range.start, range.end);
    chunks.push({ index: range.index, path, size: range.size });
  }
  return chunks;
}

export async function cleanupChunks(chunks: ChunkFile[], originalPath: string): Promise<void> {
  for (const chunk of chunks) {
    if (chunk.path !== originalPath) {
      await ReactNativeBlobUtil.fs.unlink(chunk.path).catch(() => undefined);
    }
  }
}

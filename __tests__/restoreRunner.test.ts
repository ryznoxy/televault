import ReactNativeBlobUtil from 'react-native-blob-util';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { createManifest, manifestToJson, type ManifestFile } from '../src/backup/manifest';
import { encryptFile, fromBase64, toBase64 } from '../src/backup/crypto';
import {
  findManifestPath,
  findManifestPaths,
  joinChunks,
  mergeManifests,
  parseManifest,
  resolveParts,
  restoreFromFiles,
  restoreFromFolder,
  toFileUri,
} from '../src/backup/restoreRunner';

jest.mock('react-native-blob-util', () => {
  const files = new Map<string, string>();
  const read = (path: string) => files.get(String(path)) ?? '';
  const latin1 = (value: string) => Uint8Array.from(value, c => c.charCodeAt(0) % 256);
  const { sha256: hash } = require('@noble/hashes/sha2.js');
  const { bytesToHex: toHex } = require('@noble/hashes/utils.js');
  return {
    __esModule: true,
    default: {
      __files: files,
      fs: {
        dirs: { CacheDir: '/cache', DocumentDir: '/doc', DownloadDir: '/download' },
        mkdir: jest.fn(async () => undefined),
        unlink: jest.fn(async (path: string) => {
          files.delete(String(path));
        }),
        exists: jest.fn(async (path: string) => files.has(String(path))),
        stat: jest.fn(async (path: string) => ({
          size: read(path).length,
          lastModified: 0,
          type: 'file',
        })),
        ls: jest.fn(async () => []),
        slice: jest.fn(async () => ''),
        readFile: jest.fn(async (path: string) => read(path)),
        writeFile: jest.fn(async (path: string, data: string, encoding?: string) => {
          files.set(String(path), encoding === 'uri' ? read(String(data)) : String(data));
        }),
        appendFile: jest.fn(async (path: string, data: string, encoding?: string) => {
          const chunk = encoding === 'uri' ? read(String(data)) : String(data);
          files.set(String(path), read(String(path)) + chunk);
          return chunk.length;
        }),
        hash: jest.fn(async (path: string) => toHex(hash(latin1(read(path))))),
      },
    },
  };
});

jest.mock('react-native-zip-archive', () => ({
  unzip: jest.fn(async () => ''),
  zip: jest.fn(async () => ''),
  zipWithPassword: jest.fn(async () => ''),
}));

const fs = ReactNativeBlobUtil.fs as unknown as {
  readFile: (path: string, encoding?: string) => Promise<string>;
  writeFile: (path: string, data: string, encoding?: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
};

const store = (ReactNativeBlobUtil as unknown as { __files: Map<string, string> }).__files;

const latin1 = (value: string) => Uint8Array.from(value, c => c.charCodeAt(0) % 256);
const shaOf = (value: string) => bytesToHex(sha256(latin1(value)));

async function writeManifest(dir: string, files: ManifestFile[], encryption?: object) {
  const manifest = createManifest('Pixel 7', 1694524800000, files, 'session-1', encryption as never);
  await fs.writeFile(`${dir}/manifest.json`, manifestToJson(manifest));
}

beforeEach(() => {
  store.clear();
});

test('joinChunks concatenates parts in ascending order, byte for byte', async () => {
  await fs.writeFile('/join/a.001', 'AAA');
  await fs.writeFile('/join/a.002', 'BBBB');
  await fs.writeFile('/join/a.003', 'CC');

  await joinChunks(['/join/a.001', '/join/a.002', '/join/a.003'], '/join/a');

  expect(await fs.readFile('/join/a')).toBe('AAABBBBCC');
});

test('joinChunks copies parts larger than one read block without truncation', async () => {
  const first = 'x'.repeat(50_000);
  const second = 'y'.repeat(70_000);
  await fs.writeFile('/join/big.001', first);
  await fs.writeFile('/join/big.002', second);

  await joinChunks(['/join/big.001', '/join/big.002'], '/join/big');

  const joined = await fs.readFile('/join/big');
  expect(joined.length).toBe(120_000);
  expect(joined.startsWith(first)).toBe(true);
  expect(joined.endsWith(second)).toBe(true);
});

test('restore verifies the SHA-256 and writes the joined file out', async () => {
  const dir = '/restore/sha';
  await fs.writeFile(`${dir}/note.txt.001`, 'AAA');
  await fs.writeFile(`${dir}/note.txt.002`, 'BBB');
  await writeManifest(dir, [
    { name: 'note.txt', size: 6, chunks: 2, encrypted: false, sha256: shaOf('AAABBB') },
  ]);

  const result = await restoreFromFolder(dir);

  expect(result.status).toBe('success');
  expect(result.files[0].status).toBe('ok');
  expect(result.files[0].outputPath).toBe(`${dir}/restored/note.txt`);
  expect(await fs.readFile(`${dir}/restored/note.txt`)).toBe('AAABBB');
});

test('a checksum mismatch fails only that file and skips decrypt/extract', async () => {
  const dir = '/restore/bad';
  await fs.writeFile(`${dir}/note.txt.001`, 'AAA');
  await writeManifest(dir, [
    { name: 'note.txt', size: 3, chunks: 1, encrypted: false, sha256: 'deadbeef' },
  ]);

  const result = await restoreFromFolder(dir);

  expect(result.status).toBe('failed');
  expect(result.files[0].status).toBe('failed');
  expect(result.files[0].error).toContain('SHA-256');
  expect(await fs.exists(`${dir}/restored/note.txt`)).toBe(false);
});

test('encrypted roundtrip: encrypt, chunk, verify, decrypt and write out', async () => {
  const dir = '/restore/enc';
  const source = `${dir}/note.txt`;
  const plaintext = 'hello tele vault';
  await fs.writeFile(source, toBase64(utf8ToBytes(plaintext)));
  const enc = await encryptFile(source, 'correct horse battery staple', 'c2FsdHNhbHRzYWx0c2FsdA==');
  const ciphertext = await fs.readFile(enc.path, 'base64');

  const cut = 8;
  await fs.writeFile(`${dir}/note.txt.enc.001`, ciphertext.slice(0, cut));
  await fs.writeFile(`${dir}/note.txt.enc.002`, ciphertext.slice(cut));
  await writeManifest(
    dir,
    [
      {
        name: 'note.txt.enc',
        size: ciphertext.length,
        chunks: 2,
        encrypted: true,
        sha256: shaOf(ciphertext),
        iv: enc.ivB64,
      },
    ],
    {
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 210000,
      salt: 'c2FsdHNhbHRzYWx0c2FsdA==',
    },
  );

  const result = await restoreFromFolder(dir, { passphrase: 'correct horse battery staple' });

  expect(result.files[0].status).toBe('ok');
  const out = await fs.readFile(`${dir}/restored/note.txt`, 'base64');
  expect(Array.from(fromBase64(out))).toEqual(Array.from(utf8ToBytes(plaintext)));
});

test('restore decrypts with the iteration count recorded in the manifest', async () => {
  const dir = '/restore/iters';
  const source = `${dir}/note.txt`;
  const plaintext = 'iterations matter';
  await fs.writeFile(source, toBase64(utf8ToBytes(plaintext)));
  const salt = 'c2FsdHNhbHRzYWx0c2FsdA==';
  const enc = await encryptFile(source, 'pw', salt, 5000);
  const ciphertext = await fs.readFile(enc.path, 'base64');
  await fs.writeFile(`${dir}/note.txt.enc.001`, ciphertext);
  await writeManifest(
    dir,
    [
      {
        name: 'note.txt.enc',
        size: ciphertext.length,
        chunks: 1,
        encrypted: true,
        sha256: shaOf(ciphertext),
        iv: enc.ivB64,
      },
    ],
    {
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 5000,
      salt,
    },
  );

  const result = await restoreFromFolder(dir, { passphrase: 'pw' });

  expect(result.files[0].status).toBe('ok');
  const out = await fs.readFile(`${dir}/restored/note.txt`, 'base64');
  expect(Array.from(fromBase64(out))).toEqual(Array.from(utf8ToBytes(plaintext)));
});

test('wrong passphrase surfaces as a readable error, not a crash', async () => {
  const dir = '/restore/wrongpass';
  const source = `${dir}/note.txt`;
  await fs.writeFile(source, toBase64(utf8ToBytes('secret')));
  const enc = await encryptFile(source, 'right', 'c2FsdHNhbHRzYWx0c2FsdA==');
  const ciphertext = await fs.readFile(enc.path, 'base64');
  await fs.writeFile(`${dir}/note.txt.enc.001`, ciphertext);
  await writeManifest(
    dir,
    [
      {
        name: 'note.txt.enc',
        size: ciphertext.length,
        chunks: 1,
        encrypted: true,
        sha256: shaOf(ciphertext),
        iv: enc.ivB64,
      },
    ],
    {
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 210000,
      salt: 'c2FsdHNhbHRzYWx0c2FsdA==',
    },
  );

  const result = await restoreFromFolder(dir, { passphrase: 'wrong' });

  expect(result.files[0].status).toBe('failed');
  expect(result.files[0].error).toContain('Passphrase');
});

test('a missing part fails that file while the other still succeeds', async () => {
  const dir = '/restore/partial';
  await fs.writeFile(`${dir}/good.txt.001`, 'AAA');
  await fs.writeFile(`${dir}/bad.txt.001`, 'BBB');
  await writeManifest(dir, [
    { name: 'good.txt', size: 3, chunks: 1, encrypted: false, sha256: shaOf('AAA') },
    { name: 'bad.txt', size: 6, chunks: 2, encrypted: false, sha256: shaOf('BBBBBB') },
  ]);

  const result = await restoreFromFolder(dir);

  expect(result.status).toBe('partial');
  expect(result.succeeded).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.files[0].status).toBe('ok');
  expect(result.files[1].status).toBe('failed');
  expect(result.files[1].error).toContain('bad.txt.002');
  expect(await fs.readFile(`${dir}/restored/good.txt`)).toBe('AAA');
});

test('malformed manifests are rejected with a clear error', () => {
  expect(() => parseManifest('not json')).toThrow(/JSON/);
  expect(() => parseManifest(JSON.stringify({ version: '2.0', files: [] }))).toThrow(/Versi/);
  expect(() => parseManifest(JSON.stringify({ version: '1.0' }))).toThrow(/session_id/);
  expect(() =>
    parseManifest(
      JSON.stringify({
        version: '1.0',
        session_id: 's',
        device: 'd',
        created_at: 0,
        total_size: 0,
        files: [{ name: 'a.zip', size: 1, chunks: 0, encrypted: false, sha256: 'x' }],
      }),
    ),
  ).toThrow(/potongan/);
});

/** Build a one-entry manifest whose file name is exactly `name`. */
function manifestWithName(name: string): string {
  return JSON.stringify({
    version: '1.0',
    session_id: 's',
    device: 'd',
    created_at: 0,
    total_size: 1,
    files: [{ name, size: 1, chunks: 1, encrypted: false, sha256: 'x' }],
  });
}

test('P2: a manifest file name that could escape the output directory is rejected', () => {
  const unsafe = ['../../evil', 'a/b', '..\\evil', '/etc/passwd', 'C:\\evil', '..'];
  for (const name of unsafe) {
    expect(() => parseManifest(manifestWithName(name))).toThrow(/nama berkas/i);
  }
});

test('P2: an ordinary manifest file name still parses', () => {
  const manifest = parseManifest(manifestWithName('DCIM_123.zip'));
  expect(manifest.files[0].name).toBe('DCIM_123.zip');
});

test('P1-5: toFileUri turns a bare path into a file:// uri and leaves real uris alone', () => {
  expect(toFileUri('/data/user/0/app/cache/restored/DCIM_x.zip')).toBe(
    'file:///data/user/0/app/cache/restored/DCIM_x.zip',
  );
  expect(toFileUri('file:///data/keep.zip')).toBe('file:///data/keep.zip');
  expect(toFileUri('content://media/external/images/1')).toBe('content://media/external/images/1');
});

test('a folder without a manifest is rejected with an Indonesian error', async () => {
  await expect(restoreFromFolder('/restore/empty')).rejects.toThrow(/manifest/i);
});

test('resolveParts maps chunk names to picked paths in ascending order', () => {
  const file: ManifestFile = {
    name: 'DCIM.zip',
    size: 0,
    chunks: 3,
    encrypted: false,
    sha256: 'x',
  };

  const result = resolveParts(file, [
    '/picked/DCIM.zip.003',
    '/picked/DCIM.zip.001',
    '/picked/DCIM.zip.002',
  ]);

  expect(result.parts).toEqual([
    '/picked/DCIM.zip.001',
    '/picked/DCIM.zip.002',
    '/picked/DCIM.zip.003',
  ]);
  expect(result.missing).toEqual([]);
});

test('resolveParts reports the missing chunk names', () => {
  const file: ManifestFile = {
    name: 'DCIM.zip',
    size: 0,
    chunks: 3,
    encrypted: false,
    sha256: 'x',
  };

  const result = resolveParts(file, ['/picked/DCIM.zip.001', '/picked/DCIM.zip.003']);

  expect(result.parts).toEqual(['/picked/DCIM.zip.001', '/picked/DCIM.zip.003']);
  expect(result.missing).toEqual(['DCIM.zip.002']);
});

test('findManifestPath locates the manifest by basename in a flat list', () => {
  expect(findManifestPath(['/picked/a.001', '/picked/manifest.json'])).toBe(
    '/picked/manifest.json',
  );
  expect(findManifestPath(['/picked/a.001'])).toBeNull();
});

test('findManifestPath also matches a manifest named after its archive', () => {
  expect(findManifestPath(['/picked/x.zip.001', '/picked/x.zip.manifest.json'])).toBe(
    '/picked/x.zip.manifest.json',
  );
  expect(findManifestPaths(['/picked/a.zip.manifest.json', '/picked/note.txt', '/picked/b.zip.manifest.json'])).toEqual([
    '/picked/a.zip.manifest.json',
    '/picked/b.zip.manifest.json',
  ]);
});

test('restoreFromFiles merges one manifest per archive', async () => {
  const dir = '/picked';
  await fs.writeFile(`${dir}/a.zip.001`, 'AAA');
  await fs.writeFile(`${dir}/b.zip.001`, 'BBB');
  const entry = (name: string, sha256: string): ManifestFile => ({
    name,
    size: 3,
    chunks: 1,
    encrypted: false,
    sha256,
  });
  await fs.writeFile(
    `${dir}/a.zip.manifest.json`,
    manifestToJson(createManifest('Pixel 7', 1, [entry('a.zip', shaOf('AAA'))], 'session-1')),
  );
  await fs.writeFile(
    `${dir}/b.zip.manifest.json`,
    manifestToJson(createManifest('Pixel 7', 1, [entry('b.zip', shaOf('BBB'))], 'session-1')),
  );

  const result = await restoreFromFiles([
    `${dir}/a.zip.001`,
    `${dir}/b.zip.001`,
    `${dir}/a.zip.manifest.json`,
    `${dir}/b.zip.manifest.json`,
  ]);

  expect(result.status).toBe('success');
  expect(result.files.map(file => file.outputPath)).toEqual([
    '/cache/restored/a.zip',
    '/cache/restored/b.zip',
  ]);
});

test('manifests with different encryption parameters do not merge', () => {
  expect(() =>
    mergeManifests([
      createManifest('Pixel 7', 1, [], 'session-1', {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: 210000,
        salt: 'c2FsdHNhbHRzYWx0c2FsdA==',
      }),
      createManifest('Pixel 7', 1, [], 'session-1', {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: 5000,
        salt: 'c2FsdHNhbHRzYWx0c2FsdA==',
      }),
    ]),
  ).toThrow(/parameter enkripsi/i);
});

test('restoreFromFolder finds a manifest named after its archive', async () => {
  const dir = '/restore/named';
  await fs.writeFile(`${dir}/a.zip.001`, 'AAA');
  const manifest = createManifest(
    'Pixel 7',
    1,
    [{ name: 'a.zip', size: 3, chunks: 1, encrypted: false, sha256: shaOf('AAA') }],
    'session-1',
  );
  await fs.writeFile(`${dir}/a.zip.manifest.json`, manifestToJson(manifest));
  (ReactNativeBlobUtil.fs.ls as unknown as jest.Mock).mockResolvedValueOnce(['a.zip.manifest.json']);

  const result = await restoreFromFolder(dir);

  expect(result.status).toBe('success');
  expect(await fs.readFile(`${dir}/restored/a.zip`)).toBe('AAA');
});

test('restoreFromFiles joins parts from a flat picked-file list', async () => {
  const dir = '/picked';
  await fs.writeFile(`${dir}/note.txt.001`, 'AAA');
  await fs.writeFile(`${dir}/note.txt.002`, 'BBB');
  await writeManifest(dir, [
    { name: 'note.txt', size: 6, chunks: 2, encrypted: false, sha256: shaOf('AAABBB') },
  ]);

  const result = await restoreFromFiles([
    `${dir}/note.txt.002`,
    `${dir}/manifest.json`,
    `${dir}/note.txt.001`,
  ]);

  expect(result.status).toBe('success');
  expect(result.files[0].outputPath).toBe('/cache/restored/note.txt');
  expect(await fs.readFile('/cache/restored/note.txt')).toBe('AAABBB');
});

test('restoreFromFiles reports a missing part per file while the other succeeds', async () => {
  const dir = '/picked';
  await fs.writeFile(`${dir}/good.txt.001`, 'AAA');
  await fs.writeFile(`${dir}/bad.txt.001`, 'BBB');
  await writeManifest(dir, [
    { name: 'good.txt', size: 3, chunks: 1, encrypted: false, sha256: shaOf('AAA') },
    { name: 'bad.txt', size: 6, chunks: 2, encrypted: false, sha256: shaOf('BBBBBB') },
  ]);

  const result = await restoreFromFiles([
    `${dir}/good.txt.001`,
    `${dir}/bad.txt.001`,
    `${dir}/manifest.json`,
  ]);

  expect(result.status).toBe('partial');
  expect(result.succeeded).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.files[0].status).toBe('ok');
  expect(result.files[1].status).toBe('failed');
  expect(result.files[1].error).toContain('bad.txt.002');
  expect(await fs.readFile('/cache/restored/good.txt')).toBe('AAA');
});

test('restoreFromFiles without a manifest in the list is rejected', async () => {
  await fs.writeFile('/picked/note.txt.001', 'AAA');
  await expect(restoreFromFiles(['/picked/note.txt.001'])).rejects.toThrow(/manifest/i);
});

test('a zip entry is kept as a saveable archive and extracted beside it', async () => {
  const dir = '/picked';
  await fs.writeFile(`${dir}/DCIM.zip.001`, 'ZIPDATA');
  await writeManifest(dir, [
    { name: 'DCIM.zip', size: 7, chunks: 1, encrypted: false, sha256: shaOf('ZIPDATA') },
  ]);

  const result = await restoreFromFiles([`${dir}/DCIM.zip.001`, `${dir}/manifest.json`]);

  expect(result.files[0].status).toBe('ok');
  expect(result.files[0].outputPath).toBe('/cache/restored/DCIM.zip');
  expect(result.files[0].extractedPath).toBe('/cache/restored/DCIM');
  expect(await fs.readFile('/cache/restored/DCIM.zip')).toBe('ZIPDATA');
});

test('restoreFromFiles honors an explicit outputDir', async () => {
  const dir = '/picked';
  await fs.writeFile(`${dir}/note.txt.001`, 'AAA');
  await writeManifest(dir, [
    { name: 'note.txt', size: 3, chunks: 1, encrypted: false, sha256: shaOf('AAA') },
  ]);

  const result = await restoreFromFiles([`${dir}/note.txt.001`, `${dir}/manifest.json`], {
    outputDir: '/doc/restored',
  });

  expect(result.files[0].outputPath).toBe('/doc/restored/note.txt');
});

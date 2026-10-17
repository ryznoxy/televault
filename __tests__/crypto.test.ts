import ReactNativeBlobUtil from 'react-native-blob-util';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import {
  decryptFile,
  encryptFile,
  isCryptoAvailable,
  newSaltB64,
  toBase64,
  fromBase64,
} from '../src/backup/crypto';
import { passphraseStrength } from '../src/state/passphrase';

const fs = ReactNativeBlobUtil.fs as unknown as {
  readFile: (path: string, enc: string) => Promise<string>;
  writeFile: jest.Mock;
};

beforeEach(async () => {
  await fs.writeFile('/tmp/plain', toBase64(utf8ToBytes('hello tele vault')));
});

test('isCryptoAvailable is true with webcrypto polyfill', () => {
  expect(isCryptoAvailable()).toBe(true);
});

test('isCryptoAvailable reads globalThis.crypto lazily, not at module load', () => {
  const holder = globalThis as unknown as { crypto?: unknown };
  const saved = holder.crypto;
  try {
    holder.crypto = undefined;
    expect(isCryptoAvailable()).toBe(false);
    holder.crypto = saved;
    expect(isCryptoAvailable()).toBe(true);
  } finally {
    holder.crypto = saved;
  }
});

test('encrypt then decrypt roundtrips plaintext', async () => {
  const salt = newSaltB64();
  const enc = await encryptFile('/tmp/plain', 'correct horse battery staple', salt);
  expect(enc.path).toBe('/tmp/plain.enc');
  const out = await decryptFile(enc.path, 'correct horse battery staple', salt, enc.ivB64, '/tmp/plain.dec');
  expect(out).toBe('/tmp/plain.dec');
  const bytes = fromBase64(await fs.readFile('/tmp/plain.dec', 'base64'));
  expect(Array.from(bytes)).toEqual(Array.from(utf8ToBytes('hello tele vault')));
});

test('P2-f: encryptFile writes the ciphertext to the given staging path, not beside the source', async () => {
  const salt = newSaltB64();
  fs.writeFile.mockClear();
  const source = '/storage/emulated/0/Download/report.pdf';

  const enc = await encryptFile(source, 'pw', salt, 210000, '/cache/staging_7/report.pdf.enc');

  expect(enc.path).toBe('/cache/staging_7/report.pdf.enc');
  expect(fs.writeFile).toHaveBeenCalledWith(
    '/cache/staging_7/report.pdf.enc',
    expect.any(String),
    'base64',
  );
  const written = fs.writeFile.mock.calls.map(call => String(call[0]));
  expect(written).not.toContain(`${source}.enc`);
});

test('encrypt/decrypt roundtrips with a non-default iteration count', async () => {
  const salt = newSaltB64();
  const enc = await encryptFile('/tmp/plain', 'pw', salt, 5000);
  const out = await decryptFile(enc.path, 'pw', salt, enc.ivB64, '/tmp/plain.dec', 5000);
  expect(out).toBe('/tmp/plain.dec');
  const bytes = fromBase64(await fs.readFile('/tmp/plain.dec', 'base64'));
  expect(Array.from(bytes)).toEqual(Array.from(utf8ToBytes('hello tele vault')));
});

test('decrypt with the wrong iteration count fails to authenticate', async () => {
  const salt = newSaltB64();
  const enc = await encryptFile('/tmp/plain', 'pw', salt, 1000);
  await expect(
    decryptFile(enc.path, 'pw', salt, enc.ivB64, '/tmp/plain.dec', 500),
  ).rejects.toBeDefined();
});

test('wrong passphrase fails to decrypt', async () => {
  const salt = newSaltB64();
  const enc = await encryptFile('/tmp/plain', 'right', salt);
  await expect(
    decryptFile(enc.path, 'wrong', salt, enc.ivB64, '/tmp/plain.dec'),
  ).rejects.toBeDefined();
});

test('newSaltB64 yields distinct base64 salts', () => {
  const a = newSaltB64();
  const b = newSaltB64();
  expect(a).not.toBe(b);
  expect(a.length).toBeGreaterThanOrEqual(20);
});

test('passphraseStrength thresholds', () => {
  expect(passphraseStrength('')).toEqual({ score: 0, label: 'Kosong' });
  expect(passphraseStrength('abc').label).toBe('Lemah');
  expect(passphraseStrength('abcdefghij12').label).toBe('Sedang');
  expect(passphraseStrength('Abcdefghij12!').label).toBe('Kuat');
  expect(passphraseStrength('Abcdefghijklmnop1!').label).toBe('Sangat kuat');
});

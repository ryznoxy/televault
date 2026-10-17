import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import ReactNativeBlobUtil from 'react-native-blob-util';

const PBKDF2_ITERATIONS = 210000;
const KEY_LEN = 32;
const IV_LEN = 12;
const SALT_LEN = 16;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

type CryptoLike = { getRandomValues?: (b: Uint8Array) => unknown };

/**
 * Read `globalThis.crypto` lazily. Capturing it at module scope would make
 * whether encryption works depend on import order for the whole process: a
 * polyfill installed after this module loads would never be seen (P1-8).
 */
function globalCrypto(): CryptoLike | undefined {
  return (globalThis as unknown as { crypto?: CryptoLike }).crypto;
}

export function isCryptoAvailable(): boolean {
  return typeof globalCrypto()?.getRandomValues === 'function';
}

export function randomBytes(n: number): Uint8Array {
  const c = globalCrypto() as { getRandomValues: (b: Uint8Array) => unknown } | undefined;
  if (!c) {
    throw new Error('crypto.getRandomValues tidak tersedia');
  }
  const out = new Uint8Array(n);
  c.getRandomValues(out);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1] ?? 0;
    const b3 = bytes[i + 2] ?? 0;
    out += B64[b1 >> 2];
    out += B64[((b1 & 3) << 4) | (b2 >> 4)];
    out += i + 1 < bytes.length ? B64[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[b3 & 63] : '=';
  }
  return out;
}

export function fromBase64(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const map: Record<string, number> = {};
  for (let i = 0; i < B64.length; i += 1) {
    map[B64[i]] = i;
  }
  const n = clean.length;
  const out = new Uint8Array(Math.floor((n * 3) / 4));
  let p = 0;
  for (let i = 0; i < n; i += 4) {
    const c1 = map[clean[i]] ?? 0;
    const c2 = map[clean[i + 1]] ?? 0;
    const c3 = clean[i + 2] ? map[clean[i + 2]] : 0;
    const c4 = clean[i + 3] ? map[clean[i + 3]] : 0;
    out[p++] = (c1 << 2) | (c2 >> 4);
    if (clean[i + 2]) out[p++] = ((c2 & 15) << 4) | (c3 >> 2);
    if (clean[i + 3]) out[p++] = ((c3 & 3) << 6) | c4;
  }
  return out;
}

export function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Uint8Array {
  const pass = utf8ToBytes(passphrase);
  return pbkdf2(sha256, pass, salt, { c: iterations, dkLen: KEY_LEN });
}

export function newSaltB64(): string {
  return toBase64(randomBytes(SALT_LEN));
}

export type EncryptedFile = {
  path: string;
  ivB64: string;
  size: number;
};

/** Derive the run's AES key from the passphrase and its stored salt. */
export function keyFromPassphrase(
  passphrase: string,
  saltB64: string,
  iterations: number = PBKDF2_ITERATIONS,
): Uint8Array {
  return deriveKey(passphrase, fromBase64(saltB64), iterations);
}

/**
 * Encrypt one file with an already-derived key and write the ciphertext to
 * `outPath`.
 *
 * Callers pass one 49 MB upload part at a time, so peak RAM is bounded by the
 * part, not by the archive: whole-archive encryption needed the plaintext, the
 * ciphertext and both base64 copies of a multi-GB zip in the JS heap at once
 * and killed the app on real photo libraries (P0).
 *
 * ponytail: one part in RAM at a time (base64 + plaintext + ciphertext ≈ 3x the
 * part). Upgrade path: a small native module that streams AES-GCM.
 */
export async function encryptFileWithKey(
  sourcePath: string,
  key: Uint8Array,
  outPath: string,
): Promise<EncryptedFile> {
  const b64 = await ReactNativeBlobUtil.fs.readFile(sourcePath, 'base64');
  const bytes = fromBase64(typeof b64 === 'string' ? b64 : String(b64));
  const iv = randomBytes(IV_LEN);
  const ct = gcm(key, iv).encrypt(bytes);
  await ReactNativeBlobUtil.fs.writeFile(outPath, toBase64(ct), 'base64');
  return { path: outPath, ivB64: toBase64(iv), size: ct.length };
}

/** Decrypt one part (v2 manifest) with the run's key into `outPath`. */
export async function decryptFileWithKey(
  encryptedPath: string,
  key: Uint8Array,
  ivB64: string,
  outPath: string,
): Promise<string> {
  const b64 = await ReactNativeBlobUtil.fs.readFile(encryptedPath, 'base64');
  const bytes = fromBase64(typeof b64 === 'string' ? b64 : String(b64));
  const pt = gcm(key, fromBase64(ivB64)).decrypt(bytes);
  await ReactNativeBlobUtil.fs.writeFile(outPath, toBase64(pt), 'base64');
  return outPath;
}

/**
 * Encrypt `sourcePath` and write the ciphertext to `outPath`.
 *
 * `outPath` defaults to `<source>.enc` only so callers whose source already
 * lives somewhere writable keep working (restore fixtures). The backup runner
 * always passes a path inside its cache staging dir: DOC/CUSTOM sources are real
 * public paths, so `<source>.enc` would land in a directory API 30+ blocks and
 * leave a stray file beside the user's data (P2-f).
 */
export async function encryptFile(
  sourcePath: string,
  passphrase: string,
  saltB64: string,
  iterations: number = PBKDF2_ITERATIONS,
  outPath: string = `${sourcePath}.enc`,
): Promise<EncryptedFile> {
  return encryptFileWithKey(sourcePath, keyFromPassphrase(passphrase, saltB64, iterations), outPath);
}

export async function decryptFile(
  encryptedPath: string,
  passphrase: string,
  saltB64: string,
  ivB64: string,
  outPath: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  return decryptFileWithKey(
    encryptedPath,
    keyFromPassphrase(passphrase, saltB64, iterations),
    ivB64,
    outPath,
  );
}

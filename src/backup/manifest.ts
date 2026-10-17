import { chunkName } from './chunker';

export type ManifestEncryption = {
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
};

export type ManifestFile = {
  name: string;
  size: number;
  chunks: number;
  encrypted: boolean;
  sha256: string;
  iv?: string;
};

export type Manifest = {
  sessionId: string;
  device: string;
  createdAt: number;
  files: ManifestFile[];
  totalSize: number;
  encryption?: ManifestEncryption;
};

export function createManifest(
  device: string,
  timestampMs: number,
  files: ManifestFile[],
  sessionId: string,
  encryption?: ManifestEncryption,
): Manifest {
  const manifest: Manifest = {
    sessionId,
    device,
    createdAt: Math.floor(timestampMs / 1000),
    files,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
  };
  if (encryption) {
    manifest.encryption = encryption;
  }
  return manifest;
}

/** Name of the manifest, the reassembly scripts and the base they share. */
export function manifestFileName(base: string): string {
  return `${base}.manifest.json`;
}

export function reassembleScriptName(base: string, ext: 'sh' | 'bat'): string {
  return `${base}.reassemble.${ext}`;
}

/** POSIX single-quote: wrap in ' and turn each embedded ' into '\''. */
function shQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** Windows `copy /b` operands. A `"` in a name cannot be escaped in cmd. */
function batQuote(value: string): string {
  return `"${value}"`;
}

const DECRYPT_NOTE = (manifestName: string): string =>
  `# AES-256-GCM encrypted archive: reassemble first, then decrypt with the KDF
# parameters recorded in ${manifestName} (algorithm, kdf, iterations, salt, iv).
# openssl cannot stream AES-256-GCM. Example with Python:
#   pip install cryptography
#   python -c "import json,base64; from cryptography.hazmat.primitives.ciphers.aead import AESGCM; from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC; from cryptography.hazmat.primitives import hashes; m=json.load(open('${manifestName}')); salt=base64.b64decode(m['encryption']['salt']); k=PBKDF2HMAC(hashes.SHA256(),32,salt,m['encryption']['iterations']).derive(b'YOUR_PASSPHRASE'); [AESGCM(k).decrypt(base64.b64decode(f['iv']),open(f['name'],'rb').read(),None) for f in m['files']]"`;

/**
 * Reassembly scripts for one manifest. Every archive name and part count is
 * known here, so the script is concrete: no jq, no Python, just `cat`/`copy`.
 */
export function reassemblyScripts(
  manifest: Manifest,
  manifestName: string,
): { sh: string; bat: string } {
  const encrypted = manifest.encryption !== undefined || manifest.files.some(file => file.encrypted);
  const shLines = [
    '#!/bin/bash',
    `# TeleVault reassembly for ${manifestName}`,
    '# Place this script beside the downloaded chunks, then run it with bash.',
    ...(encrypted ? [DECRYPT_NOTE(manifestName)] : []),
    'set -e',
    '',
    ...manifest.files.map(file => {
      const parts = Array.from({ length: file.chunks }, (_, index) =>
        shQuote(chunkName(file.name, index + 1)),
      ).join(' ');
      return `cat ${parts} > ${shQuote(file.name)}`;
    }),
    '',
    ...manifest.files.map(file => `echo "Done: ${file.name}"`),
    'echo "Reassembly complete."',
  ];
  const batLines = [
    '@echo off',
    `REM TeleVault reassembly for ${manifestName}`,
    'REM Place this script beside the downloaded chunks, then run it.',
    ...(encrypted
      ? [
          `REM AES-256-GCM encrypted archive: reassemble, then decrypt with the KDF`,
          `REM parameters recorded in ${manifestName} (algorithm, kdf, iterations, salt, iv).`,
        ]
      : []),
    'setlocal',
    '',
    ...manifest.files.map(file => {
      const parts = Array.from({ length: file.chunks }, (_, index) =>
        batQuote(chunkName(file.name, index + 1)),
      ).join('+');
      return `copy /b ${parts} ${batQuote(file.name)} >nul`;
    }),
    '',
    ...manifest.files.map(file => `echo Done: ${file.name}`),
    'echo Reassembly complete.',
    'endlocal',
  ];
  return { sh: shLines.join('\n'), bat: batLines.join('\n') };
}

function reassemblyCommand(files: ManifestFile[]): string {
  return files
    .map(file => {
      const parts = Array.from(
        { length: file.chunks },
        (_, index) => shQuote(`${file.name}.${String(index + 1).padStart(3, '0')}`),
      ).join(' ');
      return `cat ${parts} > ${shQuote(file.name)}`;
    })
    .join(' ');
}

export function manifestToJson(manifest: Manifest): string {
  const payload: Record<string, unknown> = {
    version: '1.0',
    session_id: manifest.sessionId,
    device: manifest.device,
    created_at: manifest.createdAt,
    files: manifest.files.map(file => {
      const entry: Record<string, unknown> = {
        name: file.name,
        size: file.size,
        chunks: file.chunks,
        encrypted: file.encrypted,
        sha256: file.sha256,
      };
      if (file.iv) {
        entry.iv = file.iv;
      }
      return entry;
    }),
    total_size: manifest.totalSize,
    reassembly: reassemblyCommand(manifest.files),
  };
  if (manifest.encryption) {
    payload.encryption = manifest.encryption;
  }
  return JSON.stringify(payload, null, 2);
}

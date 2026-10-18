import {
  createManifest,
  manifestFileName,
  manifestToJson,
  reassembleScriptName,
  reassemblyScripts,
  type ManifestFile,
} from '../src/backup/manifest';

const files: ManifestFile[] = [
  { name: 'DCIM.zip', size: 120 * 1024 * 1024, chunks: 3, encrypted: false, sha256: 'abc' },
  { name: 'Pictures.zip', size: 500, chunks: 1, encrypted: false, sha256: 'def' },
];

test('createManifest converts timestamp to seconds and sums sizes', () => {
  const manifest = createManifest('Pixel 7', 1694524800000, files, 'session-1');
  expect(manifest.createdAt).toBe(1694524800);
  expect(manifest.totalSize).toBe(120 * 1024 * 1024 + 500);
});

test('manifest JSON matches the locked PRD shape', () => {
  const manifest = createManifest('Pixel 7', 1694524800000, files, 'session-1');
  const json = JSON.parse(manifestToJson(manifest));
  expect(json.version).toBe('2.0');
  expect(json.session_id).toBe('session-1');
  expect(json.device).toBe('Pixel 7');
  expect(json.files[0]).toEqual({
    name: 'DCIM.zip',
    size: 120 * 1024 * 1024,
    chunks: 3,
    encrypted: false,
    sha256: 'abc',
  });
  expect(json.reassembly).toBe(
    "cat 'DCIM.zip.001' 'DCIM.zip.002' 'DCIM.zip.003' > 'DCIM.zip' cat 'Pictures.zip.001' > 'Pictures.zip'",
  );
});

test('reassembly quotes a filename containing a space', () => {
  const spaced: ManifestFile[] = [
    { name: 'DCIM 2024-09.zip', size: 10, chunks: 2, encrypted: false, sha256: 'x' },
  ];
  const json = JSON.parse(manifestToJson(createManifest('Pixel 7', 0, spaced, 's')));
  expect(json.reassembly).toBe(
    "cat 'DCIM 2024-09.zip.001' 'DCIM 2024-09.zip.002' > 'DCIM 2024-09.zip'",
  );
});

test('reassembly escapes parentheses and single quotes for sh', () => {
  const tricky: ManifestFile[] = [
    { name: "Vacation (2024) O'Brien.zip", size: 10, chunks: 1, encrypted: false, sha256: 'x' },
  ];
  const json = JSON.parse(manifestToJson(createManifest('Pixel 7', 0, tricky, 's')));
  expect(json.reassembly).toBe(
    "cat 'Vacation (2024) O'\\''Brien.zip.001' > 'Vacation (2024) O'\\''Brien.zip'",
  );
});

test('manifest and scripts are named after their archive', () => {
  expect(manifestFileName('DCIM_1729.zip')).toBe('DCIM_1729.zip.manifest.json');
  expect(reassembleScriptName('DCIM_1729.zip', 'sh')).toBe('DCIM_1729.zip.reassemble.sh');
  expect(reassembleScriptName('DCIM_1729.zip', 'bat')).toBe('DCIM_1729.zip.reassemble.bat');
});

test('reassembly scripts carry the concrete names, so no jq or Python is needed', () => {
  const manifest = createManifest('Pixel 7', 0, [files[0]], 's');
  const scripts = reassemblyScripts(manifest, 'DCIM.zip.manifest.json');

  expect(scripts.sh).toContain(
    "cat 'DCIM.zip.001' 'DCIM.zip.002' 'DCIM.zip.003' > 'DCIM.zip'",
  );
  expect(scripts.sh).not.toContain('jq');
  expect(scripts.sh).toContain('DCIM.zip.manifest.json');
  expect(scripts.bat).toContain(
    'copy /b "DCIM.zip.001"+"DCIM.zip.002"+"DCIM.zip.003" "DCIM.zip" >nul',
  );
  expect(scripts.bat).not.toContain('python');
});

test('an encrypted manifest points its scripts at the decrypt parameters', () => {
  const manifest = createManifest('Pixel 7', 0, [{ ...files[1], encrypted: true }], 's', {
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 210000,
    salt: 'c2FsdHNhbHRzYWx0c2FsdA==',
  });
  const scripts = reassemblyScripts(manifest, 'DCIM.zip.enc.manifest.json');

  expect(scripts.sh).toContain('AES-256-GCM');
  expect(scripts.sh).toContain('DCIM.zip.enc.manifest.json');
  expect(scripts.bat).toContain('DCIM.zip.enc.manifest.json');
});

test('P0-1: a v2 entry serialises one IV per part and the scripts say so', () => {
  const manifest = createManifest(
    'Pixel 7',
    0,
    [
      {
        name: 'DCIM.zip.enc',
        size: 10,
        chunks: 2,
        encrypted: true,
        sha256: 'x',
        ivs: ['aXYtMQ==', 'aXYtMg=='],
      },
    ],
    's',
    {
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 210000,
      salt: 'c2FsdHNhbHRzYWx0c2FsdA==',
    },
  );
  const json = JSON.parse(manifestToJson(manifest));
  expect(json.files[0].ivs).toEqual(['aXYtMQ==', 'aXYtMg==']);
  expect(json.files[0].iv).toBeUndefined();

  // The generated note must describe per-part decryption, not a single blob.
  const scripts = reassemblyScripts(manifest, 'DCIM.zip.enc.manifest.json');
  expect(scripts.sh).toContain('every part is encrypted on its own');
  expect(scripts.sh).toContain('"ivs"');
  expect(scripts.bat).toContain('Decrypt every part');
});

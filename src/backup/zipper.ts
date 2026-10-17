import { zip } from 'react-native-zip-archive';

export async function zipFiles(sourcePaths: string[], outputPath: string): Promise<string> {
  if (sourcePaths.length === 0) {
    throw new Error('zipFiles: no source paths');
  }
  return zip(sourcePaths, outputPath);
}

/**
 * 7z writing is not possible in this build.
 *
 * ponytail: react-native-zip-archive is ZIP-only and there is no maintained
 * pure-JS 7z *writer* that runs on Hermes (no WASM). Upgrade path: ship a small
 * native module wrapping 7-Zip/p7zip, or move the engine to a local Bot API
 * server and archive server-side. Until then this stays false.
 */
export function is7zAvailable(): boolean {
  return false;
}

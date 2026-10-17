import ReactNativeBlobUtil from 'react-native-blob-util';

export async function sha256File(path: string): Promise<string> {
  return ReactNativeBlobUtil.fs.hash(path, 'sha256');
}

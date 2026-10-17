type ClipboardLike = { setString: (s: string) => void } | null;

let impl: ClipboardLike = null;
try {
  impl = require('@react-native-clipboard/clipboard').default;
} catch {
  impl = null;
}

export const clipboard = {
  setString(text: string) {
    if (impl) {
      impl.setString(text);
      return;
    }
    try {
      const rn = require('react-native');
      if (rn.Clipboard?.setString) {
        rn.Clipboard.setString(text);
      }
    } catch {
      // no clipboard available
    }
  },
  available(): boolean {
    return impl != null;
  },
};

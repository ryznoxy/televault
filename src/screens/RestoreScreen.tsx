import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  keepLocalCopy,
  pick,
  pickDirectory,
  saveDocuments,
  types,
} from '@react-native-documents/picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { AppHeader, TgIcon } from '../components/ui';
import { FONT, ON_ACCENT, TG_LIGHT,  RADIUS, tgTheme, type TGPalette } from '../theme/theme';
import {
  findManifestPath,
  loadManifestFromFolder,
  loadManifestFromPaths,
  restoreFromFiles,
  restoreFromFolder,
  toFileUri,
  type RestoreFileResult,
  type RestorePhase,
  type RestoreResult,
} from '../backup/restoreRunner';
import type { Manifest } from '../backup/manifest';
import type { RootStackParamList } from '../navigation/Routes';

type Props = NativeStackScreenProps<RootStackParamList, 'Restore'>;

type SaveState = { uri?: string; error?: string };

function baseName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mimeFor(path: string): string {
  return path.toLowerCase().endsWith('.zip') ? 'application/zip' : 'application/octet-stream';
}

function phaseLabel(phase: RestorePhase): string {
  switch (phase) {
    case 'joining':
      return 'Menggabungkan potongan\u2026';
    case 'verifying':
      return 'Memeriksa checksum\u2026';
    case 'decrypting':
      return 'Mendekripsi berkas\u2026';
    case 'extracting':
      return 'Mengekstrak arsip\u2026';
    default:
      return 'Selesai';
  }
}

export default function RestoreScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const gutter = isTablet ? 24 : 16;

  const [files, setFiles] = useState<string[] | null>(null);
  const [dir, setDir] = useState<string | null>(null);
  const [folderHint, setFolderHint] = useState<string | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [copyErrors, setCopyErrors] = useState<string[]>([]);
  const [passphrase, setPassphrase] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    index: number;
    total: number;
    phase: RestorePhase;
  } | null>(null);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [saved, setSaved] = useState<Record<string, SaveState>>({});
  const [error, setError] = useState<string | null>(null);

  const encrypted = manifest
    ? manifest.encryption !== undefined || manifest.files.some(file => file.encrypted)
    : false;

  const reset = () => {
    setManifest(null);
    setResult(null);
    setSaved({});
    setError(null);
    setProgress(null);
    setCopyErrors([]);
  };

  const loadManifest = async (load: () => Promise<Manifest>) => {
    try {
      setManifest(await load());
    } catch (caught) {
      setManifest(null);
      setError(messageOf(caught));
    }
  };

  const onPickFiles = async () => {
    try {
      const picked = await pick({ allowMultiSelection: true, type: [types.allFiles] });
      const toCopy = picked.map(item => ({
        uri: item.uri,
        fileName: item.name ?? 'berkas.bin',
      }));
      const copies = await keepLocalCopy({
        files: [toCopy[0], ...toCopy.slice(1)],
        destination: 'cachesDirectory',
      });
      const paths: string[] = [];
      const errors: string[] = [];
      for (const copy of copies) {
        if (copy.status === 'success') {
          paths.push(copy.localUri.replace(/^file:\/\//, ''));
        } else {
          errors.push(`${baseName(copy.sourceUri)}: ${copy.copyError}`);
        }
      }
      reset();
      setDir(null);
      setFiles(paths);
      setCopyErrors(errors);
      if (!findManifestPath(paths)) {
        setError('Manifest tidak ditemukan di antara berkas yang dipilih.');
        return;
      }
      await loadManifest(() => loadManifestFromPaths(paths));
    } catch {
      // user cancelled
    }
  };

  const onPickFolder = async () => {
    try {
      const picked = await pickDirectory();
      const path = picked.uri.replace(/^file:\/\//, '');
      reset();
      setFiles(null);
      if (path.startsWith('content://')) {
        setDir(null);
        setFolderHint(
          'Android tidak mengizinkan aplikasi membaca folder lewat pemilih folder. Pakai "Pilih berkas backup" di atas.',
        );
        return;
      }
      setFolderHint(null);
      setDir(path);
      await loadManifest(() => loadManifestFromFolder(path));
    } catch {
      // user cancelled
    }
  };

  const onRestore = async () => {
    setBusy(true);
    setResult(null);
    setError(null);
    setProgress(null);
    setSaved({});
    try {
      const options = {
        passphrase: passphrase.trim() === '' ? undefined : passphrase,
        outputDir: `${ReactNativeBlobUtil.fs.dirs.CacheDir}/restored`,
        onProgress: (update: { index: number; total: number; phase: RestorePhase }) =>
          setProgress({ index: update.index, total: update.total, phase: update.phase }),
      };
      const next = files
        ? await restoreFromFiles(files, options)
        : await restoreFromFolder(dir as string, options);
      setResult(next);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  const onSaveResult = async (file: RestoreFileResult) => {
    const outputPath = file.outputPath;
    if (!outputPath) {
      return;
    }
    try {
      const responses = await saveDocuments({
        sourceUris: [toFileUri(outputPath)],
        fileName: baseName(outputPath),
        mimeType: mimeFor(outputPath),
      });
      const first = responses[0];
      setSaved(previous => ({
        ...previous,
        [outputPath]: first.error ? { error: first.error } : { uri: first.uri },
      }));
    } catch (caught) {
      setSaved(previous => ({ ...previous, [outputPath]: { error: messageOf(caught) } }));
    }
  };

  const hasSource = files !== null || dir !== null;
  const canRestore =
    hasSource && !!manifest && !busy && (!encrypted || passphrase.trim() !== '');
  const sourceLabel = files
    ? `${files.length} berkas dipilih`
    : dir
      ? dir.split('/').slice(-2).join('/')
      : 'Belum ada sumber dipilih';

  return (
    <View style={[styles.root, { backgroundColor: TG.bg }]}>
      <AppHeader subtitle="Pulihkan" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: 16,
          paddingBottom: 40 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <View style={styles.card}>
            <View style={styles.guidanceRow}>
              <View style={styles.guidanceIcon}>
                <TgIcon name="folderZip" color={TG.primaryContainer} size={24} />
              </View>
              <View style={styles.guidanceText}>
                <Text style={styles.guidanceTitle}>Pulihkan tanpa PC</Text>
                <Text style={styles.guidanceBody}>
                  Unduh semua potongan berkas dan manifest (manifest.json atau
                  &lt;nama&gt;.manifest.json) dari chat Telegram, lalu pilih semuanya sekaligus di
                  sini.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>SUMBER BACKUP</Text>
            <View style={styles.folderRow}>
              <TgIcon name={files ? 'fileText' : 'folder'} color={TG.secondary} size={18} />
              <Text style={styles.folderText} numberOfLines={1} ellipsizeMode="middle">
                {sourceLabel}
              </Text>
            </View>
            {manifest ? (
              <Text style={styles.metaText}>
                {manifest.files.length} berkas &middot; {manifest.device}
                {encrypted ? ' \u00b7 terenkripsi' : ''}
              </Text>
            ) : null}

            <Pressable
              onPress={onPickFiles}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [
                styles.primaryButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <TgIcon name="fileText" color={ON_ACCENT.strong} size={20} />
              <Text style={styles.primaryButtonText} numberOfLines={1}>
                Pilih berkas backup
              </Text>
            </Pressable>

            <Pressable
              onPress={onPickFolder}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [
                styles.secondaryButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <TgIcon name="folder" color={TG.onPrimaryContainer} size={20} />
              <Text style={styles.secondaryButtonText} numberOfLines={1}>
                Pilih folder backup
              </Text>
            </Pressable>

            {folderHint ? <Text style={styles.hintText}>{folderHint}</Text> : null}

            {copyErrors.length > 0 ? (
              <View style={styles.errorBanner}>
                <TgIcon name="error" color={TG.error} size={18} />
                <Text style={styles.errorText} numberOfLines={4}>
                  {`Gagal menyalin: ${copyErrors.join('; ')}`}
                </Text>
              </View>
            ) : null}
          </View>

          {encrypted ? (
            <View style={styles.card}>
              <View style={styles.labelInline}>
                <Text style={styles.label}>PASSPHRASE</Text>
                <TgIcon name="lock" color={TG.primary} size={15} />
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  value={passphrase}
                  onChangeText={setPassphrase}
                  placeholder="Passphrase saat backup dibuat"
                  placeholderTextColor={TG.outline}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Passphrase dekripsi"
                  style={styles.codeInput}
                  numberOfLines={1}
                />
                <View style={styles.inputActions}>
                  <Pressable
                    onPress={() => setShowPass(value => !value)}
                    accessibilityRole="button"
                    accessibilityLabel={showPass ? 'Sembunyikan passphrase' : 'Tampilkan passphrase'}
                    hitSlop={10}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <TgIcon name={showPass ? 'eyeOff' : 'eye'} color={TG.secondary} size={18} />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={onRestore}
            disabled={!canRestore}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canRestore }}
            style={({ pressed }) => [
              styles.primaryButton,
              !canRestore && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={ON_ACCENT.strong} size="small" />
            ) : (
              <TgIcon name="download" color={ON_ACCENT.strong} size={20} />
            )}
            <Text style={styles.primaryButtonText} numberOfLines={1}>
              {busy ? 'Memulihkan\u2026' : 'Pulihkan Sekarang'}
            </Text>
          </Pressable>

          {busy && progress ? (
            <Text accessibilityLiveRegion="polite" style={styles.progressText}>
              {phaseLabel(progress.phase)}
              {progress.total > 0
                ? ` (${Math.min(progress.index, progress.total)}/${progress.total})`
                : ''}
            </Text>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <TgIcon name="error" color={TG.error} size={18} />
              <Text style={styles.errorText} numberOfLines={4}>
                {error}
              </Text>
            </View>
          ) : null}

          {result ? (
            <View style={styles.card}>
              <Text style={styles.label}>HASIL PEMULIHAN</Text>
              <Text style={styles.metaText}>
                {result.succeeded} berhasil &middot; {result.failed} gagal
              </Text>
              {result.files.map(file => {
                const state = file.outputPath ? saved[file.outputPath] : undefined;
                return (
                  <View key={file.name} style={styles.resultRow}>
                    <TgIcon
                      name={file.status === 'ok' ? 'checkCircle' : 'error'}
                      color={file.status === 'ok' ? TG.primary : TG.error}
                      size={18}
                    />
                    <View style={styles.resultText}>
                      <Text style={styles.resultName} numberOfLines={1} ellipsizeMode="middle">
                        {file.name}
                      </Text>
                      <Text
                        style={[styles.resultMeta, file.status === 'failed' && { color: TG.error }]}
                        numberOfLines={3}>
                        {file.status === 'ok' ? file.outputPath : file.error}
                      </Text>
                      {file.extractedPath ? (
                        <Text style={styles.resultMeta} numberOfLines={2}>
                          Diekstrak ke {file.extractedPath}
                        </Text>
                      ) : null}
                      {state?.uri ? (
                        <Text style={styles.resultSaved} numberOfLines={2}>
                          Tersimpan: {state.uri}
                        </Text>
                      ) : null}
                      {state?.error ? (
                        <Text style={styles.resultMeta} numberOfLines={2}>
                          {state.error}
                        </Text>
                      ) : null}
                      {file.status === 'ok' && file.outputPath ? (
                        <Pressable
                          onPress={() => onSaveResult(file)}
                          accessibilityRole="button"
                          accessibilityLabel={`Simpan hasil ${file.name}`}
                          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                          <TgIcon name="download" color={TG.primary} size={16} />
                          <Text style={styles.saveButtonText} numberOfLines={1}>
                            Simpan hasil
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_SHADOW = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  shadowColor: TG_LIGHT.ink,
};

const createStyles = (TG: TGPalette) => StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 },

  card: {
    backgroundColor: TG.card,
    borderRadius: RADIUS.md,
    padding: 16,
    gap: 12,
    ...CARD_SHADOW,
  },

  guidanceRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  guidanceIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: TG.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceText: { flex: 1, minWidth: 0, gap: 4 },
  guidanceTitle: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '600', fontFamily: FONT.semi },
  guidanceBody: { color: TG.secondary, fontSize: 13, lineHeight: 19 },

  label: { color: TG.ink, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi, letterSpacing: 0.5 },
  labelInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: TG.low,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  folderText: { color: TG.ink, fontSize: 13, lineHeight: 18, flex: 1, minWidth: 0 },
  metaText: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  hintText: { color: TG.secondary, fontSize: 12, lineHeight: 17 },

  inputWrap: { position: 'relative' },
  codeInput: {
    backgroundColor: TG.low,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    color: TG.ink,
    fontSize: 13,
    letterSpacing: 0.2,
    paddingRight: 56,
  },
  inputActions: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    backgroundColor: TG.onPrimaryContainer,
  },
  primaryButtonText: { color: ON_ACCENT.strong, fontSize: 15, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    backgroundColor: TG.low,
  },
  secondaryButtonText: {
    color: TG.onPrimaryContainer,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600', fontFamily: FONT.semi,
    flexShrink: 1,
  },

  progressText: { color: TG.secondary, fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: TG.errorSoft,
  },
  errorText: { color: TG.error, fontSize: 13, lineHeight: 18, flex: 1, minWidth: 0 },

  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resultText: { flex: 1, minWidth: 0, gap: 2 },
  resultName: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi },
  resultMeta: { color: TG.secondary, fontSize: 12, lineHeight: 16 },
  resultSaved: { color: TG.primary, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: RADIUS.md,
    backgroundColor: TG.low,
    marginTop: 4,
  },
  saveButtonText: { color: TG.primary, fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: FONT.semi },

  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});

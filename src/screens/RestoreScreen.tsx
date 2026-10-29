import React, { useEffect, useState } from 'react';
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
  isManifestName,
  loadManifestFromFolder,
  loadManifestFromPaths,
  parseManifest,
  partNames,
  restoreFromFiles,
  restoreFromFolder,
  restoreFromManifest,
  restoreFromTelegram,
  toFileUri,
  type RestoreFileResult,
  type RestorePhase,
  type RestoreResult,
} from '../backup/restoreRunner';
import { sessionsRepo, type SessionRecord } from '../db/repositories/sessions';
import { chunksRepo } from '../db/repositories/chunks';
import { secureStore } from '../state/secureStore';
import { TelegramBotApi } from '../net/telegramApi';
import { listSafFolder } from '../backup/safFolder';
import { partNameFor } from '../backup/chunker';
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
  const styles = createStyles(TG, mode);
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
  const [tgSessions, setTgSessions] = useState<SessionRecord[]>([]);
  const [tgSession, setTgSession] = useState<SessionRecord | null>(null);
  const [manifestDocs, setManifestDocs] = useState<
    Array<{ fileId: string; fileName: string; messageId: number; date: number }> | null
  >(null);
  const [importedManifest, setImportedManifest] = useState<{
    manifest: Manifest;
    manifestFileId: string;
    manifestPath: string;
  } | null>(null);

  useEffect(() => {
    sessionsRepo
      .recentRestorable()
      .then(setTgSessions)
      .catch(() => undefined);
  }, []);

  const encrypted = manifest
    ? manifest.encryption !== undefined || manifest.files.some(file => file.encrypted)
    : tgSession?.encrypted === 1;

  const reset = () => {
    setManifest(null);
    setResult(null);
    setSaved({});
    setError(null);
    setProgress(null);
    setCopyErrors([]);
    setImportedManifest(null);
    setManifestDocs(null);
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
      const uri = picked.uri;
      reset();
      setFiles(null);
      setDir(null);
      setFolderHint(null);
      setImportedManifest(null);
      if (uri.startsWith('content://')) {
        // Android SAF tree: enumerate the picked folder, copy only the manifest
        // and the parts it names into the cache, then restore from that set.
        const entries = await listSafFolder(uri);
        const manifestEntries = entries.filter(entry => isManifestName(entry.displayName));
        if (manifestEntries.length === 0) {
          setError('Manifest tidak ditemukan di folder yang dipilih.');
          return;
        }
        const copyEntries = async (list: typeof entries) => {
          const toCopy = list.map(entry => ({ uri: entry.path, fileName: entry.displayName }));
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
          return { paths, errors };
        };

        const manifestCopies = await copyEntries(manifestEntries);
        const loaded = await loadManifestFromPaths(manifestCopies.paths);
        const wanted = new Set(manifestEntries.map(entry => entry.displayName));
        for (const file of loaded.files) {
          for (let index = 1; index <= file.chunks; index += 1) {
            for (const name of partNames(file, index)) {
              wanted.add(name);
            }
          }
        }
        const partCopies = await copyEntries(entries.filter(entry => wanted.has(entry.displayName)));
        setCopyErrors([...manifestCopies.errors, ...partCopies.errors]);
        setFiles(partCopies.paths);
        setManifest(loaded);
        return;
      }
      const path = uri.replace(/^file:\/\//, '');
      setDir(path);
      await loadManifest(() => loadManifestFromFolder(path));
    } catch {
      // user cancelled
    }
  };

  /** Download and parse a manifest the user forwarded to the bot. */
  const onImportManifest = async (doc: {
    fileId: string;
    fileName: string;
    messageId: number;
    date: number;
  }) => {
    setBusy(true);
    setError(null);
    try {
      const credentials = await secureStore.get();
      const api = new TelegramBotApi(credentials.botToken, credentials.chatId);
      const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/imported_${doc.messageId || Date.now()}.manifest.json`;
      await api.downloadFile(doc.fileId, path);
      const raw = await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
      const parsed = parseManifest(typeof raw === 'string' ? raw : String(raw));
      reset();
      setFiles(null);
      setDir(null);
      setFolderHint(null);
      setManifestDocs(null);
      setManifest(parsed);
      setImportedManifest({ manifest: parsed, manifestFileId: doc.fileId, manifestPath: path });
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  /** Pick a `*.manifest.json` straight from the device storage. */
  const onPickManifest = async () => {
    try {
      const picked = await pick({ allowMultiSelection: false, type: [types.allFiles] });
      const first = picked[0];
      if (!first) {
        return;
      }
      const copies = await keepLocalCopy({
        files: [{ uri: first.uri, fileName: first.name ?? 'manifest.json' }],
        destination: 'cachesDirectory',
      });
      const copy = copies[0];
      if (!copy || copy.status !== 'success') {
        throw new Error(copy?.copyError ?? 'Berkas manifest gagal dibaca');
      }
      const path = copy.localUri.replace(/^file:\/\//, '');
      const raw = await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
      const parsed = parseManifest(typeof raw === 'string' ? raw : String(raw));
      reset();
      setFiles(null);
      setDir(null);
      setFolderHint(null);
      setManifestDocs(null);
      setManifest(parsed);
      setImportedManifest({ manifest: parsed, manifestFileId: '', manifestPath: path });
    } catch {
      // user cancelled or unreadable file
    }
  };

  /** Scan the bot chat for forwarded manifests. */
  const onScanManifests = async () => {
    setBusy(true);
    setError(null);
    setManifestDocs(null);
    try {
      const credentials = await secureStore.get();
      const api = new TelegramBotApi(credentials.botToken, credentials.chatId);
      const docs = await api.getRecentManifestDocuments();
      setManifestDocs(docs);
      if (docs.length === 0) {
        setError('Tidak ada manifest ditemukan. Teruskan berkas *.manifest.json ke bot, lalu coba lagi.');
      }
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Store a restored session in the local DB so it shows up in the restore
   * list next time (fresh install path).
   */
  const persistImportedSession = async (source: Manifest, manifestFileId: string) => {
    const chunksTotal = source.files.reduce((sum, file) => sum + file.chunks, 0);
    const sessionId = await sessionsRepo.insertImportedSession({
      startedAt: source.createdAt * 1000,
      finishedAt: Date.now(),
      totalFiles: source.files.length,
      totalSize: source.totalSize,
      chunksTotal,
      chunksSent: chunksTotal,
      status: 'success',
      manifestId: source.sessionId,
      manifestFileIds: manifestFileId,
      encrypted: source.encryption ? 1 : 0,
    });
    for (const file of source.files) {
      for (let part = 1; part <= file.chunks; part += 1) {
        const name = partNameFor(file.name, part, file.chunks);
        const recorded = file.parts?.find(entry => entry.name === name);
        await chunksRepo.insertImportedPart(
          sessionId,
          part,
          0,
          name,
          recorded?.fileId ?? null,
          recorded?.messageId ?? null,
        );
      }
    }
    setTgSessions(await sessionsRepo.recentRestorable());
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
      let next: RestoreResult;
      if (importedManifest) {
        const credentials = await secureStore.get();
        const api = new TelegramBotApi(credentials.botToken, credentials.chatId);
        next = await restoreFromManifest(importedManifest.manifest, api, options);
        if (importedManifest.manifestFileId !== '' && next.status !== 'failed') {
          await persistImportedSession(importedManifest.manifest, importedManifest.manifestFileId).catch(
            () => undefined,
          );
        }
      } else if (files) {
        next = await restoreFromFiles(files, options);
      } else {
        next = await restoreFromFolder(dir as string, options);
      }
      setResult(next);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  const onPickTelegramSession = (session: SessionRecord) => {
    reset();
    setFiles(null);
    setDir(null);
    setFolderHint(null);
    setTgSession(session);
  };

  const onRestoreTelegram = async () => {
    const session = tgSession;
    if (!session || !session.manifest_file_ids) {
      return;
    }
    setBusy(true);
    setResult(null);
    setError(null);
    setProgress(null);
    setSaved({});
    try {
      const passphraseInput = passphrase.trim();
      const stored =
        passphraseInput !== '' ? { encryptionPassword: passphraseInput } : await secureStore.get();
      if (session.encrypted === 1 && (stored.encryptionPassword ?? '').trim() === '') {
        throw new Error('Backup ini terenkripsi. Isi passphrase dulu di bawah, atau simpan passphrase di layar Setup.');
      }
      const credentials = await secureStore.get();
      const api = new TelegramBotApi(credentials.botToken, credentials.chatId);
      const next = await restoreFromTelegram(api, session.id, session.manifest_file_ids, {
        ...(stored.encryptionPassword?.trim() ? { passphrase: stored.encryptionPassword.trim() } : {}),
        outputDir: `${ReactNativeBlobUtil.fs.dirs.CacheDir}/restored_${session.id}`,
        onProgress: (update: { index: number; total: number; phase: RestorePhase }) =>
          setProgress({ index: update.index, total: update.total, phase: update.phase }),
      });
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

  const hasSource = files !== null || dir !== null || importedManifest !== null;
  const canRestore =
    hasSource && !!manifest && !busy && (!encrypted || passphrase.trim() !== '');
  const sourceLabel = importedManifest
    ? `Manifest ${baseName(importedManifest.manifestPath)}`
    : files
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
              <TgIcon name="fileText" color={mode === 'dark' ? '#003147' : ON_ACCENT.strong} size={20} />
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
                Pulihkan dari folder
              </Text>
            </Pressable>

            <Pressable
              onPress={onPickManifest}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [
                styles.secondaryButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <TgIcon name="fileText" color={TG.onPrimaryContainer} size={20} />
              <Text style={styles.secondaryButtonText} numberOfLines={1}>
                Pilih berkas manifest
              </Text>
            </Pressable>

            <Pressable
              onPress={onScanManifests}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [
                styles.secondaryButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <TgIcon name="download" color={TG.onPrimaryContainer} size={20} />
              <Text style={styles.secondaryButtonText} numberOfLines={1}>
                Impor manifest dari Telegram
              </Text>
            </Pressable>

            {manifestDocs && manifestDocs.length > 0 ? (
              <View>
                <Text style={styles.hintText}>
                  Manifest ditemukan di chat bot — pilih satu untuk dipulihkan.
                </Text>
                {manifestDocs.map(doc => (
                  <Pressable
                    key={`${doc.fileId}-${doc.messageId}`}
                    onPress={() => onImportManifest(doc)}
                    disabled={busy}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.tgSessionRow,
                      busy && styles.disabled,
                      pressed && styles.pressed,
                    ]}>
                    <TgIcon name="fileText" color={TG.secondary} size={18} />
                    <View style={styles.tgSessionText}>
                      <Text style={styles.tgSessionTitle} numberOfLines={1} ellipsizeMode="middle">
                        {doc.fileName}
                      </Text>
                      <Text style={styles.tgSessionMeta} numberOfLines={1}>
                        {new Date(doc.date * 1000).toLocaleString('id-ID')}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {importedManifest ? (
              <Text style={styles.metaText}>
                Manifest diimpor &middot; {importedManifest.manifest.files.length} berkas
              </Text>
            ) : null}

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

          {tgSessions.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.label}>RESTORE LANGSUNG DARI BOT</Text>
              <Text style={styles.hintText}>
                Pilih sesi backup — manifest dan semua potongan diunduh otomatis dari
                chat bot, tanpa perlu download manual. Hanya backup yang dibuat
                setelah pembaruan ini yang tersedia di sini.
              </Text>
              {tgSessions.map(session => {
                const selected = tgSession?.id === session.id;
                const date = new Date(session.started_at);
                const label = `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} \u00b7 ${session.total_files} berkas${session.encrypted === 1 ? ' \u00b7 terenkripsi' : ''}`;
                return (
                  <Pressable
                    key={session.id}
                    onPress={() => onPickTelegramSession(session)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.tgSessionRow,
                      selected && styles.tgSessionRowSelected,
                      pressed && styles.pressed,
                    ]}>
                    <TgIcon name={selected ? 'checkCircle' : 'download'} color={selected ? TG.primary : TG.secondary} size={18} />
                    <View style={styles.tgSessionText}>
                      <Text style={styles.tgSessionTitle} numberOfLines={1} ellipsizeMode="middle">
                        {session.archive_name ?? `Backup #${session.id}`}
                      </Text>
                      <Text style={styles.tgSessionMeta} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {tgSession ? (
                <Pressable
                  onPress={onRestoreTelegram}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    busy && styles.disabled,
                    pressed && styles.pressed,
                  ]}>
                  {busy ? (
                    <ActivityIndicator color={mode === 'dark' ? '#003147' : ON_ACCENT.strong} size="small" />
                  ) : (
                    <TgIcon name="download" color={mode === 'dark' ? '#003147' : ON_ACCENT.strong} size={20} />
                  )}
                  <Text style={styles.primaryButtonText} numberOfLines={1}>
                    {busy ? 'Mengunduh & memulihkan\u2026' : 'Pulihkan Sesi Ini'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

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
              <ActivityIndicator color={mode === 'dark' ? '#003147' : ON_ACCENT.strong} size="small" />
            ) : (
              <TgIcon name="download" color={mode === 'dark' ? '#003147' : ON_ACCENT.strong} size={20} />
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

const createStyles = (TG: TGPalette, mode: 'light' | 'dark') => StyleSheet.create({
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

  tgSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: TG.low,
  },
  tgSessionRowSelected: { backgroundColor: TG.container },
  tgSessionText: { flex: 1, minWidth: 0, gap: 2 },
  tgSessionTitle: { color: TG.ink, fontSize: 13, lineHeight: 18, fontFamily: FONT.semi, fontWeight: '600' },
  tgSessionMeta: { color: TG.secondary, fontSize: 12, lineHeight: 16 },

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
    backgroundColor: TG.primary,
  },
  primaryButtonText: { color: mode === 'dark' ? '#003147' : ON_ACCENT.strong, fontSize: 15, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },
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

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { pickDirectory } from '@react-native-documents/picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import {
  AppHeader,
  ProgressBar,
  ProgressRing,
  PulsingDot,
  TgIcon,
  useToast,
  type TgIconName,
} from '../components/ui';
import { FONT,  RADIUS, tgTheme, TG_LIGHT as TG } from '../theme/theme';import { runBackupInForeground, BACKUP_IN_FLIGHT_ERROR } from '../background/foregroundService';
import { isFileUri } from '../backup/fileScanner';
import { requestNotificationPermission } from '../backup/permissions';
import { filesRepo } from '../db/repositories/files';
import { sessionsRepo, type SessionRecord } from '../db/repositories/sessions';
import { TelegramBotApi } from '../net/telegramApi';
import { secureStore } from '../state/secureStore';
import { useSettingsStore } from '../state/settingsStore';
import {
  CATEGORY_LABELS,
  makeWatchedFolder,
  ScheduleMode,
  type BackupConfig,
  type CategoryKey,
  type WatchedFolder,
} from '../types/models';
import type { RootStackParamList } from '../navigation/Routes';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) {
    return 'Baru saja';
  }
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) {
    return `${minutes} menit lalu`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} jam lalu`;
  }
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function nextRunLabel(config: BackupConfig): string {
  if (config.automationPaused || config.scheduleMode === ScheduleMode.MANUAL) {
    return config.automationPaused ? 'Off' : 'Manual';
  }
  if (config.scheduleMode === ScheduleMode.TIME) {
    return `${String(config.scheduledTimeHour).padStart(2, '0')}:00`;
  }
  if (config.scheduleMode === ScheduleMode.INTERVAL) {
    return `+${config.intervalHours} jam`;
  }
  return 'Saat mengisi';
}

function folderIcon(name: string): TgIconName {
  if (/photo|image|gambar|camera|dcim|picture/i.test(name)) {
    return 'image';
  }
  if (/db|database|sqlite|backup/i.test(name)) {
    return 'database';
  }
  return 'folder';
}

/** Turn engine phases into plain-language status text. */
function phaseText(phase: string, category?: string, current = 0, total = 0): string {
  switch (phase) {
    case 'scanning':
      return 'Mencari berkas baru\u2026';
    case 'zipping':
      return 'Menyiapkan berkas\u2026';
    case 'uploading':
      return total > 0
        ? `Mengunggah ${category ?? 'berkas'} (${current}/${total})\u2026`
        : 'Mengunggah\u2026';
    case 'manifest':
      return 'Menyimpan indeks backup\u2026';
    default:
      return 'Menyelesaikan\u2026';
  }
}

/** Short verb for the progress bar, so it never claims to be uploading while zipping. */
function barVerb(phase: string): string {
  switch (phase) {
    case 'scanning':
      return 'Memindai';
    case 'zipping':
      return 'Menyiapkan';
    case 'manifest':
      return 'Menyimpan indeks';
    default:
      return 'Mengunggah';
  }
}

export default function HomeScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const gutter = isTablet ? 24 : 16;

  const config = useSettingsStore(state => state.config);
  const setWifiOnly = useSettingsStore(state => state.setWifiOnly);
  const setCompressZip = useSettingsStore(state => state.setCompressZip);
  const setAutomationPaused = useSettingsStore(state => state.setAutomationPaused);
  const addWatchedFolder = useSettingsStore(state => state.addWatchedFolder);

  const { toast, showToast } = useToast('bottom');

  const [configured, setConfigured] = useState(false);
  const [chatId, setChatId] = useState('');
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [ratio, setRatio] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState<{
    current: number;
    total: number;
    category?: string;
    verb: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const ok = await secureStore.isConfigured();
    setConfigured(ok);
    const credentials = await secureStore.get();
    setChatId(credentials.chatId);
    setLastSession(await sessionsRepo.lastSuccess());
    setTotalSize(await sessionsRepo.totalUploadedSize());
    setFileCount(await filesRepo.count());

    const sessions = await sessionsRepo.recent(200);
    const since = Date.now() - MONTH_MS;
    const inWindow = sessions.filter(session => session.started_at >= since);
    const succeeded = inWindow.filter(session => session.status === 'success').length;
    setRatio(inWindow.length > 0 ? succeeded / inWindow.length : null);

    if (ok && credentials.botToken.trim()) {
      const started = Date.now();
      try {
        const api = new TelegramBotApi(credentials.botToken, credentials.chatId);
        setBotUsername(await api.testConnection());
        setLatencyMs(Date.now() - started);
      } catch {
        setBotUsername(null);
        setLatencyMs(null);
      }
    } else {
      setBotUsername(null);
      setLatencyMs(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refresh);
    refresh();
    return unsubscribe;
  }, [navigation, refresh]);

  const onBackupNow = async () => {
    setBusy(true);
    setFailed(false);
    setProgress(0);
    setProgressLabel(null);
    setStatus('Memulai backup\u2026');
    try {
      // The foreground service notification needs this grant on Android 13+;
      // ask here, where the user just tapped something (P2-4).
      await requestNotificationPermission();
      const result = await runBackupInForeground(next => {
        setStatus(phaseText(next.phase, next.category, next.current, next.total));
        if (next.overall.total > 0) {
          setProgress(next.overall.current / next.overall.total);
          setProgressLabel({
            current: next.overall.current,
            total: next.overall.total,
            category: next.category,
            verb: barVerb(next.phase),
          });
        }
      });
      const note = result.notes && result.notes.length > 0 ? ` ${result.notes.join(' ')}` : '';
      if (result.status === 'failed' && result.error === BACKUP_IN_FLIGHT_ERROR) {
        setFailed(true);
        setStatus(`${BACKUP_IN_FLIGHT_ERROR}.`);
      } else {
        setFailed(result.status === 'failed');
        setProgress(1);
        const summary =
          result.status === 'success'
            ? result.files === 0
              ? 'Semua berkas sudah tercadangkan. Tidak ada yang baru.'
              : result.deferred > 0
                ? `Backup selesai. ${result.files} berkas diunggah, ${result.deferred} tersisa dan akan lanjut otomatis di backup berikutnya.`
                : `Backup selesai. ${result.files} berkas diunggah.`
            : result.status === 'partial'
              ? 'Backup selesai dengan peringatan. Lihat Riwayat untuk detail.'
              : `Backup gagal. ${result.error ?? 'Coba lagi nanti.'}`;
        setStatus(`${summary}${note}`);
      }
      await refresh();
    } catch (error) {
      setFailed(true);
      setStatus(error instanceof Error ? error.message : 'Backup gagal');
    } finally {
      setBusy(false);
    }
  };

  const onAddFolder = async () => {
    try {
      const result = await pickDirectory();
      // Android hands back a `content://` SAF tree the scanner cannot walk;
      // storing it would show a successful backup that read nothing.
      if (!isFileUri(result.uri)) {
        showToast(
          'Folder tidak didukung',
          'Android memberi akses folder sebagai content:// yang belum bisa dibaca aplikasi ini.',
          'error',
        );
        return;
      }
      addWatchedFolder(makeWatchedFolder(result.uri));
    } catch {
      // user cancelled
    }
  };

  const onTogglePause = () => {
    setAutomationPaused(!config.automationPaused);
  };

  const botLabel = configured
    ? botUsername ?? (chatId ? `Chat ${chatId}` : 'Bot')
    : 'Belum terhubung';
  const channelLabel = chatId ? `Channel: ${chatId}` : 'Channel: belum diatur';
  const ringProgress = busy ? progress : lastSession ? 1 : 0;
  const progressCategory =
    progressLabel?.category !== undefined
      ? CATEGORY_LABELS[progressLabel.category as CategoryKey] ?? progressLabel.category
      : null;
  const lastRunLabel = lastSession ? relativeTime(lastSession.finished_at ?? lastSession.started_at) : 'Belum ada backup';
  const sizeLabel = lastSession
    ? `${formatBytes(lastSession.total_size)} berhasil diunggah ke channel`
    : 'Belum ada data terunggah';
  const shaValid = !!lastSession?.manifest_id;

  const contentContainer = {
    paddingHorizontal: gutter,
    paddingTop: 16,
    paddingBottom: 120 + insets.bottom,
  };

  return (
    <View style={[styles.root, { backgroundColor: TG.bg }]}>
      <AppHeader subtitle="Utama" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {/* Status Koneksi */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={[styles.pill, { backgroundColor: TG.container }]}>
                <PulsingDot color={configured ? TG.primaryContainer : TG.outline} />
                <Text style={[styles.pillText, { color: TG.onPrimaryContainer }]} numberOfLines={1}>
                  {configured ? 'Sistem Aktif & Terenkripsi' : 'Perlu Setup'}
                </Text>
              </View>
              {latencyMs != null ? (
                <View style={[styles.pill, styles.latencyPill]}>
                  <TgIcon name="bolt" color={TG.primary} size={12} />
                  <Text style={[styles.pillText, { color: TG.primary }]}>{latencyMs}ms</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.botRow}>
              <View style={styles.botTile}>
                <TgIcon name="bot" color={TG.onPrimaryContainer} size={22} />
              </View>
              <View style={styles.botText}>
                <View style={styles.botNameRow}>
                  <Text style={styles.botName} numberOfLines={1} ellipsizeMode="tail">
                    {botLabel}
                  </Text>
                  {configured ? (
                    <TgIcon name="verified" color={TG.primaryContainer} size={16} />
                  ) : null}
                </View>
                <View style={styles.channelRow}>
                  <TgIcon name="cloudSync" color={TG.secondary} size={14} />
                  <Text style={styles.channelText} numberOfLines={1} ellipsizeMode="tail">
                    {channelLabel}
                  </Text>
                </View>
              </View>
              {configured ? (
                <View style={[styles.chip, { backgroundColor: TG.primaryFixed }]}>
                  <Text style={[styles.chipText, { color: TG.primary }]}>Online</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => navigation.navigate('Setup')}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: TG.primaryContainer },
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.chipText, { color: '#FFFFFF' }]}>Setup</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Hero Backup Control */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.heroText}>
                <Text style={styles.overline}>STATUS SINKRONISASI</Text>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {busy ? 'Mencadangkan\u2026' : 'Siap Mencadangkan'}
                </Text>
              </View>
              <View style={styles.heroIconTile}>
                <TgIcon name="cloudDone" color={TG.primaryContainer} size={22} />
              </View>
            </View>

            <View style={styles.inset}>
              <ProgressRing
                size={92}
                stroke={8}
                progress={ringProgress}
                color={TG.primaryContainer}
                trackColor={TG.high}>
                <Text style={styles.ringPct}>{Math.round(ringProgress * 100)}%</Text>
              </ProgressRing>
              <View style={styles.insetText}>
                <Text style={styles.insetTitle} numberOfLines={1} ellipsizeMode="tail">
                  {lastRunLabel}
                </Text>
                <Text style={styles.insetMeta} numberOfLines={2}>
                  {sizeLabel}
                </Text>
                {shaValid ? (
                  <Text style={styles.insetHash}>Manifest tersimpan</Text>
                ) : (
                  <Text style={styles.insetNeutral}>Belum ada manifest tersimpan</Text>
                )}
              </View>
            </View>

            {busy && progressLabel && progressLabel.total > 0 ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText} numberOfLines={1}>
                    {`${progressLabel.verb} ${Math.round(progressLabel.current)}/${progressLabel.total} berkas${
                      progressCategory ? ` \u00b7 ${progressCategory}` : ''
                    }`}
                  </Text>
                  <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
                </View>
                <ProgressBar progress={progress} />
              </View>
            ) : null}

            <Pressable
              onPress={onBackupNow}
              disabled={!configured || busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: !configured || busy }}
              style={({ pressed }) => [
                styles.primaryButton,
                (!configured || busy) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <TgIcon name="backup" color="#FFFFFF" size={20} />
              )}
              <Text style={styles.primaryButtonText} numberOfLines={1}>
                {busy ? status ?? 'Mencadangkan\u2026' : 'Mulai Backup Sekarang'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onTogglePause}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <TgIcon
                name={config.automationPaused ? 'play' : 'pause'}
                color={TG.onPrimaryContainer}
                size={20}
              />
              <Text style={styles.secondaryButtonText} numberOfLines={1}>
                {config.automationPaused ? 'Lanjutkan Otomasi' : 'Jeda Otomasi'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Restore')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <TgIcon name="folderZip" color={TG.onPrimaryContainer} size={20} />
              <Text style={styles.secondaryButtonText} numberOfLines={1}>
                Pulihkan Backup
              </Text>
            </Pressable>
          </View>

          {/* Statistik Backup */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Statistik Backup</Text>
            <Text style={styles.sectionAction}>Bulan Ini</Text>
          </View>
          <View style={styles.grid}>
            <StatTile
              icon="box"
              value={formatBytes(totalSize)}
              label="Total Ter-backup"
            />
            <StatTile icon="database" value={formatCount(fileCount)} label="File Tersimpan" />
            <StatTile icon="clock" value={nextRunLabel(config)} label="Jadwal Berikutnya" />
            <StatTile
              icon="verified"
              value={ratio == null ? '\u2014' : `${(ratio * 100).toFixed(1)}%`}
              label="Rasio Keberhasilan"
            />
          </View>

          {/* Folder Terpantau */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Folder Terpantau</Text>
              <View style={[styles.chip, { backgroundColor: TG.primaryFixed }]}>
                <Text style={[styles.chipText, { color: TG.primary }]}>
                  {config.watchedFolders.length} Aktif
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              hitSlop={8}>
              <Text style={styles.sectionLink}>Kelola</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            {config.watchedFolders.length === 0 ? (
              <Text style={styles.emptyText}>
                Belum ada folder dipantau. Tambahkan folder untuk ikut dicadangkan.
              </Text>
            ) : (
              config.watchedFolders.map((folder, index) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  last={index === config.watchedFolders.length - 1}
                  onPress={() => navigation.navigate('Settings')}
                />
              ))
            )}
            <Pressable
              onPress={onAddFolder}
              accessibilityRole="button"
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
              <TgIcon name="addCircle" color={TG.primary} size={20} />
              <Text style={styles.addButtonText} numberOfLines={1}>
                Tambah Folder Pantauan Baru
              </Text>
            </Pressable>
          </View>

          {/* Preferensi Jaringan & File */}
          <Text style={styles.sectionTitle}>Preferensi Jaringan & File</Text>
          <View style={styles.card}>
            <PreferenceRow
              icon="wifi"
              title="Hanya saat terhubung Wi-Fi"
              subtitle="Hemat data seluler saat sync otomatis"
              value={config.wifiOnly}
              onValueChange={setWifiOnly}
            />
            <View style={styles.divider} />
            <PreferenceRow
              icon="archive"
              title="Kompresi ZIP sebelum kirim"
              subtitle="Tingkat kompresi standar (Level 6)"
              value={config.compressZip}
              onValueChange={setCompressZip}
            />
          </View>

          {status && !busy ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.status, { color: failed ? TG.variant : TG.secondary }]}>
              {status}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {toast}
    </View>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: TgIconName;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statIconTile}>
        <TgIcon name={icon} color={TG.primary} size={18} />
      </View>
      <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function FolderRow({
  folder,
  last,
  onPress,
}: {
  folder: WatchedFolder;
  last: boolean;
  onPress: () => void;
}) {
  const meta = folder.schedule === 'realtime' ? 'Real-time sync' : `Otomatis tiap ${folder.schedule}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.folderRow, pressed && styles.pressed]}>
      <View style={styles.folderIconTile}>
        <TgIcon name={folderIcon(folder.name)} color={TG.primary} size={18} />
      </View>
      <View style={styles.folderText}>
        <Text style={styles.folderName} numberOfLines={1} ellipsizeMode="middle">
          {folder.name}
        </Text>
        <Text style={styles.folderMeta} numberOfLines={1} ellipsizeMode="tail">
          {meta}
        </Text>
      </View>
      <View style={styles.folderRight}>
        <View style={styles.statusDot} />
        <TgIcon name="chevron" color={TG.outline} size={16} />
      </View>
      {!last ? <View style={styles.folderDivider} /> : null}
    </Pressable>
  );
}

function PreferenceRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: TgIconName;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefIconTile}>
        <TgIcon name={icon} color={TG.primary} size={18} />
      </View>
      <View style={styles.prefText}>
        <Text style={styles.prefTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <Text style={styles.prefSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={title}
        trackColor={{ false: TG.highest, true: TG.primaryContainer }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={TG.highest}
      />
    </View>
  );
}

const CARD_SHADOW = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  shadowColor: '#0B1C30',
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 },

  card: {
    backgroundColor: TG.card,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    ...CARD_SHADOW,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    flexShrink: 1,
  },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },
  latencyPill: { backgroundColor: TG.low, flexShrink: 0 },

  botRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botTile: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: TG.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botText: { flex: 1, minWidth: 0, gap: 2 },
  botNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  botName: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  channelText: { color: TG.secondary, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    flexShrink: 0,
  },
  chipText: { fontSize: 11, lineHeight: 14, fontWeight: '600', fontFamily: FONT.semi },

  heroText: { flex: 1, minWidth: 0, gap: 2 },
  overline: { color: TG.secondary, fontSize: 11, lineHeight: 14, fontWeight: '600', fontFamily: FONT.semi, letterSpacing: 0.6 },
  heroTitle: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '600', fontFamily: FONT.semi },
  heroIconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TG.container,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: TG.low,
    borderRadius: 8,
    padding: 12,
  },
  insetText: { flex: 1, minWidth: 0, gap: 4 },
  insetTitle: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '700', fontFamily: FONT.bold },
  insetMeta: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  insetHash: { color: TG.primary, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi },
  insetNeutral: { color: TG.outline, fontSize: 12, lineHeight: 16 },
  ringPct: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '700', fontFamily: FONT.bold },

  progressBlock: { gap: 8 },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressText: { color: TG.secondary, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  progressPct: { color: TG.primary, fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 0 },

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
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },
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
  secondaryButtonText: { color: TG.onPrimaryContainer, fontSize: 15, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  sectionTitle: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '600', fontFamily: FONT.semi },
  sectionAction: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  sectionLink: { color: TG.primary, fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: FONT.semi },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statTile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: TG.card,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    ...CARD_SHADOW,
  },
  statIconTile: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: TG.ink, fontSize: 22, lineHeight: 28, fontWeight: '600', fontFamily: FONT.semi },
  statLabel: { color: TG.secondary, fontSize: 13, lineHeight: 18 },

  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  folderIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderText: { flex: 1, minWidth: 0, gap: 2 },
  folderName: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi },
  folderMeta: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  folderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  statusDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: TG.primaryContainer },
  folderDivider: {
    position: 'absolute',
    left: 52,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: TG.highest,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: TG.low,
  },
  addButtonText: { color: TG.primary, fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },
  emptyText: { color: TG.secondary, fontSize: 13, lineHeight: 18 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: TG.highest, marginLeft: 52 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  prefIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefText: { flex: 1, minWidth: 0, gap: 2 },
  prefTitle: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi },
  prefSubtitle: { color: TG.secondary, fontSize: 13, lineHeight: 18 },

  status: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});

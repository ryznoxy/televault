import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
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
  Toggle,
  useToast,
  type TgIconName,
} from '../components/ui';
import { FONT, ELEVATION, ON_ACCENT, RADIUS, SPACE, TG_LIGHT, tgTheme, TYPE, type TGPalette } from '../theme/theme';
import { requestNotificationPermission } from '../backup/permissions';import { filesRepo } from '../db/repositories/files';
import { sessionsRepo, type SessionRecord } from '../db/repositories/sessions';
import { TelegramBotApi } from '../net/telegramApi';
import { secureStore } from '../state/secureStore';
import { useSettingsStore } from '../state/settingsStore';
import { useBackupUiStore } from '../state/backupUiStore';
import {
  CATEGORY_LABELS,
  makeWatchedFolder,
  ScheduleMode,
  type BackupConfig,
  type CategoryKey,
  type WatchedFolder,
} from '../types/models';
import type { RootStackParamList } from '../navigation/Routes';
import { successRatio } from '../state/history';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A session row left `running` by a process the OS killed is swept at the next
 * run's start, which can be a day away. Anything older than the longest a
 * foreground service may live (Android 15 caps `dataSync` at about six hours) is
 * therefore treated as dead, so the home ring cannot spin forever by itself.
 */
const RUN_STALE_MS = 6 * 60 * 60 * 1000;

/** The newest session that is genuinely still in flight, if any. */
async function liveRun(): Promise<SessionRecord | null> {
  const running = await sessionsRepo.running();
  if (!running || Date.now() - running.started_at >= RUN_STALE_MS) {
    return null;
  }
  return running;
}

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

function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const minutes = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (minutes < 60) return sec > 0 ? `${minutes}m ${sec}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
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

export default function HomeScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const gutter = isTablet ? SPACE.lg : SPACE.base;

  const config = useSettingsStore(state => state.config);
  const setWifiOnly = useSettingsStore(state => state.setWifiOnly);
  const setCompressZip = useSettingsStore(state => state.setCompressZip);
  const setAutomationPaused = useSettingsStore(state => state.setAutomationPaused);
  const addWatchedFolder = useSettingsStore(state => state.addWatchedFolder);

  const { toast } = useToast('bottom');

  // Progress lives in the store, not here: the run keeps going in the
  // foreground service while the user is on another screen, and coming back
  // shows exactly where it is instead of looking cancelled.
  const busy = useBackupUiStore(state => state.busy);
  const failed = useBackupUiStore(state => state.failed);
  const progress = useBackupUiStore(state => state.progress);
  const status = useBackupUiStore(state => state.status);
  const progressLabel = useBackupUiStore(state => state.progressLabel);
  const startBackup = useBackupUiStore(state => state.startBackup);

  const [configured, setConfigured] = useState(false);
  const [chatId, setChatId] = useState('');
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [ratio, setRatio] = useState<number | null>(null);
  /**
   * A run started outside this JS runtime (the exact alarm's service, or the
   * background fetch while the app was closed) writes its session row to the DB
   * but not to this store, so the home ring would sit at 0% while it works. The
   * row is the honest source: it is what the notification reports too.
   */
  const [backgroundRun, setBackgroundRun] = useState<SessionRecord | null>(null);

  const refresh = useCallback(async () => {
    const ok = await secureStore.isConfigured();
    setConfigured(ok);
    const credentials = await secureStore.get();
    setChatId(credentials.chatId);
    setLastSession(await sessionsRepo.lastFinished());
    setTotalSize(await sessionsRepo.totalUploadedSize());
    setFileCount(await filesRepo.count());

    const sessions = await sessionsRepo.recent(200);
    const since = Date.now() - MONTH_MS;
    setRatio(successRatio(sessions.filter(session => session.started_at >= since)));
    setBackgroundRun(await liveRun());

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

  // Poll while a run is in flight, so a run this runtime did not start still
  // moves the ring, and pull the results in the moment it ends.
  const runWasLive = useRef(false);
  useEffect(() => {
    const tick = async () => {
      const live = await liveRun().catch(() => null);
      const wasLive = runWasLive.current;
      runWasLive.current = live !== null;
      setBackgroundRun(live);
      if (!live && wasLive) {
        await refresh();
      }
    };
    const timer = setInterval(tick, 3000);
    const unsubscribe = navigation.addListener('focus', tick);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [navigation, refresh]);



  const onBackupNow = async () => {
    try {
      // The foreground service notification needs this grant on Android 13+;
      // ask here, where the user just tapped something (P2-4).
      await requestNotificationPermission();
      await startBackup(async () => {
        await refresh();
      });
    } catch {
      // permission request cancelled; startBackup surfaces its own errors
    }
  };

  const onAddFolder = async () => {
    try {
      const result = await pickDirectory();
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
  const backgroundFraction = backgroundRun
    ? backgroundRun.chunks_total > 0
      ? Math.min(1, backgroundRun.chunks_sent / backgroundRun.chunks_total)
      : 0
    : null;
  const ringProgress = busy
    ? progress
    : backgroundFraction !== null
      ? backgroundFraction
      : lastSession
        ? 1
        : 0;
  const progressCategory =
    progressLabel?.category !== undefined
      ? CATEGORY_LABELS[progressLabel.category as CategoryKey] ?? progressLabel.category
      : null;
  const lastRunLabel = lastSession ? relativeTime(lastSession.finished_at ?? lastSession.started_at) : 'Belum ada backup';
  const insetTitle = backgroundRun ? 'Backup otomatis berjalan' : lastRunLabel;
  const sizeLabel = backgroundRun
    ? `${backgroundRun.chunks_sent}/${backgroundRun.chunks_total} potongan terkirim`
    : lastSession
      ? `${formatBytes(lastSession.total_size)} berhasil diunggah ke channel`
      : 'Belum ada data terunggah';
  const shaValid = !!lastSession?.manifest_id;

  const contentContainer = {
    paddingHorizontal: gutter,
    paddingTop: SPACE.base,
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
                  <Text style={[styles.chipText, { color: TG.onPrimaryContainer }]}>Setup</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Hero Backup Control */}
          <View style={styles.heroCard}>
            <View style={styles.rowBetween}>
              <View style={styles.heroText}>
                <Text style={styles.overline}>
                  {configured ? 'STATUS SINKRONISASI' : 'BELUM TERKONFIGURASI'}
                </Text>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {busy ? 'Mencadangkan\u2026' : backgroundRun ? 'Backup otomatis\u2026' : 'Siap Mencadangkan'}
                </Text>
              </View>
              <View style={styles.heroIconTile}>
                <TgIcon name="cloudDone" color={ON_ACCENT.strong} size={22} />
              </View>
            </View>

            <View style={styles.heroInset}>
              <ProgressRing
                size={92}
                stroke={8}
                progress={ringProgress}
                color={ON_ACCENT.strong}
                trackColor={ON_ACCENT.track}>
                <Text style={styles.ringPct}>{Math.round(ringProgress * 100)}%</Text>
              </ProgressRing>
              <View style={styles.insetText}>
                <Text style={styles.insetTitle} numberOfLines={1} ellipsizeMode="tail">
                  {insetTitle}
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
                    }${progressLabel.speedBps ? ` \u00b7 ${formatSpeed(progressLabel.speedBps)}` : ''}${
                      progressLabel.etaSec ? ` \u00b7 sisa ${formatDuration(progressLabel.etaSec)}` : ''
                    }`}
                  </Text>
                  <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
                </View>
                <ProgressBar progress={progress} />
              </View>
            ) : null}

            {!busy && backgroundRun ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText} numberOfLines={1}>
                    {`Backup otomatis \u00b7 ${backgroundRun.chunks_sent}/${backgroundRun.chunks_total} potongan`}
                  </Text>
                  <Text style={styles.progressPct}>
                    {Math.round((backgroundFraction ?? 0) * 100)}%
                  </Text>
                </View>
                <ProgressBar progress={backgroundFraction ?? 0} />
              </View>
            ) : null}

            <Pressable
              onPress={onBackupNow}
              disabled={!configured || busy || backgroundRun !== null}
              accessibilityRole="button"
              accessibilityState={{ disabled: !configured || busy || backgroundRun !== null }}
              style={({ pressed }) => [
                styles.heroCta,
                (!configured || busy || backgroundRun !== null) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator color="#003147" size="small" />
              ) : (
                <TgIcon name="backup" color="#003147" size={20} />
              )}
              <Text style={styles.heroCtaText} numberOfLines={1}>
                {busy
                  ? status ?? 'Mencadangkan\u2026'
                  : backgroundRun
                    ? 'Backup otomatis sedang berjalan'
                    : 'Mulai Backup Sekarang'}
              </Text>
            </Pressable>

            <View style={styles.heroActions}>
              <Pressable
                onPress={onTogglePause}
                accessibilityRole="button"
                style={({ pressed }) => [styles.heroSecondary, pressed && styles.pressed]}>
                <TgIcon
                  name={config.automationPaused ? 'play' : 'pause'}
                  color={ON_ACCENT.strong}
                  size={18}
                />
                <Text style={styles.heroSecondaryText} numberOfLines={1}>
                  {config.automationPaused ? 'Lanjutkan' : 'Jeda'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Restore')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.heroSecondary, pressed && styles.pressed]}>
                <TgIcon name="folderZip" color={ON_ACCENT.strong} size={18} />
                <Text style={styles.heroSecondaryText} numberOfLines={1}>
                  Pulihkan
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Statistik Backup */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Statistik Backup</Text>
            <Text style={styles.sectionAction}>Bulan Ini</Text>
          </View>          <View style={styles.grid}>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferensi Jaringan & File</Text>
          </View>
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
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
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
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  const meta = folder.schedule === 'realtime' ? 'Real-time sync' : '';
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
        {meta ? (
          <Text style={styles.folderMeta} numberOfLines={1} ellipsizeMode="tail">
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.folderRight}>
        <View style={styles.statusDot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
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
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
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
      <Toggle value={value} onValueChange={onValueChange} accessibilityLabel={title} />
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
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: SPACE.base + SPACE.xs },

  updateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
    ...ELEVATION.card,
  },
  updateText: { flex: 1 },
  updateTitle: { ...TYPE.label, fontWeight: '600' },
  updateSub: { ...TYPE.footnote, marginTop: 2 },

  card: {
    backgroundColor: TG.card,
    borderRadius: RADIUS.lg,
    padding: SPACE.base,
    gap: SPACE.base - SPACE.xs,
    ...CARD_SHADOW,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    flexShrink: 1,
  },
  pillText: { ...TYPE.caption, lineHeight: 16, flexShrink: 1 },
  latencyPill: { backgroundColor: TG.low, flexShrink: 0 },

  botRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
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
  botName: { ...TYPE.headline, color: TG.ink, lineHeight: 22, flexShrink: 1 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  channelText: { ...TYPE.footnote, color: TG.secondary, lineHeight: 18, flexShrink: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.base - 6,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.md,
    flexShrink: 0,
  },
  chipText: { ...TYPE.caption, lineHeight: 14 },

  heroText: { flex: 1, minWidth: 0, gap: 2 },
  heroCard: {
    backgroundColor: TG.primaryContainer,
    borderRadius: RADIUS.xl,
    padding: SPACE.base + SPACE.xs,
    gap: SPACE.base,
    ...ELEVATION.card,
  },
  heroIconTile: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: ON_ACCENT.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: {
    color: ON_ACCENT.body, fontSize: 11, lineHeight: 14, fontWeight: '600',
    fontFamily: FONT.semi, letterSpacing: 0.8,
  },
  heroTitle: { ...TYPE.title, color: ON_ACCENT.strong, lineHeight: 28, fontFamily: FONT.bold },
  heroInset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.base,
    backgroundColor: ON_ACCENT.tint,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
  },
  insetText: { flex: 1, minWidth: 0, gap: SPACE.xs },
  insetTitle: { ...TYPE.label, color: ON_ACCENT.strong, fontFamily: FONT.bold },
  insetMeta: { ...TYPE.footnote, color: ON_ACCENT.body, lineHeight: 18 },
  insetHash: { ...TYPE.caption, color: ON_ACCENT.strong },
  insetNeutral: { ...TYPE.caption, color: ON_ACCENT.muted, fontWeight: '400', fontFamily: FONT.regular },
  ringPct: { ...TYPE.headline, color: ON_ACCENT.strong, fontFamily: FONT.bold },

  progressBlock: { gap: SPACE.sm },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
  },
  progressText: { ...TYPE.footnote, color: ON_ACCENT.body, lineHeight: 18, flexShrink: 1 },
  progressPct: { ...TYPE.caption, color: ON_ACCENT.strong, flexShrink: 0 },

  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
  },
  heroCtaText: {
    color: '#003147', ...TYPE.label, fontFamily: FONT.semi, flexShrink: 1,
  },
  heroActions: { flexDirection: 'row', gap: SPACE.md },
  heroSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: ON_ACCENT.tint,
  },
  heroSecondaryText: { ...TYPE.caption, color: ON_ACCENT.strong, flexShrink: 1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexShrink: 1 },
  sectionTitle: { ...TYPE.headline, color: TG.ink, letterSpacing: -0.2 },
  sectionAction: { ...TYPE.footnote, color: TG.secondary },
  sectionLink: { ...TYPE.footnote, color: TG.primary, fontFamily: FONT.semi },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  statTile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: TG.card,
    borderRadius: RADIUS.lg,
    padding: SPACE.base,
    gap: 6,
    ...CARD_SHADOW,
  },
  statIconTile: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...TYPE.title, color: TG.ink, fontFamily: FONT.bold, lineHeight: 26 },
  statLabel: { ...TYPE.caption, color: TG.secondary, fontWeight: '400', fontFamily: FONT.regular },

  folderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md },
  folderIconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderText: { flex: 1, minWidth: 0, gap: 2 },
  folderName: { ...TYPE.footnote, color: TG.ink, fontFamily: FONT.semi, lineHeight: 20 },
  folderMeta: { ...TYPE.footnote, color: TG.secondary, lineHeight: 18 },
  folderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: TG.primaryContainer,
  },
  // Decorative twin of the row's schedule text — hidden from a11y tree so
  // status is never conveyed by color alone.
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
    borderRadius: RADIUS.md,
    backgroundColor: TG.low,
  },
  addButtonText: { color: TG.primary, fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },
  emptyText: { color: TG.secondary, fontSize: 13, lineHeight: 18 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: TG.highest, marginLeft: 52 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.xs },
  prefIconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefText: { flex: 1, minWidth: 0, gap: 2 },
  prefTitle: { ...TYPE.footnote, color: TG.ink, fontFamily: FONT.semi, lineHeight: 20 },
  prefSubtitle: { ...TYPE.footnote, color: TG.secondary, lineHeight: 18 },

  status: { ...TYPE.footnote, lineHeight: 18, paddingHorizontal: SPACE.xs },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});

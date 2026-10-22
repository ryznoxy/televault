import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { pickDirectory } from '@react-native-documents/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import ReactNativeBlobUtil from 'react-native-blob-util';
import BackgroundService from 'react-native-background-actions';
import {
  AppHeader,
  NumberField,
  PulsingDot,
  SectionLabel,
  TgIcon,
  TgSwitch,
  useToast,
  type TgIconName,
} from '../components/ui';
import { FONT, ON_ACCENT, TG_LIGHT,  RADIUS, tgTheme, type TGPalette } from '../theme/theme';
import { requestNotificationPermission } from '../backup/permissions';
import { isActiveTempDir } from '../backup/tempDirs';
import { isCryptoAvailable, newSaltB64 } from '../backup/crypto';
import { sessionsRepo } from '../db/repositories/sessions';
import { secureStore } from '../state/secureStore';
import { passphraseStrength } from '../state/passphrase';
import { useSettingsStore } from '../state/settingsStore';
import { appVersion, deviceVersionCode } from '../update/updater';
import { useUpdateStore } from '../state/updateStore';
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  Category,
  makeWatchedFolder,
  ScheduleMode,
  type ArchiveFormat,
  type BackupConfig,
  type CategoryKey,
} from '../types/models';
import type { RootStackParamList } from '../navigation/Routes';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
const CARD_SHADOW = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  shadowColor: TG_LIGHT.ink,
};

type FreqKey = 'hour' | 'day' | 'week' | 'realtime';

const FREQ_OPTIONS: { key: FreqKey; label: string }[] = [
  { key: 'hour', label: 'Tiap Jam' },
  { key: 'day', label: 'Harian' },
  { key: 'week', label: 'Mingguan' },
  // Scheduler clamps intervals to the Android minimum of 15 minutes.
  { key: 'realtime', label: '\u00b115 Menit' },
];

const CATEGORY_HINTS: Record<CategoryKey, string> = {
  photo: 'Foto dari kamera perangkat ini',
  video: 'Video hasil rekaman & unduhan',
  doc: 'Folder Download publik — Android 11+ menutupnya',
  contact: 'Kontak telepon',
  sms: 'Pesan teks',
  custom: 'Folder yang Anda pilih sendiri',
};

const CATEGORY_ICONS: Record<CategoryKey, TgIconName> = {
  photo: 'image',
  video: 'play',
  doc: 'folder',
  contact: 'person',
  sms: 'send',
  custom: 'folder',
};

/** Quick picks for the execution-hour stepper. */
const HOUR_PRESETS = [
  { hour: 2, label: '02:00' },
  { hour: 12, label: '12:00' },
  { hour: 22, label: '22:00' },
];

function freqFromConfig(config: BackupConfig): FreqKey | null {
  if (config.scheduleMode === ScheduleMode.TIME) {
    return 'day';
  }
  if (config.scheduleMode === ScheduleMode.INTERVAL) {
    if (config.intervalHours === 1) {
      return 'hour';
    }
    if (config.intervalHours === 168) {
      return 'week';
    }
    if (config.intervalHours === 0.25) {
      return 'realtime';
    }
  }
  return null;
}

function nextRunText(config: BackupConfig): string {
  const via = config.wifiOnly ? ' via Wi-Fi.' : '.';
  if (config.automationPaused) {
    return 'Otomasi dijeda — jadwal tidak berjalan.';
  }
  if (config.scheduleMode === ScheduleMode.MANUAL) {
    return 'Otomasi dimatikan (Manual).';
  }
  if (config.scheduleMode === ScheduleMode.TIME) {
    const hh = String(config.scheduledTimeHour).padStart(2, '0');
    const now = new Date();
    const target = new Date(now);
    target.setHours(config.scheduledTimeHour, 0, 0, 0);
    const when = target.getTime() > now.getTime() ? 'Hari ini' : 'Besok';
    return `Jadwal berikutnya: ${when} pukul ${hh}:00 WIB${via}`;
  }
  if (config.scheduleMode === ScheduleMode.INTERVAL) {
    const h = config.intervalHours;
    const label =
      h === 1
        ? 'setiap 1 jam'
        : h < 1
          ? `setiap ${Math.round(h * 60)} menit`
          : h % 24 === 0
            ? `setiap ${h / 24} hari`
            : `setiap ${h} jam`;
    return `Jadwal berikutnya: ${label}${via}`;
  }
  return `Jadwal berikutnya: saat mengisi daya${via}`;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 KB';
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

async function measureDir(dir: string, depth = 0): Promise<number> {
  if (depth > 6) {
    return 0;
  }
  let entries: string[];
  try {
    entries = await ReactNativeBlobUtil.fs.ls(dir);
  } catch {
    return 0;
  }
  let total = 0;
  for (const name of entries) {
    const path = `${dir}/${name}`;
    try {
      const stat = await ReactNativeBlobUtil.fs.stat(path);
      if (stat.type === 'directory') {
        total += await measureDir(path, depth + 1);
      } else {
        total += stat.size;
      }
    } catch {
      // unreadable entry, skip
    }
  }
  return total;
}

async function pathSize(path: string): Promise<number> {
  try {
    const stat = await ReactNativeBlobUtil.fs.stat(path);
    return stat.type === 'directory' ? await measureDir(path) : stat.size;
  } catch {
    return 0;
  }
}

export default function SettingsScreen({ navigation }: Props) {
  const { mode, toggle } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const gutter = isTablet ? 24 : 16;

  const config = useSettingsStore(state => state.config);
  const setCategories = useSettingsStore(state => state.setCategories);
  const setScheduleMode = useSettingsStore(state => state.setScheduleMode);
  const setIntervalHours = useSettingsStore(state => state.setIntervalHours);
  const setScheduledHour = useSettingsStore(state => state.setScheduledHour);
  const setWifiOnly = useSettingsStore(state => state.setWifiOnly);
  const setEncryptionEnabled = useSettingsStore(state => state.setEncryptionEnabled);
  const setEncryptionSalt = useSettingsStore(state => state.setEncryptionSalt);
  const setCompressZip = useSettingsStore(state => state.setCompressZip);
  const setArchiveFormat = useSettingsStore(state => state.setArchiveFormat);
  const setNotifyBotSummary = useSettingsStore(state => state.setNotifyBotSummary);
  const setSilentNotifications = useSettingsStore(state => state.setSilentNotifications);
  const setAlertOnFailure = useSettingsStore(state => state.setAlertOnFailure);
  const setMaxFilesPerRun = useSettingsStore(state => state.setMaxFilesPerRun);
  const setDirectMedia = useSettingsStore(state => state.setDirectMedia);
  const setDirectMediaMaxMb = useSettingsStore(state => state.setDirectMediaMaxMb);
  const addWatchedFolder = useSettingsStore(state => state.addWatchedFolder);
  const removeWatchedFolder = useSettingsStore(state => state.removeWatchedFolder);

  const { toast, showToast } = useToast('bottom');

  const [showHourPicker, setShowHourPicker] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const checkUpdate = useUpdateStore(state => state.check);
  const [cacheSize, setCacheSize] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [editingPassphrase, setEditingPassphrase] = useState(false);

  const refreshCache = useCallback(async () => {
    setCacheSize(await measureDir(ReactNativeBlobUtil.fs.dirs.CacheDir));
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshCache().catch(() => undefined);
    });
    refreshCache().catch(() => undefined);
    return unsubscribe;
  }, [navigation, refreshCache]);

  const freq = freqFromConfig(config);
  const isDaily = freq === 'day';

  // A persisted 7z choice can never run (no native 7z module in this build), so
  // fall back to ZIP and persist the correction instead of failing every run.
  const archiveFormat: ArchiveFormat =
    config.archiveFormat === '7z' ? 'zip' : config.archiveFormat;
  useEffect(() => {
    if (config.archiveFormat === '7z') {
      setArchiveFormat('zip');
    }
  }, [config.archiveFormat, setArchiveFormat]);

  const onSelectFreq = (key: FreqKey) => {
    // Automating backups means runs nobody is watching; that is the moment the
    // foreground-service notification grant matters (P2-4).
    requestNotificationPermission().catch(() => undefined);
    switch (key) {
      case 'hour':
        setScheduleMode(ScheduleMode.INTERVAL);
        setIntervalHours(1);
        break;
      case 'day':
        setScheduleMode(ScheduleMode.TIME);
        setShowHourPicker(true);
        break;
      case 'week':
        setScheduleMode(ScheduleMode.INTERVAL);
        setIntervalHours(168);
        break;
      case 'realtime':
        setScheduleMode(ScheduleMode.INTERVAL);
        setIntervalHours(0.25);
        break;
    }
  };

  const toggleCategory = (category: CategoryKey) => {
    const next = config.categories.includes(category)
      ? config.categories.filter(item => item !== category)
      : [...config.categories, category];
    setCategories(next);
  };

  /** Tapping the row always works: switches to a daily schedule if needed, then expands. */
  const onPressExec = () => {
    if (!isDaily) {
      setScheduleMode(ScheduleMode.TIME);
    }
    setShowHourPicker(v => !v);
  };

  const shiftHour = (delta: number) => {
    setScheduledHour((config.scheduledTimeHour + delta + 24) % 24);
  };

  const onAddFolder = async () => {
    try {
      const result = await pickDirectory();
      addWatchedFolder(makeWatchedFolder(result.uri));
    } catch {
      // user cancelled
    }
  };

  const onClearCache = () => {
    Alert.alert(
      'Bersihkan cache?',
      'File chunking & metadata sementara akan dihapus. Berkas asli Anda tidak tersentuh.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Bersihkan',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              const dir = ReactNativeBlobUtil.fs.dirs.CacheDir;
              // A running backup (this process or a headless one) owns its
              // staging_/meta_ dirs; an in-flight restore owns its restore_ dir.
              const activeBackup =
                (await sessionsRepo.running()) !== null || BackgroundService.isRunning();
              let entries: string[] = [];
              try {
                entries = await ReactNativeBlobUtil.fs.ls(dir);
              } catch {
                entries = [];
              }
              let cleared = 0;
              for (const name of entries) {
                const path = `${dir}/${name}`;
                const backupTemp = name.startsWith('staging_') || name.startsWith('meta_');
                if (isActiveTempDir(path) || (activeBackup && backupTemp)) {
                  continue;
                }
                try {
                  cleared += await pathSize(path);
                  await ReactNativeBlobUtil.fs.unlink(path);
                } catch {
                  // skip locked entry
                }
              }
              await refreshCache();
              showToast('Selesai', `Cache dibersihkan (${formatBytes(cleared)}).`, 'success');
            } catch {
              showToast('Gagal', 'Tidak bisa membersihkan cache.', 'error');
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  };

  const hour = String(config.scheduledTimeHour).padStart(2, '0');

  // P1-8: encryption must never be switched on without a passphrase, or the run
  // would upload plaintext while the UI claims it is encrypted. Enabling asks
  // for a passphrase first; disabling is immediate.
  const onToggleEncryption = (value: boolean) => {
    if (!value) {
      setEncryptionEnabled(false);
      setEditingPassphrase(false);
      setPassphrase('');
      return;
    }
    if (!isCryptoAvailable()) {
      showToast('Enkripsi tidak tersedia', 'Build ini tidak menyertakan modul kripto.', 'error');
      return;
    }
    setEditingPassphrase(true);
  };

  // Force-check bypasses the interval throttle: the user asked explicitly.
  const onCheckUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const available = await checkUpdate(true);
      if (available) {
        showToast('Pembaruan tersedia', `${available.tag} — pakai tombol Perbarui di atas.`, 'success');
      } else {
        showToast('Sudah terbaru', 'Tidak ada rilis lebih baru dari versi ini.', 'success');
      }
    } catch {
      showToast('Gagal memeriksa', 'Tidak bisa menghubungi GitHub. Coba lagi nanti.', 'error');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const onSavePassphrase = async () => {
    const trimmed = passphrase.trim();
    if (trimmed.length < 8) {
      showToast('Passphrase terlalu pendek', 'Minimal 8 karakter.', 'error');
      return;
    }
    await secureStore.saveEncryptionPassword(trimmed);
    if (!config.encryptionSalt) {
      setEncryptionSalt(newSaltB64());
    }
    setEncryptionEnabled(true);
    setEditingPassphrase(false);
    setPassphrase('');
    showToast('Enkripsi aktif', 'Berkas akan dienkripsi sebelum diunggah.', 'success');
  };

  const strength = passphraseStrength(passphrase);

  return (
    <View style={styles.root}>
      <AppHeader subtitle="Pengaturan" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: 16,
          paddingBottom: 120 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {/* Status banner */}
          <View style={styles.banner}>
            <View style={styles.bannerLeft}>
              <View style={styles.bannerTopRow}>
                <PulsingDot color={TG.primaryContainer} />
                <Text style={styles.bannerOverline} numberOfLines={1}>
                  STATUS OTOMASI
                </Text>
              </View>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {config.automationPaused ? 'Dijeda' : 'Tersinkronisasi Otomatis'}
              </Text>
              <Text style={styles.bannerSubtitle} numberOfLines={2}>
                {nextRunText(config)}
              </Text>
            </View>
            <View style={styles.bannerTile}>
              <TgIcon name="cloudSync" color={TG.primary} size={22} />
            </View>
          </View>

          {/* SECTION 1 */}
          <View style={styles.section}>
            <SectionLabel title="PENJADWALAN & OTOMASI" icon="schedule" />
            <View style={styles.card}>
              <Text style={styles.fieldLabel} numberOfLines={1}>
                Frekuensi Pencadangan
              </Text>
              <View
                style={styles.segmentTrack}
                accessibilityRole="tablist"
                accessibilityLabel="Frekuensi pencadangan">
                {FREQ_OPTIONS.map(option => {
                  const active = freq === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => onSelectFreq(option.key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      style={[styles.segmentItem, active && styles.segmentItemActive]}>
                      <Text
                        style={[styles.segmentText, active ? styles.segmentTextActive : styles.segmentTextIdle]}
                        numberOfLines={1}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={onPressExec}
                accessibilityRole="button"
                accessibilityLabel="Waktu eksekusi"
                accessibilityState={{ expanded: showHourPicker }}
                style={({ pressed }) => [styles.execRow, pressed && styles.pressed]}>
                <View style={styles.execIcon}>
                  <TgIcon name="alarm" color={TG.primary} size={20} />
                </View>
                <View style={styles.execText}>
                  <Text style={styles.execTitle} numberOfLines={1}>
                    Waktu Eksekusi
                  </Text>
                  <Text style={styles.execSubtitle} numberOfLines={1}>
                    {isDaily ? 'Operasi senyap latar belakang' : 'Ketuk untuk jadwal harian'}
                  </Text>
                </View>
                <View style={styles.execPill}>
                  <Text style={styles.execHour}>{hour}:00</Text>
                  <Text style={styles.execWib}>WIB</Text>
                  <View style={showHourPicker ? styles.execChevronOpen : styles.execChevron}>
                    <TgIcon name="chevron" color={TG.secondary} size={14} />
                  </View>
                </View>
              </Pressable>

              {showHourPicker ? (
                <View style={styles.hourPicker}>
                  <View style={styles.stepperRow}>
                    <Pressable
                      onPress={() => shiftHour(-1)}
                      accessibilityRole="button"
                      accessibilityLabel="Kurangi satu jam"
                      hitSlop={HIT_SLOP}
                      style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
                      <Text style={styles.stepperGlyph}>{'\u2212'}</Text>
                    </Pressable>
                    <View style={styles.stepperValue}>
                      <Text style={styles.stepperHour}>{hour}:00</Text>
                      <Text style={styles.stepperWib}>WIB</Text>
                    </View>
                    <Pressable
                      onPress={() => shiftHour(1)}
                      accessibilityRole="button"
                      accessibilityLabel="Tambah satu jam"
                      hitSlop={HIT_SLOP}
                      style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
                      <Text style={styles.stepperGlyph}>+</Text>
                    </Pressable>
                  </View>
                  <View style={styles.presetRow}>
                    {HOUR_PRESETS.map(preset => {
                      const active = config.scheduledTimeHour === preset.hour;
                      return (
                        <Pressable
                          key={preset.hour}
                          onPress={() => setScheduledHour(preset.hour)}
                          accessibilityRole="button"
                          accessibilityLabel={`Pukul ${preset.label}`}
                          accessibilityState={{ selected: active }}
                          style={[
                            styles.presetChip,
                            active ? styles.presetChipActive : styles.presetChipIdle,
                          ]}>
                          <Text
                            style={[
                              styles.presetText,
                              active ? styles.presetTextActive : styles.presetTextIdle,
                            ]}
                            numberOfLines={1}>
                            {preset.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.hourNote} numberOfLines={2}>
                    Jadwal harian dijalankan otomatis oleh sistem saat perangkat siap.
                  </Text>
                </View>
              ) : null}

              <IconToggleRow
                icon="wifi"
                title="Hanya Jaringan Wi-Fi"
                subtitle="Hemat paket kuota seluler otomatis"
                value={config.wifiOnly}
                onValueChange={setWifiOnly}
              />
            </View>
          </View>

          {/* Preserved: categories + watched folders */}
          <View style={styles.section}>
            <SectionLabel title="KATEGORI & FOLDER" icon="folder" />
            <View style={styles.card}>
              {ALL_CATEGORIES.map(category => {
                // Contacts/SMS have no reader in this build, so their toggles
                // stay disabled; custom folders are read through the SafFolder
                // native module and are fully supported.
                const unsupported =
                  category === Category.CONTACT ||
                  category === Category.SMS;
                if (!unsupported) {
                  return (
                    <IconToggleRow
                      key={category}
                      icon={CATEGORY_ICONS[category]}
                      title={CATEGORY_LABELS[category]}
                      subtitle={CATEGORY_HINTS[category]}
                      value={config.categories.includes(category)}
                      onValueChange={() => toggleCategory(category)}
                    />
                  );
                }
                return (
                  <DisabledToggleRow
                    key={category}
                    icon={CATEGORY_ICONS[category]}
                    title={CATEGORY_LABELS[category]}
                    subtitle={`${CATEGORY_HINTS[category]} — belum tersedia di versi ini.`}
                    badge="Segera hadir"
                  />
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderText} numberOfLines={1}>
                  FOLDER TERPANTAU
                </Text>
                <View style={styles.countChip}>
                  <Text style={styles.countChipText}>{config.watchedFolders.length}</Text>
                </View>
              </View>
              {config.watchedFolders.length === 0 ? (
                <Text style={styles.emptyText} numberOfLines={2}>
                  Belum ada folder dipantau. Tambahkan folder agar isinya ikut dicadangkan.
                </Text>
              ) : (
                config.watchedFolders.map(folder => (
                  <View key={folder.id} style={styles.folderRow}>
                    <View style={styles.folderIcon}>
                      <TgIcon name="folder" color={TG.primary} size={18} />
                    </View>
                    <View style={styles.folderText}>
                      <Text style={styles.folderName} numberOfLines={1} ellipsizeMode="middle">
                        {folder.name}
                      </Text>
                      <Text style={styles.folderUri} numberOfLines={1} ellipsizeMode="middle">
                        {folder.uri}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeWatchedFolder(folder.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus folder ${folder.name}`}
                      hitSlop={HIT_SLOP}
                      style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                      <TgIcon name="deleteSweep" color={TG.error} size={16} />
                    </Pressable>
                  </View>
                ))
              )}
              <Pressable
                onPress={onAddFolder}
                accessibilityRole="button"
                accessibilityLabel="Tambah folder pantauan"
                style={({ pressed }) => [styles.addFolderButton, pressed && styles.pressed]}>
                <TgIcon name="addCircle" color="#FFFFFF" size={18} />
                <Text style={styles.addFolderText} numberOfLines={1}>
                  Tambah Folder
                </Text>
              </Pressable>
            </View>
          </View>

          {/* SECTION 2 */}
          <View style={styles.section}>
            <SectionLabel title="PENGELOLAAN BERKAS" icon="folderZip" />
            <View style={styles.card}>
              <Text style={styles.fieldLabel} numberOfLines={1}>
                Format Enkripsi & Kompresi
              </Text>
              <View style={styles.formatGrid}>
                {(['zip', '7z'] as ArchiveFormat[]).map(format => {
                  const active = archiveFormat === format;
                  const disabled = format === '7z';
                  const meta =
                    format === 'zip'
                      ? { title: 'ZIP', sub: 'Cepat & universal' }
                      : { title: '7z', sub: 'Kompresi tinggi' };
                  return (
                    <Pressable
                      key={format}
                      onPress={() => setArchiveFormat(format)}
                      disabled={disabled}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, disabled }}
                      accessibilityLabel={meta.title}
                      style={[
                        styles.formatCard,
                        active ? styles.formatCardActive : styles.formatCardIdle,
                        disabled && styles.muted,
                      ]}>
                      <View style={styles.formatText}>
                        <Text
                          style={[styles.formatTitle, active ? styles.formatTitleActive : styles.formatTitleIdle]}
                          numberOfLines={1}>
                          {meta.title}
                        </Text>
                        <Text style={styles.formatSub} numberOfLines={1}>
                          {meta.sub}
                        </Text>
                      </View>
                      {disabled ? (
                        <View style={styles.soonPill}>
                          <Text style={styles.soonPillText} numberOfLines={1}>
                            Segera hadir
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.radio, active ? styles.radioActive : styles.radioIdle]}>
                          {active ? <View style={styles.radioDot} /> : null}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <DisabledToggleRow
                icon="deleteSweep"
                title="Hapus File Lokal Pasca-Backup"
                subtitle="Dikunci nonaktif di versi ini agar berkas asli tetap aman."
                badge="Terkunci"
              />

              <View style={styles.toggleRow}>
                <View style={styles.toggleIcon}>
                  <TgIcon name="database" color={TG.primary} size={18} />
                </View>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle} numberOfLines={2}>
                    Batas berkas per backup
                  </Text>
                  <Text style={styles.toggleSubtitle} numberOfLines={2} ellipsizeMode="tail">
                    Sisa berkas di atas batas dilanjutkan otomatis pada backup berikutnya.
                  </Text>
                </View>
                <NumberField
                  value={config.maxFilesPerRun}
                  min={50}
                  max={5000}
                  fallback={500}
                  onCommit={setMaxFilesPerRun}
                  accessibilityLabel="Batas berkas per backup"
                />
              </View>
            </View>
          </View>

          {/* SECTION 3 */}
          <View style={styles.section}>
            <SectionLabel title="NOTIFIKASI & LAPORAN BOT" icon="bot" />
            <View style={styles.card}>
              <IconToggleRow
                icon="send"
                title="Ringkasan Log ke Bot"
                subtitle="Kirim rekap status instan selesai tugas"
                value={config.notifyBotSummary}
                onValueChange={setNotifyBotSummary}
              />
              <IconToggleRow
                icon="notificationsOff"
                title="Notifikasi Senyap Telegram"
                subtitle="Tanpa getar & suara (Silent Push)"
                value={config.silentNotifications}
                onValueChange={setSilentNotifications}
              />
              <IconToggleRow
                icon="warning"
                title="Peringatan Kegagalan Cepat"
                subtitle="Jika token habis atau Telegram error"
                value={config.alertOnFailure}
                onValueChange={setAlertOnFailure}
              />
            </View>
          </View>

          {/* SECTION 4 */}
          <View style={styles.section}>
            <SectionLabel title="PENYIMPANAN & CACHE" icon="sdCard" />
            <View style={styles.card}>
              <View style={styles.cacheRow}>
                <View style={styles.cacheTile}>
                  <TgIcon name="cached" color={TG.primary} size={20} />
                </View>
                <View style={styles.cacheText}>
                  <View style={styles.cacheTitleRow}>
                    <Text style={styles.cacheTitle} numberOfLines={1}>
                      Cache Sementara
                    </Text>
                    <Text style={styles.cacheSize} numberOfLines={1}>
                      {formatBytes(cacheSize)}
                    </Text>
                  </View>
                  <Text style={styles.cacheSubtitle} numberOfLines={1}>
                    File chunking & metadata zip lokal
                  </Text>
                </View>
                <Pressable
                  onPress={onClearCache}
                  disabled={clearing}
                  accessibilityRole="button"
                  accessibilityLabel="Bersihkan cache"
                  accessibilityState={{ disabled: clearing }}
                  hitSlop={HIT_SLOP}
                  style={({ pressed }) => [
                    styles.clearButton,
                    clearing && styles.muted,
                    pressed && styles.pressed,
                  ]}>
                  <TgIcon name="cleaningServices" color={TG.ink} size={14} />
                  <Text style={styles.clearButtonText} numberOfLines={1}>
                    {clearing ? 'Membersihkan…' : 'Bersihkan'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Preserved: encryption + compressZip */}
          <View style={styles.section}>
            <SectionLabel title="ENKRIPSI" icon="lock" />
            <View style={styles.card}>
              <IconToggleRow
                icon="shield"
                title="Enkripsi Berkas"
                subtitle="AES-256 sebelum dikirim ke Telegram"
                value={config.encryptionEnabled}
                onValueChange={onToggleEncryption}
              />
              {editingPassphrase && !config.encryptionEnabled ? (
                <View style={styles.passBox}>
                  <Text style={styles.fieldLabel} numberOfLines={1}>
                    PASSPHRASE ENKRIPSI
                  </Text>
                  <View style={styles.passField}>
                    <TextInput
                      value={passphrase}
                      onChangeText={setPassphrase}
                      placeholder="Minimal 8 karakter"
                      placeholderTextColor={TG.outline}
                      secureTextEntry={!showPass}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Passphrase enkripsi"
                      style={styles.passInput}
                    />
                    <Pressable
                      onPress={() => setShowPass(v => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={showPass ? 'Sembunyikan passphrase' : 'Tampilkan passphrase'}
                      hitSlop={HIT_SLOP}
                      style={({ pressed }) => [styles.passIconButton, pressed && styles.pressed]}>
                      <TgIcon name={showPass ? 'eyeOff' : 'eye'} color={TG.secondary} size={18} />
                    </Pressable>
                  </View>
                  {passphrase ? (
                    <View style={styles.strengthRow}>
                      <View style={styles.strengthBar}>
                        {[0, 1, 2, 3].map(i => (
                          <View
                            key={i}
                            style={[
                              styles.strengthSeg,
                              { backgroundColor: i < strength.score ? TG.primary : TG.highest },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.strengthLabel} numberOfLines={1}>
                        {strength.label}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.passActions}>
                    <Pressable
                      onPress={() => {
                        setEditingPassphrase(false);
                        setPassphrase('');
                      }}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.passCancel, pressed && styles.pressed]}>
                      <Text style={styles.passCancelText} numberOfLines={1}>
                        Batal
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={onSavePassphrase}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.passConfirm, pressed && styles.pressed]}>
                      <Text style={styles.passConfirmText} numberOfLines={1}>
                        Aktifkan Enkripsi
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.passNote} numberOfLines={3}>
                    Berkas akan dienkripsi di perangkat sebelum dikirim. Tanpa passphrase ini
                    berkas tidak bisa dipulihkan — simpan di tempat aman.
                  </Text>
                </View>
              ) : null}
              <IconToggleRow
                icon="archive"
                title="Kompresi ZIP"
                subtitle="Nonaktif = unggah berkas satu per satu"
                value={config.compressZip}
                onValueChange={setCompressZip}
              />
              {config.encryptionEnabled ? (
                <DisabledToggleRow
                  icon="image"
                  title="Kirim Foto & Video Langsung"
                  subtitle="Butuh enkripsi mati: berkas terenkripsi tidak bisa dibuka di Telegram."
                  badge="Nonaktif"
                />
              ) : (
                <IconToggleRow
                  icon="image"
                  title="Kirim Foto & Video Langsung"
                  subtitle="Foto & video kecil dikirim apa adanya, sisanya di-zip"
                  value={config.directMedia}
                  onValueChange={setDirectMedia}
                />
              )}
              {config.directMedia && !config.encryptionEnabled ? (
                <View style={styles.toggleRow}>
                  <View style={styles.toggleIcon}>
                    <TgIcon name="swapVert" color={TG.primary} size={18} />
                  </View>
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleTitle} numberOfLines={2}>
                      Batas ukuran kirim langsung
                    </Text>
                    <Text style={styles.toggleSubtitle} numberOfLines={2} ellipsizeMode="tail">
                      Foto/video di atas batas ini masuk ke ZIP.
                    </Text>
                  </View>
                  <NumberField
                    value={config.directMediaMaxMb}
                    min={1}
                    max={45}
                    fallback={45}
                    format={v => `${v} MB`}
                    onCommit={setDirectMediaMaxMb}
                    accessibilityLabel="Batas ukuran kirim langsung"
                  />
                </View>
              ) : null}
            </View>
          </View>

          {/* Preserved: appearance */}
          <View style={styles.section}>
            <SectionLabel title="TAMPILAN" icon="tune" />
            <View style={styles.card}>
              <IconToggleRow
                icon="eye"
                title="Mode Gelap"
                subtitle="Ganti tampilan aplikasi antara terang dan gelap"
                value={mode === 'dark'}
                onValueChange={() => toggle()}
              />
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel title="APLIKASI" icon="info" />
            <View style={styles.card}>
              <LinkRow
                icon="download"
                title="Cek Pembaruan"
                subtitle={checkingUpdate ? 'Memeriksa\u2026' : 'Periksa rilis baru dari GitHub sekarang'}
                onPress={onCheckUpdate}
              />
              <VersionRow />
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel title="BANTUAN" icon="info" />
            <View style={styles.card}>
              <LinkRow
                icon="warning"
                title="Troubleshooting"
                subtitle="Backup tidak berjalan? Periksa izin & diagnostik"
                onPress={() => navigation.navigate('Troubleshoot')}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {toast}
    </View>
  );
}

function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: TgIconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}>
      <View style={styles.toggleIcon}>
        <TgIcon name={icon} color={TG.primary} size={18} />
      </View>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.toggleSubtitle} numberOfLines={2} ellipsizeMode="tail">
          {subtitle}
        </Text>
      </View>
      <TgIcon name="chevron" color={TG.secondary} size={16} />
    </Pressable>
  );
}

function VersionRow() {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  const code = deviceVersionCode();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <TgIcon name="info" color={TG.primary} size={18} />
      </View>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle} numberOfLines={1}>
          Versi Terpasang
        </Text>
        <Text style={styles.toggleSubtitle} numberOfLines={1}>
          {code == null ? appVersion() : `${appVersion()} (${code})`}
        </Text>
      </View>
    </View>
  );
}

function IconToggleRow({
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
  onValueChange: (value: boolean) => void;
}) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <TgIcon name={icon} color={TG.primary} size={18} />
      </View>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.toggleSubtitle} numberOfLines={2} ellipsizeMode="tail">
          {subtitle}
        </Text>
      </View>
      <TgSwitch value={value} onValueChange={onValueChange} accessibilityLabel={title} />
    </View>
  );
}

/** Non-interactive row for settings that are not available yet (honest "coming soon"). */
function DisabledToggleRow({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon: TgIconName;
  title: string;
  subtitle: string;
  badge: string;
}) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  return (
    <View
      style={[styles.toggleRow, styles.muted]}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${subtitle} ${badge}`}>
      <View style={styles.toggleIcon}>
        <TgIcon name={icon} color={TG.outline} size={18} />
      </View>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.toggleSubtitle} numberOfLines={2} ellipsizeMode="tail">
          {subtitle}
        </Text>
      </View>
      <View style={styles.soonPill}>
        <Text style={styles.soonPillText} numberOfLines={1}>
          {badge}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (TG: TGPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: TG.bg },
  scroll: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 },
  section: { gap: 12 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: TG.container,
    borderRadius: RADIUS.md,
    padding: 16,
    ...CARD_SHADOW,
  },
  bannerLeft: { flex: 1, minWidth: 0, maxWidth: '75%', gap: 4 },
  bannerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerOverline: {
    color: TG.secondary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600', fontFamily: FONT.semi,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  bannerTitle: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '600', fontFamily: FONT.semi },
  bannerSubtitle: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  bannerTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: TG.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  card: {
    backgroundColor: TG.card,
    borderRadius: RADIUS.md,
    padding: 16,
    gap: 12,
    ...CARD_SHADOW,
  },

  fieldLabel: { color: TG.secondary, fontSize: 11, lineHeight: 14, fontWeight: '500', fontFamily: FONT.medium },

  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: TG.container,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentItemActive: { backgroundColor: TG.card, ...CARD_SHADOW },
  segmentText: { fontSize: 12, lineHeight: 16, flexShrink: 1 },
  segmentTextActive: { color: TG.ink, fontWeight: '600', fontFamily: FONT.semi },
  segmentTextIdle: { color: TG.secondary, fontWeight: '500', fontFamily: FONT.medium },

  execRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: TG.low,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  execIcon: { flexShrink: 0 },
  execText: { flex: 1, minWidth: 0, gap: 2 },
  execTitle: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '500', fontFamily: FONT.medium },
  execSubtitle: { color: TG.secondary, fontSize: 11, lineHeight: 14 },
  execPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TG.card,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
    ...CARD_SHADOW,
  },
  execHour: { color: TG.primary, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi },
  execWib: { color: TG.secondary, fontSize: 11, lineHeight: 14 },
  execChevron: { transform: [{ rotate: '0deg' }] },
  execChevronOpen: { transform: [{ rotate: '90deg' }] },

  hourPicker: {
    gap: 12,
    backgroundColor: TG.low,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: TG.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...CARD_SHADOW,
  },
  stepperGlyph: { color: TG.primary, fontSize: 22, lineHeight: 26, fontWeight: '600', fontFamily: FONT.semi },
  stepperValue: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  stepperHour: { color: TG.ink, fontSize: 28, lineHeight: 34, fontWeight: '700', fontFamily: FONT.bold },
  stepperWib: { color: TG.secondary, fontSize: 11, lineHeight: 14, fontWeight: '500', fontFamily: FONT.medium },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: { backgroundColor: TG.primaryContainer },
  presetChipIdle: { backgroundColor: TG.card },
  presetText: { fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi },
  presetTextActive: { color: ON_ACCENT.strong },
  presetTextIdle: { color: TG.primary },
  hourNote: { color: TG.secondary, fontSize: 11, lineHeight: 15 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  toggleIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: TG.container,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toggleText: { flex: 1, minWidth: 0, gap: 2 },
  toggleTitle: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '500', fontFamily: FONT.medium },
  toggleSubtitle: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  soonPill: {
    backgroundColor: TG.container,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  soonPillText: { color: TG.primary, fontSize: 11, lineHeight: 14, fontWeight: '600', fontFamily: FONT.semi },

  formatGrid: { flexDirection: 'row', gap: 12 },
  formatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: RADIUS.md,
    padding: 12,
    minWidth: 0,
  },
  formatCardActive: { backgroundColor: TG.primaryFixed },
  formatCardIdle: { backgroundColor: TG.low },
  formatText: { flex: 1, minWidth: 0, gap: 2 },
  formatTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi },
  formatTitleActive: { color: TG.primary },
  formatTitleIdle: { color: TG.ink },
  formatSub: { color: TG.secondary, fontSize: 11, lineHeight: 14 },
  radio: { width: 16, height: 16, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioActive: { backgroundColor: TG.primaryContainer },
  radioIdle: { backgroundColor: TG.container },
  radioDot: { width: 8, height: 8, borderRadius: '50%', backgroundColor: ON_ACCENT.strong },

  cacheRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cacheTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: TG.container,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cacheText: { flex: 1, minWidth: 0, gap: 2 },
  cacheTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cacheTitle: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },
  cacheSize: { color: TG.primary, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 0 },
  cacheSubtitle: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TG.container,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  clearButtonText: { color: TG.ink, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeaderText: {
    color: TG.secondary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600', fontFamily: FONT.semi,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  countChip: {
    backgroundColor: TG.container,
    borderRadius: RADIUS.md,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  countChipText: { color: TG.primary, fontSize: 11, lineHeight: 14, fontWeight: '600', fontFamily: FONT.semi },

  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  folderIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: TG.container,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  folderText: { flex: 1, minWidth: 0, gap: 2 },
  folderName: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '500', fontFamily: FONT.medium },
  folderUri: { color: TG.secondary, fontSize: 11, lineHeight: 15 },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  addFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: TG.primaryContainer,
  },
  addFolderText: { color: ON_ACCENT.strong, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },

  emptyText: { color: TG.secondary, fontSize: 13, lineHeight: 18 },

  muted: { opacity: 0.5 },
  pressed: { opacity: 0.85 },

  passBox: {
    gap: 10,
    backgroundColor: TG.low,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  passField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TG.card,
    borderRadius: RADIUS.md,
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 44,
  },
  passInput: {
    flex: 1,
    minWidth: 0,
    color: TG.ink,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 8,
  },
  passIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strengthBar: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 4, borderRadius: '50%' },
  strengthLabel: { color: TG.secondary, fontSize: 11, lineHeight: 14, fontWeight: '500', fontFamily: FONT.medium },
  passActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  passCancel: {
    minHeight: 36,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TG.card,
  },
  passCancelText: { color: TG.secondary, fontSize: 13, lineHeight: 18, fontWeight: '500', fontFamily: FONT.medium },
  passConfirm: {
    minHeight: 36,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TG.primaryContainer,
  },
  passConfirmText: { color: ON_ACCENT.strong, fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: FONT.semi },
  passNote: { color: TG.secondary, fontSize: 11, lineHeight: 15 },
});

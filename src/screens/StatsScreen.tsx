import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { AppHeader, PulsingDot, TgIcon, useToast, type TgIconName } from '../components/ui';
import { TG } from '../theme/theme';
import { sessionsRepo, type SessionRecord } from '../db/repositories/sessions';
import { runBackupInForeground, BACKUP_IN_FLIGHT_ERROR } from '../background/foregroundService';
import { secureStore } from '../state/secureStore';
import { clipboard } from '../state/clipboard';
import { useSettingsStore } from '../state/settingsStore';
import {
  filterSessions,
  formatBytesGB,
  formatDuration,
  sessionDateLabel,
  sessionsToCsv,
  sortSessions,
  telegramMessageUrl,
  type SessionFilter,
} from '../state/history';
import type { RootStackParamList } from '../navigation/Routes';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

const PAGE_SIZE = 50;
const OLD_LOG_MS = 30 * 24 * 60 * 60 * 1000;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
const CARD_SHADOW = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  shadowColor: '#0B1C30',
};
const FLOAT_SHADOW = {
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
  shadowColor: '#0B1C30',
};

const ID_CATEGORY_LABELS: Record<string, string> = {
  photo: 'Foto',
  video: 'Video',
  doc: 'Dokumen',
  contact: 'Kontak',
  sms: 'SMS',
  custom: 'Folder Kustom',
};

function categoryLabel(category: string): string {
  const keys = category.split(',').map(part => part.trim()).filter(Boolean);
  if (keys.length === 0) {
    return 'Backup';
  }
  return keys.map(key => ID_CATEGORY_LABELS[key] ?? key).join(' & ');
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) {
    return 'baru saja';
  }
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) {
    return `${minutes} menit lalu`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} jam lalu`;
  }
  return `${Math.floor(hours / 24)} hari lalu`;
}

const FILTER_DEFS: { key: SessionFilter; label: string; dot?: 'success' | 'failed' | 'running' }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'success', label: 'Berhasil', dot: 'success' },
  { key: 'failed', label: 'Gagal', dot: 'failed' },
  { key: 'running', label: 'Sedang Berjalan', dot: 'running' },
];

export default function StatsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gutter = width >= 768 ? 24 : 16;

  const { toast, showToast } = useToast('bottom');

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [running, setRunning] = useState<SessionRecord | null>(null);
  const [chatId, setChatId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SessionFilter>('all');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [retryId, setRetryId] = useState<number | null>(null);
  const [retryPhase, setRetryPhase] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [all, byStatus, runningRow, rows, credentials] = await Promise.all([
      sessionsRepo.countAll(),
      sessionsRepo.countByStatus(),
      sessionsRepo.running(),
      sessionsRepo.recent(limit),
      secureStore.get(),
    ]);
    setTotal(all);
    setCounts(byStatus);
    setRunning(runningRow);
    setSessions(rows);
    setChatId(credentials.chatId);
  }, [limit]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      load().catch(() => undefined);
    });
    return unsubscribe;
  }, [navigation, load]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) {
        clearInterval(timer);
      }
      timer = setInterval(() => {
        load().catch(() => undefined);
      }, 3000);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const unsubFocus = navigation.addListener('focus', start);
    const unsubBlur = navigation.addListener('blur', stop);
    return () => {
      stop();
      unsubFocus();
      unsubBlur();
    };
  }, [navigation, load]);

  const visible = sortSessions(filterSessions(sessions, { query, status: filter }), order);
  const showRunning = (filter === 'all' || filter === 'running') && running != null;
  const hasMore = sessions.length < total;

  const countFor = (key: SessionFilter): number => {
    if (key === 'all') {
      return total;
    }
    return counts[key] ?? 0;
  };

  const onOpenTelegram = (session: SessionRecord) => {
    const url = telegramMessageUrl(chatId, session.manifest_id);
    setMenuFor(null);
    if (!url) {
      showToast('Tidak tersedia', 'Tautan Telegram tidak dapat dibuat.', 'error');
      return;
    }
    Linking.openURL(url).catch(() => showToast('Gagal', 'Tidak bisa membuka Telegram.', 'error'));
  };

  const onCopyHash = (session: SessionRecord) => {
    setMenuFor(null);
    if (!session.manifest_id) {
      showToast('Tidak ada hash', 'Sesi ini tidak menyimpan hash.', 'error');
      return;
    }
    clipboard.setString(session.manifest_id);
    showToast('Disalin', 'ID pesan manifest disalin.', 'success');
  };

  const onDeleteSession = (session: SessionRecord) => {
    setMenuFor(null);
    Alert.alert('Hapus entri ini?', 'Entri riwayat akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await sessionsRepo.deleteById(session.id);
          await load();
          showToast('Terhapus', 'Entri riwayat dihapus.', 'success');
        },
      },
    ]);
  };

  const onRetry = async (session: SessionRecord) => {
    setRetryId(session.id);
    setRetryPhase('Menghubungkan\u2026');
    const timer = setTimeout(() => setRetryPhase('Mengantri\u2026'), 700);
    try {
      const result = await runBackupInForeground();
      clearTimeout(timer);
      await load();
      if (result.status === 'failed' && result.error === BACKUP_IN_FLIGHT_ERROR) {
        showToast('Ditolak', `${BACKUP_IN_FLIGHT_ERROR}.`, 'info');
      } else if (result.status === 'failed') {
        showToast('Gagal', result.error ?? 'Backup gagal.', 'error');
      } else if (result.status === 'partial') {
        showToast('Sebagian', 'Backup selesai dengan peringatan.', 'info');
      } else {
        showToast('Berhasil', `Backup selesai. ${result.files} berkas.`, 'success');
      }
    } catch (error) {
      clearTimeout(timer);
      showToast('Gagal', error instanceof Error ? error.message : 'Backup gagal.', 'error');
    } finally {
      setRetryId(null);
      setRetryPhase('');
    }
  };

  const onExportCsv = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    const csv = sessionsToCsv(visible);
    try {
      const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/riwayat_backup_${Date.now()}.csv`;
      await ReactNativeBlobUtil.fs.writeFile(path, csv, 'utf8');
      await Share.share({ title: 'Riwayat Backup', message: csv, url: `file://${path}` });
      showToast('Selesai', 'Log CSV dibagikan.', 'success');
    } catch {
      clipboard.setString(csv);
      showToast('Disalin', 'CSV disalin ke papan klip.', 'info');
    } finally {
      setBusy(false);
    }
  };

  const onDeleteOld = () => {
    Alert.alert(
      'Hapus log lama?',
      'Semua entri riwayat lebih tua dari 30 hari akan dihapus permanen.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const removed = await sessionsRepo.deleteOlderThan(Date.now() - OLD_LOG_MS);
            await load();
            showToast('Selesai', `${removed} entri log lama dihapus.`, 'success');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader subtitle="Riwayat" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: 16,
          paddingBottom: 120 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {/* 1. Search */}
          <View style={[styles.search, CARD_SHADOW]}>
            <TgIcon name="search" color={TG.secondary} size={18} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Cari file, tanggal, atau hash backup..."
              placeholderTextColor={TG.secondary}
              accessibilityLabel="Cari riwayat"
              returnKeyType="search"
              autoCapitalize="none"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Bersihkan pencarian"
                hitSlop={HIT_SLOP}
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <TgIcon name="close" color={TG.secondary} size={16} />
              </Pressable>
            ) : null}
          </View>

          {/* 2. Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="tablist"
            accessibilityLabel="Filter status riwayat"
            contentContainerStyle={styles.pillRow}>
            {FILTER_DEFS.map(def => {
              const active = filter === def.key;
              const label = def.key === 'all' ? def.label : `${def.label} (${countFor(def.key)})`;
              return (
                <Pressable
                  key={def.key}
                  onPress={() => setFilter(def.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.pill,
                    active ? styles.pillActive : styles.pillIdle,
                    pressed && styles.pressed,
                  ]}>
                  {def.dot === 'success' ? (
                    <View style={[styles.pillDot, { backgroundColor: TG.primaryContainer }]} />
                  ) : null}
                  {def.dot === 'failed' ? (
                    <View style={[styles.pillDot, { backgroundColor: TG.error }]} />
                  ) : null}
                  {def.dot === 'running' ? <PulsingDot color={TG.primaryContainer} size={7} /> : null}
                  <Text
                    style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextIdle]}
                    numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 3. Active run card */}
          {showRunning && running ? <ActiveRunCard session={running} /> : null}

          {/* 4. Section header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                Arsip Log Sesi
              </Text>
              <View style={styles.countChip}>
                <Text style={styles.countChipText}>{total} entri</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setOrder(order === 'newest' ? 'oldest' : 'newest')}
              accessibilityRole="button"
              accessibilityLabel={order === 'newest' ? 'Urutkan terbaru' : 'Urutkan terlama'}
              hitSlop={HIT_SLOP}
              style={({ pressed }) => [styles.sortButton, pressed && styles.pressed]}>
              <TgIcon name="swapVert" color={TG.secondary} size={16} />
              <Text style={styles.sortText}>{order === 'newest' ? 'Terbaru' : 'Terlama'}</Text>
            </Pressable>
          </View>

          {/* 5. Session cards */}
          {visible.length === 0 ? (
            <View style={[styles.card, CARD_SHADOW]}>
              <Text style={styles.emptyText} numberOfLines={2}>
                Tidak ada entri yang cocok.
              </Text>
            </View>
          ) : (
            visible.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                chatId={chatId}
                menuOpen={menuFor === session.id}
                onToggleMenu={() => setMenuFor(menuFor === session.id ? null : session.id)}
                onOpenTelegram={() => onOpenTelegram(session)}
                onCopyHash={() => onCopyHash(session)}
                onDelete={() => onDeleteSession(session)}
                retryBusy={retryId === session.id}
                retryPhase={retryPhase}
                onRetry={() => onRetry(session)}
              />
            ))
          )}

          {/* 6. End-of-list */}
          <View style={styles.endRow}>
            <TgIcon name="history" color={TG.secondary} size={16} />
            <Text style={styles.endText} numberOfLines={2}>
              Menampilkan {visible.length} dari {total} arsip tersimpan
            </Text>
          </View>
          {hasMore ? (
            <Pressable
              onPress={() => setLimit(current => current + PAGE_SIZE)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
              <Text style={styles.moreButtonText} numberOfLines={1}>
                Muat lebih banyak
              </Text>
            </Pressable>
          ) : null}

          {/* 7. Bottom utility bar */}
          <View style={[styles.utilBar, FLOAT_SHADOW]}>
            <Pressable
              onPress={onExportCsv}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [
                styles.utilButton,
                styles.utilButtonPrimary,
                busy && styles.muted,
                pressed && styles.pressed,
              ]}>
              <TgIcon name="download" color={TG.primary} size={18} />
              <Text style={[styles.utilText, { color: TG.ink }]} numberOfLines={1}>
                Ekspor Log CSV
              </Text>
            </Pressable>
            <Pressable
              onPress={onDeleteOld}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.utilButton,
                styles.utilButtonSecondary,
                pressed && styles.pressed,
              ]}>
              <TgIcon name="deleteSweep" color={TG.secondary} size={18} />
              <Text style={[styles.utilText, { color: TG.ink }]} numberOfLines={1}>
                Hapus Log Lama
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {toast}
    </View>
  );
}

function ActiveRunCard({ session }: { session: SessionRecord }) {
  const automationPaused = useSettingsStore(state => state.config.automationPaused);
  const setAutomationPaused = useSettingsStore(state => state.setAutomationPaused);
  const totalParts = session.chunks_total || 0;
  const sent = session.chunks_sent || 0;
  const ratio = totalParts > 0 ? Math.min(1, sent / totalParts) : 0;
  const title = session.archive_name || categoryLabel(session.category);

  return (
    <View style={[styles.card, CARD_SHADOW]}>
      <View style={styles.activeTopRow}>
        <View style={styles.activeStatus}>
          <PulsingDot color={TG.primaryContainer} />
          <Text style={styles.activeOverline} numberOfLines={1}>
            SEDANG BERJALAN
          </Text>
        </View>
        <View style={styles.activeRight}>
          <View style={styles.partsChip}>
            <Text style={styles.partsChipText} numberOfLines={1}>
              {sent} / {totalParts} part
            </Text>
          </View>
          <Pressable
            onPress={() => setAutomationPaused(!automationPaused)}
            accessibilityRole="button"
            accessibilityLabel={automationPaused ? 'Lanjutkan otomasi' : 'Jeda otomasi'}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [styles.pauseButton, pressed && styles.pressed]}>
            <TgIcon name={automationPaused ? 'play' : 'pause'} color={TG.primary} size={16} />
          </Pressable>
        </View>
      </View>

      <View style={styles.activeTitleRow}>
        <TgIcon name="cloudUpload" color={TG.primary} size={18} />
        <Text style={styles.activeTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      </View>

      <Text accessibilityLiveRegion="polite" style={styles.activeMeta} numberOfLines={1}>
        {sent} / {totalParts} part · Mulai {relativeTime(session.started_at)}
      </Text>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

function SessionCard({
  session,
  chatId,
  menuOpen,
  onToggleMenu,
  onOpenTelegram,
  onCopyHash,
  onDelete,
  retryBusy,
  retryPhase,
  onRetry,
}: {
  session: SessionRecord;
  chatId: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpenTelegram: () => void;
  onCopyHash: () => void;
  onDelete: () => void;
  retryBusy: boolean;
  retryPhase: string;
  onRetry: () => void;
}) {
  const title = session.archive_name || categoryLabel(session.category);
  const link = telegramMessageUrl(chatId, session.manifest_id);
  const hasHash = !!session.manifest_id;

  return (
    <View style={[styles.card, CARD_SHADOW]}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionHeaderLeft}>
          <StatusPill status={session.status} reason={session.error_reason} />
          <Text style={styles.sessionDate} numberOfLines={1}>
            {sessionDateLabel(session.started_at)}
          </Text>
        </View>
        <Pressable
          onPress={onToggleMenu}
          accessibilityRole="button"
          accessibilityLabel="Aksi lainnya"
          accessibilityState={{ expanded: menuOpen }}
          hitSlop={HIT_SLOP}
          style={({ pressed }) => [styles.moreIconButton, pressed && styles.pressed]}>
          <TgIcon name="more" color={TG.secondary} size={16} />
        </Pressable>
      </View>

      {menuOpen ? (
        <View style={styles.menu}>
          {link ? (
            <MenuItem icon="send" label="Buka di Telegram" onPress={onOpenTelegram} />
          ) : null}
          <MenuItem
            icon="copy"
            label={hasHash ? 'Salin hash' : 'Hash tidak tersedia'}
            disabled={!hasHash}
            onPress={onCopyHash}
          />
          <MenuItem icon="deleteSweep" label="Hapus entri" onPress={onDelete} />
        </View>
      ) : null}

      <Text style={styles.sessionTitle} numberOfLines={1} ellipsizeMode="middle">
        {title}
      </Text>

      <View style={styles.chipsWrap}>
        <MetaChip icon="hardDrive" label={formatBytesGB(session.total_size)} />
        <MetaChip icon="folder" label={`${session.total_files} berkas`} />
        {session.chunks_total > 1 ? (
          <MetaChip icon="callSplit" label={`${session.chunks_total} part`} />
        ) : null}
        {session.finished_at != null ? (
          <MetaChip
            icon="schedule"
            label={formatDuration(session.finished_at - session.started_at)}
          />
        ) : null}
        {session.encrypted === 1 ? (
          <View style={[styles.chip, styles.chipEncrypted]}>
            <TgIcon name="shield" color={TG.primary} size={14} />
            <Text style={[styles.chipText, styles.chipTextEncrypted]} numberOfLines={1}>
              AES-256 Enkripsi
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sessionFooter}>
        {hasHash ? (
          <View style={styles.provenance}>
            <TgIcon name="verified" color={TG.secondary} size={14} />
            <Text style={styles.provenanceText} numberOfLines={1}>
              Hash tersedia untuk verifikasi
            </Text>
          </View>
        ) : (
          <View style={styles.provenance}>
            <TgIcon name="lock" color={TG.secondary} size={14} />
            <Text style={styles.provenanceText} numberOfLines={1}>
              {categoryLabel(session.category)}
            </Text>
          </View>
        )}
        {link ? (
          <Pressable
            onPress={onOpenTelegram}
            accessibilityRole="button"
            accessibilityLabel="Buka di Telegram"
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}>
            <TgIcon name="send" color={TG.primaryContainer} size={16} />
            <Text style={styles.openButtonText} numberOfLines={1}>
              Buka di Telegram
            </Text>
          </Pressable>
        ) : null}
      </View>

      {session.status === 'failed' ? (
        <Pressable
          onPress={onRetry}
          disabled={retryBusy}
          accessibilityRole="button"
          accessibilityState={{ disabled: retryBusy }}
          style={({ pressed }) => [
            styles.retryButton,
            retryBusy && styles.muted,
            pressed && styles.pressed,
          ]}>
          <TgIcon name="refresh" color={TG.ink} size={16} />
          <Text style={styles.retryText} numberOfLines={1}>
            {retryBusy ? retryPhase || 'Menghubungkan\u2026' : 'Coba Lagi Sekarang'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatusPill({ status, reason }: { status: string; reason: string | null }) {
  if (status === 'failed') {
    return (
      <View style={[styles.statusPill, { backgroundColor: TG.errorSoft }]}>
        <TgIcon name="error" color={TG.error} size={12} />
        <Text style={[styles.statusText, { color: TG.error }]} numberOfLines={1}>
          {reason ? `Gagal (${reason})` : 'Gagal'}
        </Text>
      </View>
    );
  }
  if (status === 'running') {
    return (
      <View style={[styles.statusPill, { backgroundColor: TG.container }]}>
        <PulsingDot color={TG.primaryContainer} size={7} />
        <Text style={[styles.statusText, { color: TG.primary }]} numberOfLines={1}>
          Berjalan
        </Text>
      </View>
    );
  }
  if (status === 'partial') {
    return (
      <View style={[styles.statusPill, { backgroundColor: TG.container }]}>
        <TgIcon name="warning" color={TG.primaryContainer} size={12} />
        <Text style={[styles.statusText, { color: TG.primary }]} numberOfLines={1}>
          Sebagian
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.statusPill, { backgroundColor: TG.container }]}>
      <TgIcon name="checkCircle" color={TG.primaryContainer} size={12} />
      <Text style={[styles.statusText, { color: TG.primary }]} numberOfLines={1}>
        Berhasil
      </Text>
    </View>
  );
}

function MetaChip({ icon, label }: { icon: TgIconName; label: string }) {
  return (
    <View style={styles.chip}>
      <TgIcon name={icon} color={TG.secondary} size={14} />
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: TgIconName;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.menuItem, disabled && styles.muted, pressed && styles.pressed]}>
      <TgIcon name={icon} color={disabled ? TG.outline : TG.primary} size={16} />
      <Text
        style={[styles.menuItemText, disabled && { color: TG.outline }]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TG.bg },
  scroll: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: TG.card,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    color: TG.ink,
    fontSize: 13,
    lineHeight: 18,
    padding: 0,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TG.low,
    flexShrink: 0,
  },

  pillRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexShrink: 0,
  },
  pillActive: { backgroundColor: TG.ink },
  pillIdle: { backgroundColor: TG.card, ...CARD_SHADOW },
  pillDot: { width: 6, height: 6, borderRadius: 6 },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: '500', flexShrink: 1 },
  pillTextActive: { color: '#FFFFFF', fontWeight: '600' },
  pillTextIdle: { color: TG.secondary },

  card: {
    backgroundColor: TG.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    ...CARD_SHADOW,
  },

  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activeStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  activeOverline: {
    color: TG.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  activeRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  partsChip: {
    backgroundColor: TG.container,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  partsChipText: { color: TG.secondary, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  pauseButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeTitle: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '600', flex: 1, minWidth: 0 },
  activeMeta: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: TG.highest,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: TG.primaryContainer },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  sectionTitle: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '700', flexShrink: 1 },
  countChip: {
    backgroundColor: TG.container,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  countChipText: { color: TG.secondary, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  sortText: { color: TG.secondary, fontSize: 12, lineHeight: 16, fontWeight: '500' },

  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sessionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  sessionDate: { color: TG.secondary, fontSize: 11, lineHeight: 14, flexShrink: 1 },
  moreIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  menu: {
    backgroundColor: TG.low,
    borderRadius: 8,
    padding: 4,
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  menuItemText: { color: TG.ink, fontSize: 13, lineHeight: 18, fontWeight: '500', flexShrink: 1 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
    maxWidth: '100%',
  },
  statusText: { fontSize: 11, lineHeight: 14, fontWeight: '500', flexShrink: 1 },

  sessionTitle: { color: TG.ink, fontSize: 16, lineHeight: 22, fontWeight: '600' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TG.low,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipEncrypted: { backgroundColor: TG.container },
  chipText: { color: TG.secondary, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  chipTextEncrypted: { color: TG.primary, fontWeight: '600' },

  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  provenance: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  provenanceText: { color: TG.secondary, fontSize: 11, lineHeight: 14, flexShrink: 1 },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TG.container,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  openButtonText: { color: TG.primary, fontSize: 12, lineHeight: 16, fontWeight: '600' },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: TG.low,
  },
  retryText: { color: TG.ink, fontSize: 12, lineHeight: 16, fontWeight: '600', flexShrink: 1 },

  emptyText: { color: TG.secondary, fontSize: 13, lineHeight: 18 },

  endRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  endText: { color: TG.secondary, fontSize: 11, lineHeight: 14, flexShrink: 1 },
  moreButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonText: { color: TG.primary, fontSize: 13, lineHeight: 18, fontWeight: '600' },

  utilBar: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: TG.card,
    borderRadius: 16,
    padding: 12,
  },
  utilButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  utilButtonPrimary: { backgroundColor: TG.container },
  utilButtonSecondary: { backgroundColor: TG.low },
  utilText: { fontSize: 12, lineHeight: 16, fontWeight: '600', flexShrink: 1 },

  muted: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});



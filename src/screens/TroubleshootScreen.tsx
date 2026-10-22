import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { AppHeader, SectionLabel, TgIcon, useToast, type TgIconName } from '../components/ui';
import { FONT, ON_ACCENT, TG_LIGHT,  RADIUS, tgTheme, type TGPalette } from '../theme/theme';
import { sessionsRepo } from '../db/repositories/sessions';
import { isCryptoAvailable } from '../backup/crypto';
import { runRestoreDrill } from '../backup/restoreDrill';
import { secureStore } from '../state/secureStore';
import { useSettingsStore } from '../state/settingsStore';
import { clearErrorLog, getErrorLog, logError, type ErrorLogEntry } from '../state/errorLog';
import { OEM_GUIDE } from '../background/oemGuide';
import { nativeStatus } from '../background/androidStatus';
import { lastWake, type WakeSource } from '../background/wake';
import { relativeTime } from '../background/statusText';
import { useTourStore } from '../state/tourStore';
import type { RootStackParamList } from '../navigation/Routes';

type Props = NativeStackScreenProps<RootStackParamList, 'Troubleshoot'>;

const CARD_SHADOW = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  shadowColor: TG_LIGHT.ink,
};

type Diagnostics = {
  configured: boolean;
  lastBackup: string;
  lastFailure: string;
  watchedFolders: number;
  encryption: string;
  background: string;
  lastWake: string;
};

const EMPTY_DIAGNOSTICS: Diagnostics = {
  configured: false,
  lastBackup: 'Belum ada',
  lastFailure: 'Tidak ada',
  watchedFolders: 0,
  encryption: 'Nonaktif',
  background: 'Menunggu',
  lastWake: 'Belum pernah',
};

/**
 * Which path fired: the exact alarm's service, or the inexact JobScheduler. A
 * "JobScheduler" line next to a schedule set to a fixed hour is the signature of
 * an alarm the device held back; an "alarm eksak" line means the alarm itself
 * arrived and woke us at the right time.
 */
function wakeLabel(source: WakeSource | null): string {
  if (source === 'alarm') {
    return 'alarm eksak';
  }
  if (source === 'job') {
    return 'JobScheduler';
  }
  return 'sumber tidak diketahui';
}

export default function TroubleshootScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG, mode);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gutter = width >= 768 ? 24 : 16;

  const { toast, showToast } = useToast('bottom');
  const [diag, setDiag] = useState<Diagnostics>(EMPTY_DIAGNOSTICS);
  const [drillBusy, setDrillBusy] = useState(false);
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([]);

  const load = useCallback(async () => {
    setErrorLog(getErrorLog());
    const [configured, last, recent] = await Promise.all([
      secureStore.isConfigured(),
      sessionsRepo.lastFinished(),
      sessionsRepo.recent(20),
    ]);
    const failed = recent.find(
      session => session.status === 'failed' || session.status === 'partial',
    );
    const current = useSettingsStore.getState().config;
    const wake = lastWake();
    setDiag({
      configured,
      lastBackup: last ? relativeTime(last.finished_at ?? last.started_at) : 'Belum ada',
      lastFailure: failed ? failed.error_reason ?? 'Tanpa detail' : 'Tidak ada',
      watchedFolders: current.watchedFolders.length,
      encryption: current.encryptionEnabled && isCryptoAvailable() ? 'Aktif (AES-256)' : 'Nonaktif',
      background: current.automationPaused
        ? 'Dijeda'
        : current.scheduleMode === 'manual'
          ? 'Manual'
          : 'Aktif',
      lastWake: wake == null ? 'Belum pernah' : `${relativeTime(wake.at)} (${wakeLabel(wake.source)})`,
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      load().catch(() => undefined);
    });
    load().catch(() => undefined);
    return unsubscribe;
  }, [navigation, load]);

  const onOpenAppSettings = () => {
    Linking.openSettings().catch(() =>
      showToast('Gagal', 'Tidak bisa membuka pengaturan aplikasi.', 'error'),
    );
  };

  const onRunDrill = async () => {
    setDrillBusy(true);
    try {
      const result = await runRestoreDrill();
      showToast(result.ok ? 'Drill Berhasil' : 'Drill Gagal', result.message, result.ok ? 'success' : 'error');
      if (!result.ok) logError('drill', result.message);
    } catch (error) {
      logError('drill', error);
      showToast('Drill Gagal', error instanceof Error ? error.message : 'Coba lagi nanti.', 'error');
    } finally {
      setDrillBusy(false);
      setErrorLog(getErrorLog());
    }
  };

  // PRD §13 / §19 #11. Without this exemption, starting the foreground service
  // from a headless scheduled job can throw ForegroundServiceStartNotAllowedException
  // on API 31+. Opens the system battery-optimization list, where the user picks
  // TeleVault, then falls back to the app settings page.
  //
  // The direct `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` dialog was dropped: it
  // needs a restricted permission Play only grants per app, and it needed the
  // package id, which drifts as soon as the applicationId changes.
  const onOpenBatterySettings = () => {
    if (Platform.OS !== 'android') {
      return;
    }
    Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() =>
      Linking.openSettings().catch(() =>
        showToast('Gagal', 'Tidak bisa membuka pengaturan baterai.', 'error'),
      ),
    );
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Settings');
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader subtitle="Troubleshooting" onBack={goBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: 16,
          paddingBottom: 32 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <View style={styles.section}>
            <SectionLabel title="DIAGNOSTIK PERANGKAT" icon="info" />
            <View style={styles.card}>
              <InfoRow
                icon="send"
                label="Bot Telegram"
                value={diag.configured ? 'Terhubung' : 'Belum diatur'}
                tone={diag.configured ? 'ok' : 'warn'}
              />
              <InfoRow
                icon="history"
                label="Backup terakhir"
                value={diag.lastBackup}
                tone={diag.lastBackup === 'Belum ada' ? 'warn' : 'ok'}
              />
              <InfoRow
                icon="wifiOff"
                label="Kegagalan terakhir"
                value={diag.lastFailure}
                tone={diag.lastFailure === 'Tidak ada' ? 'ok' : 'error'}
              />
              <InfoRow
                icon="folder"
                label="Folder terpantau"
                value={`${diag.watchedFolders} folder`}
                tone="plain"
              />
              <InfoRow icon="lock" label="Enkripsi" value={diag.encryption} tone="plain" />
              <InfoRow
                icon="schedule"
                label="Otomasi latar belakang"
                value={diag.background}
                tone={diag.background === 'Dijeda' ? 'warn' : 'plain'}
              />
              <InfoRow
                icon="schedule"
                label="Jadwal terakhir bangun"
                value={diag.lastWake}
                tone={diag.lastWake === 'Belum pernah' ? 'warn' : 'plain'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel title="IZIN LATAR BELAKANG" icon="batteryCharging" />
            <View style={styles.card}>
              <Text style={styles.body} numberOfLines={4}>
                Sebagian besar backup yang terlewat disebabkan pembatasan baterai. Matikan
                optimasi baterai agar jadwal otomatis tetap berjalan.
              </Text>
              <View style={styles.warning}>
                <TgIcon name="warning" color={TG.error} size={16} />
                <Text style={styles.warningText} numberOfLines={4}>
                  Tanpa pengecualian optimasi baterai, backup terjadwal bisa diblokir sistem di
                  Android 12 ke atas.
                </Text>
              </View>
              <Pressable
                onPress={onOpenBatterySettings}
                accessibilityRole="button"
                accessibilityLabel="Izinkan tanpa optimasi baterai"
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <TgIcon name="batteryCharging" color={mode === 'dark' ? '#003147' : ON_ACCENT.strong} size={18} />
                <Text style={styles.primaryButtonText} numberOfLines={1}>
                  Izinkan Tanpa Optimasi Baterai
                </Text>
              </Pressable>
              <Pressable
                onPress={onOpenAppSettings}
                accessibilityRole="button"
                accessibilityLabel="Buka pengaturan aplikasi"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <TgIcon name="tune" color={TG.primary} size={18} />
                <Text style={styles.secondaryButtonText} numberOfLines={1}>
                  Buka Pengaturan Aplikasi
                </Text>
              </Pressable>
              <Pressable
                onPress={() => useTourStore.getState().show()}
                accessibilityRole="button"
                accessibilityLabel="Ulangi persiapan latar belakang"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <TgIcon name="batteryCharging" color={TG.primary} size={18} />
                <Text style={styles.secondaryButtonText} numberOfLines={1}>
                  Ulangi Persiapan Latar Belakang
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel title="AUTOSTART PER MEREK" icon="cached" />
            <View style={styles.card}>
              {OEM_GUIDE.map(item => (
                <View key={item.oem} style={styles.oemRow}>
                  <View style={styles.oemIcon}>
                    <TgIcon name="cached" color={TG.primary} size={18} />
                  </View>
                  <View style={styles.oemText}>
                    <Text style={styles.oemName} numberOfLines={1}>
                      {item.oem}
                    </Text>
                    <Text style={styles.oemPath} numberOfLines={2}>
                      {item.path}
                    </Text>
                  </View>
                </View>
              ))}
              <Pressable
                onPress={() => nativeStatus()?.openAutostartSettings()}
                accessibilityRole="button"
                accessibilityLabel="Buka setelan autostart"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <TgIcon name="cached" color={TG.primary} size={18} />
                <Text style={styles.secondaryButtonText} numberOfLines={1}>
                  Buka Setelan Autostart
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel title="UJI PEMULIHAN" icon="shield" />
            <View style={styles.card}>
              <Text style={styles.body} numberOfLines={4}>
                Mengunduh arsip terkecil dari Telegram, mendekripsi, lalu mencocokkan hash-nya di
                folder sementara. Membuktikan backup Anda benar-benar bisa dipulihkan. Berjalan
                sekali jalan perlu internet dan beberapa saat.
              </Text>
              <Pressable
                onPress={onRunDrill}
                disabled={drillBusy}
                accessibilityRole="button"
                accessibilityLabel="Uji pemulihan backup"
                style={({ pressed }) => [
                  styles.primaryButton,
                  drillBusy && styles.disabled,
                  pressed && styles.pressed,
                ]}>
                {drillBusy ? (
                  <ActivityIndicator color={mode === 'dark' ? '#003147' : ON_ACCENT.strong} size="small" />
                ) : (
                  <TgIcon name="shield" color={mode === 'dark' ? '#003147' : ON_ACCENT.strong} size={18} />
                )}
                <Text style={styles.primaryButtonText} numberOfLines={1}>
                  {drillBusy ? 'Menguji\u2026' : 'Uji Pulihkan Arsip Terkecil'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel title="LOG ERROR" icon="warning" />
            <View style={styles.card}>
              {errorLog.length === 0 ? (
                <Text style={styles.body}>Tidak ada error tercatat.</Text>
              ) : (
                <>
                  {errorLog.map((entry, index) => (
                    <View key={`${entry.at}-${index}`} style={styles.logRow}>
                      <Text style={styles.logScope} numberOfLines={1}>
                        {new Date(entry.at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} {'\u00b7'}{' '}
                        {entry.scope}
                      </Text>
                      <Text style={styles.logMessage} numberOfLines={3}>
                        {entry.message}
                      </Text>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => {
                      clearErrorLog();
                      setErrorLog([]);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Bersihkan log error"
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                    <TgIcon name="close" color={TG.primary} size={16} />
                    <Text style={styles.secondaryButtonText} numberOfLines={1}>
                      Bersihkan Log
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel title="MASIH GAGAL?" icon="warning" />
            <View style={styles.card}>
              <Text style={styles.body} numberOfLines={4}>
                Isi daya ponsel, sambungkan ke Wi-Fi, lalu jalankan backup manual dari tab
                Utama. Jika masih gagal, periksa pesan pada kartu Kegagalan terakhir di atas.
              </Text>
              <Pressable
                onPress={() => navigation.navigate('Stats')}
                accessibilityRole="button"
                accessibilityLabel="Buka riwayat backup"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <TgIcon name="history" color={TG.primary} size={18} />
                <Text style={styles.secondaryButtonText} numberOfLines={1}>
                  Lihat Riwayat Backup
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {toast}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: TgIconName;
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'error' | 'plain';
}) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG, mode);
  const valueColor =
    tone === 'ok'
      ? TG.primary
      : tone === 'warn'
        ? TG.secondary
        : tone === 'error'
          ? TG.error
          : TG.ink;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <TgIcon name={icon} color={TG.primary} size={18} />
      </View>
      <Text style={styles.infoLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (TG: TGPalette, mode: 'light' | 'dark') => StyleSheet.create({
  root: { flex: 1, backgroundColor: TG.bg },
  scroll: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 },
  section: { gap: 12 },
  card: {
    backgroundColor: TG.card,
    borderRadius: RADIUS.md,
    padding: 16,
    gap: 12,
    ...CARD_SHADOW,
  },
  body: { color: TG.secondary, fontSize: 13, lineHeight: 19 },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: TG.errorSoft,
    borderRadius: RADIUS.md,
    padding: 10,
  },
  warningText: { color: TG.error, fontSize: 13, lineHeight: 18, flex: 1, minWidth: 0 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: TG.container,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '500', fontFamily: FONT.medium, flex: 1, minWidth: 0 },
  infoValue: { fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi, maxWidth: '50%', textAlign: 'right' },

  logRow: { gap: 2, marginBottom: 10 },
  logScope: { color: TG.secondary, fontSize: 11, lineHeight: 15, fontFamily: FONT.semi },
  logMessage: { color: TG.ink, fontSize: 12, lineHeight: 17, fontFamily: FONT.medium },
  disabled: { opacity: 0.4 },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: TG.primary,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: mode === 'dark' ? '#003147' : ON_ACCENT.strong,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600', fontFamily: FONT.semi,
    flexShrink: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: TG.container,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: TG.ink, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },

  oemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  oemIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: TG.low,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  oemText: { flex: 1, minWidth: 0, gap: 2 },
  oemName: { color: TG.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: FONT.semi },
  oemPath: { color: TG.secondary, fontSize: 13, lineHeight: 18 },

  pressed: { opacity: 0.85 },
});

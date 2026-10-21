import React, { useEffect, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { FONT, RADIUS, SPACE, tgTheme, TYPE } from '../theme/theme';
import { TgIcon } from './ui';
import { nativeStatus } from '../background/androidStatus';
import { guideFor } from '../background/oemGuide';
import { mmkv } from '../state/mmkv';
import { useSettingsStore } from '../state/settingsStore';
import { useTourStore } from '../state/tourStore';

const DONE_KEY = 'bg_tour_done';

/**
 * First-run tour for the two Android permissions that decide whether scheduled
 * backups actually happen. Shown once, right after setup; replayable from
 * Troubleshooting. Autostart cannot be toggled by an app on any OEM, so that
 * step opens the vendor screen and shows the path instead of pretending.
 */
export function BackgroundTour() {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  const setupDone = useSettingsStore(state => state.setupDone);
  const forced = useTourStore(state => state.open);
  const hide = useTourStore(state => state.hide);
  const [done, setDone] = useState(() => mmkv.getString(DONE_KEY) != null);
  const [step, setStep] = useState(0);
  const [granted, setGranted] = useState(false);

  const visible = forced || (setupDone && !done);

  useEffect(() => {
    const native = nativeStatus();
    if (!visible || !native) {
      return;
    }
    const check = () => {
      native.isIgnoringBatteryOptimizations().then(setGranted).catch(() => undefined);
    };
    check();
    // The exemption is granted in a system dialog, so the answer arrives after
    // the user comes back to the app rather than from a callback.
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        check();
      }
    });
    return () => sub.remove();
  }, [visible]);

  const finish = () => {
    mmkv.set(DONE_KEY, '1');
    setDone(true);
    hide();
    setStep(0);
  };

  if (!visible) {
    return null;
  }

  const native = nativeStatus();
  const guide = guideFor(native?.manufacturer);
  const stepTitle = [
    'Supaya backup tidak terlewat',
    'Bebaskan dari optimasi baterai',
    'Aktifkan autostart',
  ][step];

  return (
    <Modal transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.overline}>PERSIAPAN LATAR BELAKANG</Text>
          <Text style={styles.title}>{stepTitle}</Text>

          {step === 0 ? (
            <Text style={styles.body}>
              {'Android mematikan aplikasi di latar belakang untuk menghemat baterai. TeleVault\n'}
              {'butuh dua hal agar jadwal backup benar-benar jalan:\n\n'}
              {'\u2022 Dikecualikan dari optimasi baterai\n'}
              {'\u2022 Autostart aktif setelah HP dinyalakan ulang'}
            </Text>
          ) : null}

          {step === 1 ? (
            <>
              <Text style={styles.body}>
                Ketuk Izinkan, lalu pilih Izinkan pada dialog Android. Tanpa ini, backup terjadwal
                bisa diblokir sistem.
              </Text>
              <View style={styles.statusRow}>
                <TgIcon
                  name={granted ? 'check' : 'warning'}
                  color={granted ? TG.primary : TG.error}
                  size={16}
                />
                <Text style={styles.statusText}>{granted ? 'Sudah aktif' : 'Belum aktif'}</Text>
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={styles.body}>
                {guide
                  ? `Perangkat ${guide.oem}. Buka setelan autostart, lalu izinkan TeleVault berjalan otomatis.`
                  : 'Buka setelan autostart merek Anda, lalu izinkan TeleVault berjalan otomatis.'}
              </Text>
              {guide ? (
                <View style={styles.pathBox}>
                  <Text style={styles.pathText}>{guide.path}</Text>
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.dots}>
            {[0, 1, 2].map(index => (
              <View key={index} style={[styles.dot, index === step && styles.dotActive]} />
            ))}
          </View>

          {step === 1 ? (
            <Pressable
              onPress={() => {
                if (granted) {
                  setStep(2);
                } else {
                  nativeStatus()?.requestIgnoreBatteryOptimizations();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={granted ? 'Lanjut ke autostart' : 'Izinkan tanpa optimasi baterai'}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <Text style={styles.buttonText}>{granted ? 'Lanjut' : 'Izinkan'}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => (step === 2 ? finish() : setStep(step + 1))}
              accessibilityRole="button"
              accessibilityLabel={step === 2 ? 'Selesai' : 'Lanjut'}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <Text style={styles.buttonText}>{step === 2 ? 'Selesai' : 'Lanjut'}</Text>
            </Pressable>
          )}

          {step === 2 ? (
            <Pressable
              onPress={() => nativeStatus()?.openAutostartSettings()}
              accessibilityRole="button"
              accessibilityLabel="Buka setelan autostart"
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>Buka Setelan Autostart</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel="Lewati persiapan"
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
            <Text style={styles.skipText}>Lewati</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (TG: ReturnType<typeof tgTheme>) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: TG.card,
      borderRadius: RADIUS.xl,
      padding: SPACE.base + SPACE.xs,
      gap: SPACE.md,
    },
    overline: {
      color: TG.primary,
      fontSize: 11,
      fontWeight: '700',
      fontFamily: FONT.semi,
      letterSpacing: 0.8,
    },
    title: { ...TYPE.title, color: TG.ink },
    body: { ...TYPE.footnote, color: TG.secondary, lineHeight: 21 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
    statusText: { ...TYPE.caption, color: TG.ink, letterSpacing: 0 },
    pathBox: {
      backgroundColor: TG.primaryFixed,
      borderRadius: RADIUS.sm,
      padding: SPACE.md,
    },
    pathText: { ...TYPE.footnote, color: TG.ink },
    dots: { flexDirection: 'row', gap: 6, marginTop: SPACE.xs },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: TG.outline },
    dotActive: { backgroundColor: TG.primary, width: 16 },
    button: {
      minHeight: 46,
      borderRadius: RADIUS.md,
      backgroundColor: TG.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    buttonText: {
      color: TG.onPrimaryContainer,
      fontSize: 14,
      fontWeight: '600',
      fontFamily: FONT.semi,
    },
    secondaryButton: {
      minHeight: 44,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: TG.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    secondaryText: {
      color: TG.primary,
      fontSize: 14,
      fontWeight: '600',
      fontFamily: FONT.semi,
    },
    skip: { alignItems: 'center', paddingVertical: SPACE.sm },
    skipText: { ...TYPE.footnote, color: TG.secondary },
    pressed: { opacity: 0.85 },
  });

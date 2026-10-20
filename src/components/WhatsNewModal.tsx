import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { FONT, RADIUS, SPACE, tgTheme, TYPE } from '../theme/theme';
import { appVersion } from '../update/updater';
import { WHATS_NEW } from '../update/whatsNew';
import { mmkv } from '../state/mmkv';

const SEEN_KEY = 'whats_new_seen_version';

/**
 * One-time modal after an app update: shows the new version's release notes
 * exactly once (per version), only when that version has an entry in
 * WHATS_NEW. Fresh installs (no previous version recorded) see nothing —
 * a brand-new user does not need update notes.
 */
export function WhatsNewModal() {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const styles = createStyles(TG);
  const [visible, setVisible] = useState(false);
  const [version, setVersion] = useState('');

  useEffect(() => {
    const current = appVersion();
    // '99.0.0' fallback means the version is unreadable; never show the modal
    // for an unknown version.
    if (current === '99.0.0') return;
    const previous = mmkv.getString(SEEN_KEY);
    // First run on a clean install: record and stay quiet.
    if (!previous) {
      mmkv.set(SEEN_KEY, current);
      return;
    }
    if (previous !== current && WHATS_NEW[current]) {
      setVersion(current);
      setVisible(true);
      mmkv.set(SEEN_KEY, current);
    }
  }, []);

  if (!visible) return null;
  const notes = WHATS_NEW[version];
  return (
    <Modal transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.overline}>PEMBARUAN BERHASIL</Text>
          <Text style={styles.title}>{notes.title}</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {notes.items.map((item, index) => (
              <View key={index} style={styles.row}>
                <View style={styles.bullet} />
                <Text style={styles.item}>{item}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => setVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Tutup catatan pembaruan"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Mengerti</Text>
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
      gap: SPACE.sm,
    },
    overline: {
      color: TG.primary,
      fontSize: 11,
      fontWeight: '700',
      fontFamily: FONT.semi,
      letterSpacing: 0.8,
    },
    title: { ...TYPE.headline, color: TG.ink },
    list: { maxHeight: 320 },
    row: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: TG.primaryContainer,
      marginTop: 7,
    },
    item: { ...TYPE.body, color: TG.ink, flex: 1 },
    button: {
      minHeight: 44,
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
    pressed: { opacity: 0.85 },
  });

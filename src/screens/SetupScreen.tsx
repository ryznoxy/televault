import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import {
  AppHeader,
  PulsingDot,
  TgIcon,
  useToast,
} from '../components/ui';
import { FONT,  ELEVATION, RADIUS, tgTheme, TG_LIGHT as TG } from '../theme/theme';
import { isCryptoAvailable, newSaltB64 } from '../backup/crypto';
import { TelegramBotApi } from '../net/telegramApi';
import { stopScheduler } from '../background/scheduler';
import { clipboard } from '../state/clipboard';
import { passphraseStrength } from '../state/passphrase';
import { secureStore } from '../state/secureStore';
import { useSettingsStore } from '../state/settingsStore';
import type { RootStackParamList } from '../navigation/Routes';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

type TokenStatus = 'idle' | 'checking' | 'valid' | 'invalid';
type TestStatus = 'idle' | 'running' | 'ok' | 'err';
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved';

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;

export default function SetupScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const gutter = isTablet ? 24 : 16;

  const setSetupDone = useSettingsStore(state => state.setSetupDone);
  const setAutomationPaused = useSettingsStore(state => state.setAutomationPaused);
  const setEncryptionEnabled = useSettingsStore(state => state.setEncryptionEnabled);
  const setEncryptionSalt = useSettingsStore(state => state.setEncryptionSalt);

  const { toast, showToast } = useToast();

  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('idle');

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const testTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateTokenId = useRef(0);

  useEffect(() => {
    secureStore.get().then(credentials => {
      setToken(credentials.botToken);
      setChatId(credentials.chatId);
    });
  }, []);

  useEffect(
    () => () => {
      if (testTimer.current) {
        clearTimeout(testTimer.current);
      }
      if (sendTimer.current) {
        clearTimeout(sendTimer.current);
      }
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    },
    [],
  );

  const runValidateToken = useCallback(async (value: string) => {
    if (!value.trim()) {
      setTokenStatus('idle');
      return;
    }
    const id = validateTokenId.current + 1;
    validateTokenId.current = id;
    setTokenStatus('checking');
    try {
      const api = new TelegramBotApi(value, '0');
      await api.getMe();
      if (validateTokenId.current === id) {
        setTokenStatus('valid');
      }
    } catch {
      if (validateTokenId.current === id) {
        setTokenStatus('invalid');
      }
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      runValidateToken(token);
    }, 350);
    return () => clearTimeout(handle);
  }, [token, runValidateToken]);

  const onCopyToken = () => {
    if (!token) {
      return;
    }
    clipboard.setString(token);
    showToast('Disalin', 'Token bot disalin ke clipboard.', 'success');
  };

  const onOpenBotFather = () => {
    Linking.openURL('https://t.me/BotFather').catch(() => undefined);
  };

  const onTestConnection = async () => {
    if (!token.trim()) {
      return;
    }
    setTestStatus('running');
    setTestMessage('Menghubungkan ke API\u2026');
    const started = Date.now();
    try {
      const api = new TelegramBotApi(token, chatId);
      await api.getMe();
      const latency = Date.now() - started;
      setTestStatus('ok');
      setTestMessage(`Status: HTTP 200 OK (Latensi ${latency}ms)`);
      if (testTimer.current) {
        clearTimeout(testTimer.current);
      }
      testTimer.current = setTimeout(() => {
        setTestStatus('idle');
        setTestMessage(null);
      }, 3000);
    } catch (error) {
      setTestStatus('err');
      setTestMessage(error instanceof Error ? error.message : String(error));
      if (testTimer.current) {
        clearTimeout(testTimer.current);
      }
      testTimer.current = setTimeout(() => {
        setTestStatus('idle');
        setTestMessage(null);
      }, 3000);
    }
  };

  const onSendTest = async () => {
    if (!chatId.trim() || !token.trim()) {
      return;
    }
    setSendStatus('sending');
    setSendError(null);
    setSentTo(null);
    try {
      const api = new TelegramBotApi(token, chatId);
      await api.sendMessage('TeleVault test message \u2014 dari aplikasi.');
      let resolved = chatId;
      try {
        const chat = await api.getChat();
        resolved = chat.title ?? chat.username ?? chatId;
      } catch {
        resolved = chatId;
      }
      setSentTo(resolved);
      setSendStatus('sent');
      if (sendTimer.current) {
        clearTimeout(sendTimer.current);
      }
      sendTimer.current = setTimeout(() => {
        setSendStatus('idle');
        setSentTo(null);
      }, 3500);
    } catch (error) {
      setSendStatus('error');
      setSendError(error instanceof Error ? error.message : String(error));
    }
  };

  const onSave = async () => {
    const trimmedToken = token.trim();
    const trimmedChat = chatId.trim();
    if (!trimmedToken || !trimmedChat) {
      showToast('Tidak bisa menyimpan', 'Token dan Chat ID wajib diisi.', 'error');
      return;
    }
    setSaveStatus('saving');
    try {
      const api = new TelegramBotApi(trimmedToken, trimmedChat);
      await api.getMe();
      await secureStore.saveBotToken(trimmedToken);
      await secureStore.saveChatId(trimmedChat);
      if (passphrase.trim() !== '' && cryptoReady) {
        await secureStore.saveEncryptionPassword(passphrase);
        setEncryptionEnabled(true);
        const currentSalt = useSettingsStore.getState().config.encryptionSalt;
        if (!currentSalt) {
          setEncryptionSalt(newSaltB64());
        }
      } else {
        // No passphrase, or crypto backend unavailable: never claim encryption is on.
        setEncryptionEnabled(false);
      }
      setSetupDone(true);
      setSaveStatus('saved');
      showToast('Tersimpan', 'Kredensial terverifikasi dan tersimpan.', 'success');
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(() => {
        setSaveStatus('idle');
        navigation.navigate('Home');
      }, 1500);
    } catch (error) {
      setSaveStatus('idle');
      const msg = error instanceof Error ? error.message : String(error);
      showToast('Verifikasi gagal', msg, 'error');
    }
  };

  const onDisconnect = () => {
    Alert.alert(
      'Putuskan tautan bot?',
      'Sinkronisasi instan akan dihentikan pada perangkat ini. Folder dan kategori yang Anda pantau tetap aman.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Putuskan',
          style: 'destructive',
          onPress: async () => {
            try {
              await secureStore.clear();
              setSetupDone(false);
              setAutomationPaused(true);
              setEncryptionEnabled(false);
              await stopScheduler();
            } finally {
              setToken('');
              setChatId('');
              setPassphrase('');
              setTokenStatus('idle');
              setTestStatus('idle');
              setTestMessage(null);
              setSendStatus('idle');
              setSentTo(null);
              setSendError(null);
              setSaveStatus('idle');
              showToast('Diputuskan', 'Sesi bot ditutup secara aman.', 'info');
            }
          },
        },
      ],
    );
  };

  const strength = passphraseStrength(passphrase);
  const cryptoReady = isCryptoAvailable();
  const sendLabel =
    sendStatus === 'sending'
      ? 'Mengirim\u2026'
      : sendStatus === 'sent'
        ? 'Terkirim'
        : 'Kirim Pesan Uji';
  const testLabel =
    testStatus === 'running' ? 'Menghubungkan ke API\u2026' : 'Uji Koneksi Bot';
  const saveLabel =
    saveStatus === 'saving'
      ? 'Memverifikasi\u2026'
      : saveStatus === 'saved'
        ? 'Tersimpan & Terenkripsi'
        : 'Simpan & Verifikasi Kredensial';
  const saving = saveStatus === 'saving' || saveStatus === 'saved';

  return (
    <View style={styles.root}>
      <AppHeader subtitle="Setup Key" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: 16,
          paddingBottom: 120 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <View style={styles.card}>
            <View style={styles.glow} pointerEvents="none" />
            <View style={styles.guidanceRow}>
              <View style={styles.guidanceIcon}>
                <TgIcon name="vpnKey" color={TG.primaryContainer} size={24} />
              </View>
              <View style={styles.guidanceText}>
                <View style={styles.guidanceTitleRow}>
                  <Text style={styles.guidanceTitle}>Kredensial & Enkripsi</Text>
                  <View style={styles.aesPill}>
                    <Text style={styles.aesText}>AES-256</Text>
                  </View>
                </View>
                <Text style={styles.guidanceBody}>
                  Hubungkan bot Telegram Anda untuk mengaktifkan backup cloud tanpa
                  batas dan terenkripsi end-to-end secara otomatis di latar belakang.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>TELEGRAM BOT TOKEN</Text>
              <View
                style={[
                  styles.statusPill,
                  tokenStatus === 'valid'
                    ? { backgroundColor: TG.container }
                    : { backgroundColor: TG.low },
                ]}>
                <PulsingDot
                  color={tokenStatus === 'valid' ? TG.primaryContainer : TG.outline}
                  size={6}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: tokenStatus === 'valid' ? TG.primary : TG.outline },
                  ]}
                  numberOfLines={1}>
                  {tokenStatus === 'valid'
                    ? 'Valid & Terhubung'
                    : tokenStatus === 'checking'
                      ? 'Memeriksa\u2026'
                      : 'Belum diverifikasi'}
                </Text>
              </View>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="123456:ABC-DEF..."
                placeholderTextColor={TG.outline}
                secureTextEntry={!showToken}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Token bot Telegram"
                style={styles.codeInput}
                numberOfLines={1}
              />
              <View style={styles.inputActions}>
                <Pressable
                  onPress={() => setShowToken(v => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showToken ? 'Sembunyikan token' : 'Tampilkan token'}
                  hitSlop={HIT_SLOP}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  <TgIcon
                    name={showToken ? 'eyeOff' : 'eye'}
                    color={TG.secondary}
                    size={18}
                  />
                </Pressable>
                <Pressable
                  onPress={onCopyToken}
                  accessibilityRole="button"
                  accessibilityLabel="Salin token"
                  hitSlop={HIT_SLOP}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  <TgIcon name="copy" color={TG.secondary} size={18} />
                </Pressable>
              </View>
            </View>
            <View style={styles.helperRow}>
              <View style={styles.helperInfo}>
                <TgIcon name="info" color={TG.secondary} size={14} />
                <Text style={styles.helperText} numberOfLines={2}>
                  Dapatkan dari{' '}
                  <Text style={styles.helperHighlight}>@BotFather</Text> di Telegram
                </Text>
              </View>
              <Pressable
                onPress={onOpenBotFather}
                accessibilityRole="button"
                hitSlop={HIT_SLOP}>
                <Text style={styles.linkText} numberOfLines={1}>
                  Buka BotFather
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>TARGET CHAT ID / CHANNEL ID</Text>
              <Text style={styles.helperRight}>Private Cloud Storage</Text>
            </View>
            <View style={styles.inputSplit}>
              <TextInput
                value={chatId}
                onChangeText={setChatId}
                placeholder="-1001234567890 atau @channelusername"
                placeholderTextColor={TG.outline}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="ID chat tujuan"
                style={[styles.codeInput, { flex: 1, minWidth: 0 }]}
                numberOfLines={1}
              />
              <Pressable
                onPress={onSendTest}
                disabled={sendStatus === 'sending' || !chatId.trim() || !token.trim()}
                accessibilityRole="button"
                accessibilityLabel="Kirim pesan uji"
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (sendStatus === 'sending' || !chatId.trim() || !token.trim()) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}>
                {sendStatus === 'sending' ? (
                  <ActivityIndicator color={TG.ink} size="small" />
                ) : (
                  <TgIcon name="send" color={TG.primaryContainer} size={16} />
                )}
                <Text style={styles.secondaryButtonText} numberOfLines={1}>
                  {sendLabel}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.helperMuted}>
              Pakai ID angka (mis. -1001234567890) atau @username kanal/grup tujuan
              arsip Anda. Keduanya didukung.
            </Text>
            {sendStatus === 'sent' && sentTo ? (
              <View style={styles.feedbackBanner}>
                <TgIcon name="verified" color={TG.primary} size={18} />
                <Text style={styles.feedbackText} numberOfLines={2}>
                  Pesan uji coba terkirim ke saluran: &quot;{sentTo}&quot;
                </Text>
              </View>
            ) : null}
            {sendStatus === 'error' && sendError ? (
              <View style={[styles.feedbackBanner, styles.errorBanner]}>
                <TgIcon name="error" color={TG.error} size={18} />
                <Text style={[styles.feedbackText, { color: TG.error }]} numberOfLines={3}>
                  {sendError}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.labelRow}>
              <View style={styles.labelInline}>
                <Text style={styles.label}>ENCRYPTION PASSPHRASE</Text>
                <TgIcon name="lock" color={TG.primary} size={15} />
              </View>
              <Text style={styles.secondaryTag}>Zero-Knowledge</Text>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                value={passphrase}
                onChangeText={setPassphrase}
                placeholder="Minimal 8 karakter"
                placeholderTextColor={TG.outline}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Passphrase enkripsi"
                style={[styles.codeInput, { paddingRight: 56 }]}
                numberOfLines={1}
              />
              <View style={[styles.inputActions, { right: 8 }]}>
                <Pressable
                  onPress={() => setShowPass(v => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPass ? 'Sembunyikan passphrase' : 'Tampilkan passphrase'}
                  hitSlop={HIT_SLOP}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  <TgIcon
                    name={showPass ? 'eyeOff' : 'eye'}
                    color={TG.secondary}
                    size={18}
                  />
                </Pressable>
              </View>
            </View>
            {passphrase ? (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBar}>
                  {[0, 1, 2, 3].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSeg,
                        {
                          backgroundColor:
                            i < strength.score ? TG.primary : TG.highest,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.strengthLabel} numberOfLines={1}>
                  {strength.label}
                </Text>
              </View>
            ) : null}
            <View style={styles.infoBox}>
              <View style={styles.infoIcon}>
                <TgIcon name="shield" color={TG.secondary} size={16} />
              </View>
              <Text style={styles.infoText} numberOfLines={4}>
                {passphrase.trim() === ''
                  ? 'Enkripsi tetap NONAKTIF sampai Anda mengatur passphrase. Berkas akan diunggah apa adanya.'
                  : 'Berkas akan dienkripsi secara lokal di perangkat sebelum dikirim ke server Telegram. Hanya Anda yang memegang kuncinya.'}
              </Text>
            </View>
            {!cryptoReady ? (
              <View style={[styles.infoBox, { backgroundColor: TG.errorSoft }]}>
                <View style={styles.infoIcon}>
                  <TgIcon name="error" color={TG.error} size={16} />
                </View>
                <Text style={[styles.infoText, { color: TG.error }]} numberOfLines={3}>
                  Enkripsi tidak tersedia di build ini. Install modul asli atau perbarui
                  aplikasi.
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={onSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            style={({ pressed }) => [
              styles.primaryAction,
              saving && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <TgIcon name="checkCircle" color="#FFFFFF" size={18} />
            )}
            <Text style={styles.primaryActionText} numberOfLines={1}>
              {saveLabel}
            </Text>
          </Pressable>

          <Pressable
            onPress={onTestConnection}
            disabled={testStatus === 'running' || !token.trim()}
            accessibilityRole="button"
            accessibilityState={{ disabled: testStatus === 'running' || !token.trim() }}
            style={({ pressed }) => [
              styles.secondaryAction,
              (testStatus === 'running' || !token.trim()) && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {testStatus === 'running' ? (
              <ActivityIndicator color={TG.ink} size="small" />
            ) : (
              <TgIcon name="cellTower" color={TG.primaryContainer} size={18} />
            )}
            <Text style={styles.secondaryActionText} numberOfLines={1}>
              {testLabel}
            </Text>
          </Pressable>
          {testMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.testStatus,
                {
                  color: testStatus === 'ok' ? TG.primary : testStatus === 'err' ? TG.error : TG.secondary,
                },
              ]}
              numberOfLines={2}>
              {testMessage}
            </Text>
          ) : null}

          <View style={[styles.card, styles.disconnectCard]}>
            <Text style={styles.disconnectEyebrow}>Pengaturan Sambungan Kritis</Text>
            <Text style={styles.disconnectBody} numberOfLines={3}>
              Memutuskan tautan akan menghapus token bot dan menghentikan sinkronisasi
              instan di perangkat ini.
            </Text>
            <Pressable
              onPress={onDisconnect}
              accessibilityRole="button"
              accessibilityLabel="Putuskan tautan bot"
              hitSlop={HIT_SLOP}
              style={({ pressed }) => [styles.disconnectButton, pressed && styles.pressed]}>
              <TgIcon name="linkOff" color={TG.secondary} size={17} />
              <Text style={styles.disconnectText} numberOfLines={1}>
                Putuskan Tautan Bot
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      {toast}
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
  root: { flex: 1, backgroundColor: TG.bg },
  scroll: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 },
  card: {
    backgroundColor: TG.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
    ...CARD_SHADOW,
  },

  glow: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 112,
    height: 112,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,101,142,0.05)',
  },

  guidanceRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  guidanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: TG.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceText: { flex: 1, minWidth: 0, gap: 6 },
  guidanceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  guidanceTitle: { color: TG.ink, fontSize: 17, lineHeight: 22, fontWeight: '600', fontFamily: FONT.semi },
  aesPill: {
    backgroundColor: 'rgba(34,158,217,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.md,
  },
  aesText: { color: TG.primary, fontSize: 10, lineHeight: 14, fontWeight: '600', fontFamily: FONT.semi, letterSpacing: 0.6 },
  guidanceBody: { color: TG.secondary, fontSize: 13, lineHeight: 19 },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    color: TG.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600', fontFamily: FONT.semi,
    letterSpacing: 0.5,
  },
  labelInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  helperRight: { color: TG.secondary, fontSize: 12, lineHeight: 16, fontWeight: '500', fontFamily: FONT.medium },
  secondaryTag: { color: TG.primary, fontSize: 11, lineHeight: 14, fontWeight: '600', fontFamily: FONT.semi },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    flexShrink: 1,
  },
  statusPillText: { fontSize: 11, lineHeight: 14, fontWeight: '600', fontFamily: FONT.semi, flexShrink: 1 },

  inputWrap: { position: 'relative' },
  codeInput: {
    backgroundColor: TG.low,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    color: TG.ink,
    fontSize: 13,
    letterSpacing: 0.2,
    paddingRight: 96,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  helperInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  helperText: { color: TG.secondary, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  helperHighlight: { color: TG.ink, fontWeight: '600', fontFamily: FONT.semi },
  helperMuted: { color: TG.secondary, fontSize: 13, lineHeight: 18 },
  linkText: { color: TG.primary, fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: FONT.semi },

  inputSplit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: TG.container,
  },
  secondaryButtonText: {
    color: TG.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600', fontFamily: FONT.semi,
  },

  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: TG.container,
  },
  errorBanner: { backgroundColor: TG.errorSoft },
  feedbackText: { color: TG.primary, fontSize: 13, lineHeight: 18, flex: 1, minWidth: 0 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: { color: TG.secondary, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi },

  infoBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: TG.low,
    alignItems: 'flex-start',
  },
  infoIcon: { marginTop: 2 },
  infoText: { color: TG.secondary, fontSize: 13, lineHeight: 18, flex: 1, minWidth: 0 },

  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: TG.primary,
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600', fontFamily: FONT.semi,
    flexShrink: 1,
  },

  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: TG.card,
    paddingHorizontal: 16,
    ...ELEVATION.card,
    shadowColor: '#0B1C30',
  },
  secondaryActionText: {
    color: TG.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600', fontFamily: FONT.semi,
    flexShrink: 1,
  },

  testStatus: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },

  disconnectCard: { alignItems: 'center', gap: 8 },
  disconnectEyebrow: {
    color: TG.secondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600', fontFamily: FONT.semi,
    textAlign: 'center',
  },
  disconnectBody: {
    color: TG.secondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 300,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    minHeight: 36,
  },
  disconnectText: { color: TG.secondary, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi },

  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});

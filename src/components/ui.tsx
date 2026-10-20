import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { FONT,  ELEVATION, RADIUS, SPACE, TG_DARK, TG_LIGHT, tgTheme, TYPE } from '../theme/theme';
import { parseClampedInt } from './number';

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Content is centred and capped on tablets/landscape; gutter grows with width. */
export function useResponsive() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isCompact = width < 360;
  return {
    width,
    isTablet,
    isCompact,
    gutter: isTablet ? SPACE.xl : isCompact ? SPACE.base : SPACE.lg,
    contentWidth: Math.min(width, 640),
  };
}

export function Screen({
  children,
  hasNav = true,
}: {
  children: React.ReactNode;
  hasNav?: boolean;
}) {
  const { theme } = useTheme();
  const { gutter } = useResponsive();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + SPACE.sm,
          paddingHorizontal: gutter,
          paddingBottom: (hasNav ? 112 : SPACE.xl) + insets.bottom,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

/** Large iOS-style screen title with optional back affordance and right slot. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <Icon name="chevron" color={theme.ink} direction="left" />
          </Pressable>
        ) : null}
        <View style={styles.headerText}>
          <Text style={[styles.display, { color: theme.ink }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* AppHeader — shared brand bar for Home and Setup                    */
/* ------------------------------------------------------------------ */

export function AppHeader({
  subtitle,
  onBack,
}: {
  subtitle: string;
  onBack?: () => void;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const gutter = isTablet ? 24 : 16;
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const headerBg = mode === 'dark' ? 'rgba(19,26,33,0.96)' : 'rgba(248,249,255,0.96)';
  const backStyle = [
    styles.appHeaderBack,
    { backgroundColor: TG.card, borderColor: TG.highest },
  ];
  return (
    <View
      style={[
        styles.appHeader,
        { paddingTop: insets.top + 8, paddingHorizontal: gutter, backgroundColor: headerBg },
      ]}>
      <View style={styles.appHeaderInner}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={8}
            style={({ pressed }) => [...backStyle, pressed && styles.pressed]}>
            <TgIcon name="chevron" color={TG.ink} size={16} direction="left" />
          </Pressable>
        ) : null}
        <View style={styles.appHeaderText}>
          <View style={styles.appHeaderTitleRow}>
            <Text style={[styles.appHeaderWordmark, { color: TG.ink }]}>TeleVault</Text>
            <View style={[styles.appHeaderE2eePill, { backgroundColor: TG.low }]}>
              <Text style={[styles.appHeaderE2eeText, { color: TG.primary }]}>E2EE</Text>
            </View>
          </View>
          <Text style={[styles.appHeaderSubtitle, { color: TG.secondary }]}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* PulsingDot — small status dot with a soft pulse                    */
/* ------------------------------------------------------------------ */

export function PulsingDot({ color, size = 8 }: { color: string; size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.5] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        }}
      />
      <View
        style={{ width: size, height: size, borderRadius: size, backgroundColor: color }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Toast — floating status banner with auto-hide                      */
/* ------------------------------------------------------------------ */

export type ToastTone = 'success' | 'info' | 'error';
export type ToastEntry = { title: string; message: string; tone: ToastTone };

export function Toast({
  toast,
  position = 'top',
}: {
  toast: ToastEntry | null;
  position?: 'top' | 'bottom';
}) {
  const insets = useSafeAreaInsets();
  const visible = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(visible, {
      toValue: toast ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [toast, visible]);
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  if (!toast) {
    return null;
  }
  const toneBg = toast.tone === 'error' ? TG.errorSoft : TG.container;
  const iconName: TgIconName = toast.tone === 'error' ? 'error' : toast.tone === 'info' ? 'info' : 'check';
  const iconColor = toast.tone === 'error' ? TG.error : TG.primary;
  const translateY = visible.interpolate({
    inputRange: [0, 1],
    outputRange: position === 'bottom' ? [12, 0] : [-12, 0],
  });
  const anchor =
    position === 'bottom' ? { bottom: insets.bottom + 24 } : { top: insets.top + 56 };
  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole={toast.tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={toast.tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.toastWrap, anchor, { opacity: visible, transform: [{ translateY }] }]}>
      <View style={[styles.toast, ELEVATION.float, { shadowColor: '#0B1C30' }]}>
        <View style={[styles.toastIcon, { backgroundColor: toneBg }]}>
          <TgIcon name={iconName} color={iconColor} size={18} />
        </View>
        <View style={styles.toastText}>
          <Text style={styles.toastTitle} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={styles.toastMsg} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function useToast(position: 'top' | 'bottom' = 'top') {
  const [entry, setEntry] = useState<ToastEntry | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (title: string, message: string, tone: ToastTone = 'info') => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setEntry({ title, message, tone });
    timer.current = setTimeout(() => setEntry(null), 2600);
  };
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );
  const toast = entry ? <Toast toast={entry} position={position} /> : null;
  return { toast, showToast };
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */



export function Card({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        ELEVATION.card,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
        style,
      ]}>
      {title ? <Text style={[styles.cardTitle, { color: theme.muted }]}>{title}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={[styles.hint, { color: theme.muted }]}>{children}</Text>;
}

/** Uppercase section eyebrow with a trailing glyph, used above each card. */
export function SectionLabel({ title, icon }: { title: string; icon: TgIconName }) {
  const { mode } = useTheme();
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText} numberOfLines={1}>
        {title}
      </Text>
      <TgIcon name={icon} color={tgTheme(mode).secondary} size={16} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

export function Row({
  label,
  subtitle,
  value,
  onPress,
  right,
  icon,
  last,
}: {
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  icon?: IconName;
  last?: boolean;
}) {
  const { theme } = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
          <Icon name={icon} color={theme.accent} size={18} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.ink }]} numberOfLines={2}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: theme.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        {value != null ? (
          <Text style={[styles.rowValue, { color: theme.muted }]} numberOfLines={3}>
            {value}
          </Text>
        ) : null}
        {right}
        {onPress ? <Icon name="chevron" color={theme.faint} /> : null}
      </View>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && onPress ? { opacity: 0.6 } : null,
      ]}>
      {content}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const bg =
    variant === 'primary' ? theme.accent : variant === 'secondary' ? theme.surface : 'transparent';
  const fg = variant === 'primary' ? theme.onAccent : theme.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        ELEVATION.card,
        {
          backgroundColor: bg,
          borderColor: variant === 'secondary' ? theme.border : 'transparent',
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          shadowColor: theme.shadow,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {icon ? <Icon name={icon} color={fg} size={18} /> : null}
      <Text style={[styles.buttonLabel, { color: fg }]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: TG.highest, true: TG.primaryContainer }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={TG.highest}
    />
  );
}

/** iOS-style switch on the TG (Telegram-blue) palette, for the TG-branded screens. */
export function TgSwitch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: TG.highest, true: TG.primaryContainer }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={TG.highest}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segmented, { backgroundColor: theme.surfaceAlt }]}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segment,
              active && [
                styles.segmentActive,
                ELEVATION.card,
                { backgroundColor: theme.surface, shadowColor: theme.shadow },
              ],
              pressed && !active && { opacity: 0.6 },
            ]}>
            <Text
              style={[styles.segmentLabel, { color: active ? theme.ink : theme.muted }]}
              numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SLIDER_THUMB = 22;

/** Pure-JS slider (PanResponder + onLayout) — no native dependency. */
export function RangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  accessibilityLabel,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
}) {
  const { mode } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const commitAt = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) {
      return;
    }
    const ratio = Math.max(0, Math.min(1, x / w));
    const stepped = Math.round((min + ratio * (max - min)) / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));
    if (clamped !== valueRef.current) {
      onChangeRef.current(clamped);
    }
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => commitAt(event.nativeEvent.locationX),
      onPanResponderMove: event => commitAt(event.nativeEvent.locationX),
    }),
  ).current;

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const fillWidth = ratio * trackWidth;
  const thumbLeft = Math.max(0, Math.min(trackWidth - SLIDER_THUMB, ratio * trackWidth - SLIDER_THUMB / 2));
  const text = `${Math.round(value)}`;

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => {
        const w = event.nativeEvent.layout.width;
        widthRef.current = w;
        setTrackWidth(w);
      }}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value, text }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event: AccessibilityActionEvent) => {
        if (event.nativeEvent.actionName === 'increment') {
          onChange(Math.min(max, value + step));
        } else if (event.nativeEvent.actionName === 'decrement') {
          onChange(Math.max(min, value - step));
        }
      }}
      {...responder.panHandlers}
      style={styles.sliderHit}>
      <View style={[styles.sliderTrack, { backgroundColor: tgTheme(mode).highest }]} />
      <View
        style={[styles.sliderFill, { width: fillWidth, backgroundColor: tgTheme(mode).primaryContainer }]}
      />
      <View style={[styles.sliderThumb, ELEVATION.card, { left: thumbLeft, shadowColor: '#0B1C30' }]} />
    </View>
  );
}

export function NumberField({
  value,
  min,
  max,
  fallback,
  onCommit,
  format,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  fallback: number;
  onCommit: (value: number) => void;
  format?: (value: number) => string;
  accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const shown = focused ? draft : format ? format(value) : String(value);

  return (
    <TextInput
      style={[
        styles.numberField,
        {
          color: theme.ink,
          backgroundColor: theme.surfaceAlt,
          borderColor: focused ? theme.accent : 'transparent',
        },
      ]}
      value={shown}
      keyboardType="number-pad"
      selectTextOnFocus
      accessibilityLabel={accessibilityLabel}
      placeholderTextColor={theme.faint}
      onFocus={() => {
        setFocused(true);
        setDraft(String(value));
      }}
      onChangeText={text => setDraft(text.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        const next = parseClampedInt(draft, min, max, fallback);
        onCommit(next);
        setDraft(String(next));
        setFocused(false);
      }}
    />
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  secureTextEntry,
  keyboardType,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numbers-and-punctuation';
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.faint}
      accessibilityLabel={accessibilityLabel}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.textField,
        {
          color: theme.ink,
          backgroundColor: theme.surfaceAlt,
          borderColor: focused ? theme.accent : 'transparent',
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Indicators                                                          */
/* ------------------------------------------------------------------ */

export function ProgressBar({ progress }: { progress: number }) {
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { backgroundColor: TG.low }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: TG.primaryContainer }]} />
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warn' | 'danger';
}) {
  const { theme } = useTheme();
  const tones: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: theme.surfaceAlt, fg: theme.muted },
    accent: { bg: theme.accentSoft, fg: theme.accent },
    success: { bg: theme.successSoft, fg: theme.success },
    warn: { bg: theme.accentSoft, fg: theme.warn },
    danger: { bg: theme.accentSoft, fg: theme.danger },
  };
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: fg }]} />
      <Text style={[styles.badgeLabel, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.tile,
        ELEVATION.card,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
      ]}>
      <Text style={[styles.tileValue, { color: theme.ink }]} numberOfLines={2}>
        {value}
      </Text>
      <Text style={[styles.tileLabel, { color: theme.muted }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export type TabKey = 'home' | 'setup' | 'settings' | 'stats';

const TABS: { key: TabKey; label: string; icon: TgIconName }[] = [
  { key: 'home', label: 'Utama', icon: 'grid' },
  { key: 'setup', label: 'Setup Key', icon: 'key' },
  { key: 'settings', label: 'Pengaturan', icon: 'tune' },
  { key: 'stats', label: 'Riwayat', icon: 'history' },
];

/** Bottom nav accent colors — resolved per mode inside BottomNav. */
const navColors = (mode: 'light' | 'dark') => ({
  // Dark active uses primaryContainer (#229ED9) — full primary (#7FCBF2)
  // reads as glaring on the near-black bar.
  active: mode === 'dark' ? TG_DARK.primaryContainer : TG_LIGHT.primaryContainer,
  idle: mode === 'dark' ? TG_DARK.secondary : TG_LIGHT.secondary,
});

/** Fixed bar (translucent card fill + hairline top border), theme-aware. */
export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const TG = tgTheme(mode);
  const NAV = navColors(mode);
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.nav,
        {
          backgroundColor: mode === 'dark' ? 'rgba(16,16,20,0.92)' : 'rgba(255,255,255,0.94)',
          borderTopColor: TG.outline + '22',
          paddingBottom: insets.bottom + SPACE.sm,
        },
      ]}>
      {TABS.map(tab => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.7 }]}>
            <View
              style={[
                styles.navIcon,
                selected && { backgroundColor: TG.low },
              ]}>
              <TgIcon
                name={tab.icon}
                color={selected ? NAV.active : NAV.idle}
                size={20}
              />
            </View>
            <Text
              style={[
                styles.navLabel,
                { color: selected ? NAV.active : NAV.idle, fontFamily: selected ? FONT.semi : FONT.medium },
              ]}
              numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Icons — minimal 2px-stroke line set (no icon dependency)            */
/* ------------------------------------------------------------------ */

export type IconName = 'home' | 'chart' | 'gear' | 'life' | 'chevron' | 'cloud' | 'folder' | 'shield';

export function Icon({
  name,
  color,
  size = 16,
  direction = 'right',
}: {
  name: IconName;
  color: string;
  size?: number;
  direction?: 'left' | 'right';
}) {
  const s = size;
  const stroke = Math.max(1.5, s / 9);
  switch (name) {
    case 'home':
      return (
        <View
          style={{
            width: s,
            height: s,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: s * 0.28,
          }}
        />
      );
    case 'chart':
      return (
        <View style={{ width: s, height: s, flexDirection: 'row', alignItems: 'flex-end', gap: stroke }}>
          {[0.5, 1, 0.72].map((h, i) => (
            <View
              key={i}
              style={{
                width: stroke * 1.6,
                height: s * h,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      );
    case 'gear':
      return (
        <View
          style={{
            width: s,
            height: s,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: s / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{ width: s * 0.32, height: s * 0.32, borderRadius: s, backgroundColor: color }}
          />
        </View>
      );
    case 'life':
      return (
        <View
          style={{
            width: s,
            height: s,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: s / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              width: s,
              height: stroke,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );
    case 'cloud':
      return (
        <View
          style={{
            width: s,
            height: s * 0.72,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: s / 2,
          }}
        />
      );
    case 'folder':
      return (
        <View
          style={{
            width: s,
            height: s * 0.78,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: s * 0.22,
          }}
        />
      );
    case 'shield':
      return (
        <View
          style={{
            width: s * 0.82,
            height: s,
            borderWidth: stroke,
            borderColor: color,
            borderTopLeftRadius: s * 0.45,
            borderTopRightRadius: s * 0.45,
            borderBottomLeftRadius: s * 0.5,
            borderBottomRightRadius: s * 0.5,
          }}
        />
      );
    case 'chevron':
      return (
        <View
          style={{
            width: s * 0.5,
            height: s * 0.5,
            borderColor: color,
            borderTopWidth: stroke,
            borderRightWidth: stroke,
            borderRadius: stroke * 0.6,
            transform: [{ rotate: direction === 'right' ? '45deg' : '-135deg' }],
          }}
        />
      );
  }
}

/* ------------------------------------------------------------------ */
/* TeleVault icons — consistent-stroke View glyphs (no dependency)     */
/* ------------------------------------------------------------------ */

export type TgIconName =
  | 'bot'
  | 'verified'
  | 'cloud'
  | 'cloudSync'
  | 'cloudDone'
  | 'backup'
  | 'folder'
  | 'image'
  | 'database'
  | 'wifi'
  | 'archive'
  | 'addCircle'
  | 'chevron'
  | 'pause'
  | 'play'
  | 'clock'
  | 'box'
  | 'grid'
  | 'key'
  | 'tune'
  | 'history'
  | 'lock'
  | 'bolt'
  | 'person'
  | 'vpnKey'
  | 'eye'
  | 'eyeOff'
  | 'copy'
  | 'send'
  | 'shield'
  | 'cellTower'
  | 'linkOff'
  | 'check'
  | 'info'
  | 'error'
  | 'checkCircle'
  | 'schedule'
  | 'alarm'
  | 'batteryCharging'
  | 'callSplit'
  | 'deleteSweep'
  | 'notificationsOff'
  | 'warning'
  | 'cached'
  | 'cleaningServices'
  | 'sdCard'
  | 'folderZip'
  | 'search'
  | 'close'
  | 'more'
  | 'refresh'
  | 'download'
  | 'swapVert'
  | 'cloudUpload'
  | 'wifiOff'
  | 'hardDrive'
  | 'fileText'
  | 'photo';

export function TgIcon({
  name,
  color,
  size = 20,
  direction = 'right',
}: {
  name: TgIconName;
  color: string;
  size?: number;
  direction?: 'left' | 'right';
}) {
  const s = size;
  const stroke = Math.max(1.5, s / 9);
  const dot = (d: number, extra?: object) => ({
    width: d,
    height: d,
    borderRadius: d,
    backgroundColor: color,
    ...(extra ?? {}),
  });
  const bar = (w: number, h: number, extra?: object) => ({
    width: w,
    height: h,
    borderRadius: Math.min(stroke, Math.min(w, h) / 2),
    backgroundColor: color,
    ...(extra ?? {}),
  });
  const box = (extra?: object) => ({
    borderWidth: stroke,
    borderColor: color,
    borderRadius: s * 0.2,
    ...(extra ?? {}),
  });
  const center: ViewStyle = { alignItems: 'center', justifyContent: 'center' };

  switch (name) {
    case 'bot':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[bar(stroke, s * 0.16), { position: 'absolute', top: 0 }]} />
          <View style={[dot(s * 0.18), { position: 'absolute', top: s * 0.12 }]} />
          <View
            style={[
              box(),
              {
                marginTop: s * 0.2,
                width: s * 0.86,
                height: s * 0.66,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-evenly',
              },
            ]}>
            <View style={dot(stroke * 1.7)} />
            <View style={dot(stroke * 1.7)} />
          </View>
        </View>
      );
    case 'verified':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[dot(s), { position: 'absolute' }]} />
          <View
            style={{
              width: s * 0.42,
              height: s * 0.24,
              borderLeftWidth: stroke * 1.5,
              borderBottomWidth: stroke * 1.5,
              borderColor: '#FFFFFF',
              transform: [{ rotate: '-45deg' }],
              marginTop: -s * 0.06,
            }}
          />
        </View>
      );
    case 'cloud':
    case 'cloudSync':
    case 'cloudDone':
    case 'backup':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[box({ borderRadius: s * 0.26 }), { width: s, height: s * 0.5, marginTop: s * 0.34 }]} />
          <View
            style={[
              box({ borderRadius: s * 0.25 }),
              { position: 'absolute', top: s * 0.02, left: s * 0.16, width: s * 0.5, height: s * 0.5 },
            ]}
          />
          {name === 'cloudDone' ? (
            <View
              style={{
                position: 'absolute',
                bottom: s * 0.14,
                width: s * 0.34,
                height: s * 0.18,
                borderLeftWidth: stroke * 1.4,
                borderBottomWidth: stroke * 1.4,
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          ) : null}
          {name === 'backup' ? (
            <>
              <View style={[bar(stroke, s * 0.3), { position: 'absolute', bottom: s * 0.12 }]} />
              <View
                style={{
                  position: 'absolute',
                  bottom: s * 0.38,
                  width: s * 0.22,
                  height: s * 0.22,
                  borderTopWidth: stroke,
                  borderLeftWidth: stroke,
                  borderColor: color,
                  transform: [{ rotate: '45deg' }],
                }}
              />
            </>
          ) : null}
        </View>
      );
    case 'folder':
      return (
        <View style={{ width: s, height: s, justifyContent: 'flex-end' }}>
          <View style={[box({ borderRadius: s * 0.16 }), { width: s, height: s * 0.62 }]} />
          <View
            style={{
              position: 'absolute',
              top: s * 0.08,
              left: 0,
              width: s * 0.46,
              height: s * 0.26,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: s * 0.12,
              borderTopRightRadius: s * 0.12,
            }}
          />
        </View>
      );
    case 'image':
      return (
        <View style={[box({ borderRadius: s * 0.16, overflow: 'hidden' }), { width: s, height: s * 0.82 }]}>
          <View style={[dot(s * 0.18), { position: 'absolute', top: s * 0.12, left: s * 0.12 }]} />
          <View
            style={{
              position: 'absolute',
              bottom: -s * 0.16,
              left: -s * 0.02,
              width: s * 0.7,
              height: s * 0.7,
              backgroundColor: color,
              borderRadius: s * 0.12,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );
    case 'database':
      return (
        <View style={{ width: s, height: s, justifyContent: 'space-between' }}>
          {[0, 1, 2].map(index => (
            <View
              key={index}
              style={[box({ borderRadius: s * 0.16 }), { width: s, height: s * 0.28 }]}
            />
          ))}
        </View>
      );
    case 'wifi':
      return (
        <View style={[{ width: s, height: s }, center]}>
          {[0.94, 0.62, 0.3].map((factor, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                top: s * (0.12 + index * 0.16),
                width: s * factor,
                height: s * factor,
                borderTopWidth: stroke,
                borderLeftWidth: stroke,
                borderRightWidth: stroke,
                borderColor: color,
                borderTopLeftRadius: s,
                borderTopRightRadius: s,
              }}
            />
          ))}
          <View style={[dot(stroke * 1.9), { position: 'absolute', bottom: s * 0.06 }]} />
        </View>
      );
    case 'archive':
      return (
        <View style={{ width: s, height: s }}>
          <View style={[box({ borderRadius: s * 0.08 }), { width: s, height: s * 0.24 }]} />
          <View
            style={[
              box({ borderRadius: s * 0.08 }),
              { position: 'absolute', bottom: 0, width: s, height: s * 0.7, borderTopWidth: 0 },
            ]}
          />
          <View style={[bar(s * 0.36, stroke), { position: 'absolute', top: s * 0.46, left: s * 0.32 }]} />
        </View>
      );
    case 'addCircle':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s,
              height: s,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s / 2,
            }}
          />
          <View style={[bar(s * 0.5, stroke), { position: 'absolute' }]} />
          <View style={[bar(stroke, s * 0.5), { position: 'absolute' }]} />
        </View>
      );
    case 'chevron':
      return (
        <View
          style={{
            width: s * 0.5,
            height: s * 0.5,
            borderColor: color,
            borderTopWidth: stroke,
            borderRightWidth: stroke,
            borderRadius: stroke * 0.6,
            transform: [{ rotate: direction === 'right' ? '45deg' : '-135deg' }],
          }}
        />
      );
    case 'pause':
      return (
        <View style={{ width: s, height: s, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s * 0.2 }}>
          <View style={bar(s * 0.2, s * 0.72)} />
          <View style={bar(s * 0.2, s * 0.72)} />
        </View>
      );
    case 'play':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: s * 0.36,
            borderBottomWidth: s * 0.36,
            borderLeftWidth: s * 0.62,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: color,
          }}
        />
      );
    case 'clock':
    case 'history':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s,
              height: s,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s / 2,
            }}
          />
          <View style={[bar(stroke, s * 0.3), { position: 'absolute', top: s * 0.22 }]} />
          <View style={[bar(s * 0.26, stroke), { position: 'absolute', left: s * 0.5 }]} />
          {name === 'history' ? (
            <View
              style={{
                position: 'absolute',
                top: -s * 0.06,
                left: -s * 0.02,
                width: s * 0.24,
                height: s * 0.24,
                borderTopWidth: stroke,
                borderLeftWidth: stroke,
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          ) : null}
        </View>
      );
    case 'box':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[box({ borderRadius: s * 0.12 }), { position: 'absolute', width: s, height: s }]} />
          <View style={[bar(s * 0.5, stroke), { position: 'absolute', top: s * 0.28 }]} />
          <View style={[bar(stroke, s * 0.5), { position: 'absolute', left: s * 0.5 }]} />
        </View>
      );
    case 'grid':
      return (
        <View style={{ width: s, height: s, flexDirection: 'row', flexWrap: 'wrap', gap: s * 0.16 }}>
          {[0, 1, 2, 3].map(index => (
            <View
              key={index}
              style={[
                box({ borderRadius: s * 0.12 }),
                { width: s * 0.42, height: s * 0.42 },
              ]}
            />
          ))}
        </View>
      );
    case 'key':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              left: 0,
              width: s * 0.5,
              height: s * 0.5,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.25,
            }}
          />
          <View style={[bar(s * 0.5, stroke), { position: 'absolute', right: 0, top: s * 0.5 }]} />
          <View style={[bar(stroke, s * 0.22), { position: 'absolute', right: s * 0.22, top: s * 0.5 }]} />
        </View>
      );
    case 'tune':
      return (
        <View style={{ width: s, height: s, justifyContent: 'space-around', paddingVertical: s * 0.1 }}>
          {[0.3, 0.68, 0.46].map((pos, index) => (
            <View key={index} style={[bar(s, stroke), { justifyContent: 'center' }]}>
              <View style={[dot(stroke * 2.2), { position: 'absolute', left: s * pos }]} />
            </View>
          ))}
        </View>
      );
    case 'lock':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              width: s * 0.56,
              height: s * 0.5,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: s * 0.28,
              borderTopRightRadius: s * 0.28,
            }}
          />
          <View style={[box({ borderRadius: s * 0.16 }), { position: 'absolute', bottom: 0, width: s * 0.84, height: s * 0.6 }]} />
        </View>
      );
    case 'bolt':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              width: s * 0.3,
              height: s * 0.92,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ skewX: '-18deg' }],
            }}
          />
        </View>
      );
    case 'person':
      return (
        <View style={{ width: s, height: s, alignItems: 'center' }}>
          <View style={[dot(s * 0.44), { marginTop: s * 0.04 }]} />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              width: s * 0.9,
              height: s * 0.44,
              backgroundColor: color,
              borderTopLeftRadius: s * 0.45,
              borderTopRightRadius: s * 0.45,
            }}
          />
        </View>
      );
    case 'vpnKey':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={[
              box({ borderRadius: s * 0.22 }),
              { position: 'absolute', width: s, height: s },
            ]}
          />
          <View
            style={{
              position: 'absolute',
              left: s * 0.14,
              top: s * 0.28,
              width: s * 0.28,
              height: s * 0.28,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.14,
            }}
          />
          <View
            style={[
              bar(s * 0.5, stroke),
              { position: 'absolute', right: s * 0.1, top: s * 0.5 },
            ]}
          />
          <View
            style={[
              bar(stroke, s * 0.18),
              { position: 'absolute', right: s * 0.24, top: s * 0.5 },
            ]}
          />
        </View>
      );
    case 'eye':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s * 0.86,
              height: s * 0.86,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.43,
            }}
          />
          <View style={[dot(s * 0.34), {}]} />
        </View>
      );
    case 'eyeOff':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s * 0.86,
              height: s * 0.86,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.43,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 1.1,
              height: stroke,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );
    case 'copy':
      return (
        <View style={{ width: s, height: s }}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: s * 0.7,
              height: s * 0.7,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.14,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: s * 0.7,
              height: s * 0.7,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.14,
              backgroundColor: 'transparent',
            }}
          />
        </View>
      );
    case 'send':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: s * 0.42,
              borderBottomWidth: s * 0.42,
              borderLeftWidth: s * 0.7,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: color,
            }}
          />
        </View>
      );
    case 'shield':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              width: s * 0.78,
              height: s * 0.9,
              borderWidth: stroke,
              borderColor: color,
              borderTopLeftRadius: s * 0.4,
              borderTopRightRadius: s * 0.4,
              borderBottomLeftRadius: s * 0.5,
              borderBottomRightRadius: s * 0.5,
            }}
          />
        </View>
      );
    case 'cellTower':
      return (
        <View style={[{ width: s, height: s }, center]}>
          {[0.3, 0.55, 0.8].map((factor, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                bottom: s * 0.42,
                width: s * factor,
                height: s * 0.4,
                borderTopLeftRadius: s * 0.5,
                borderTopRightRadius: s * 0.5,
                borderLeftWidth: stroke,
                borderRightWidth: stroke,
                borderTopWidth: stroke,
                borderColor: color,
                backgroundColor: 'transparent',
              }}
            />
          ))}
          <View
            style={[
              bar(stroke * 2, s * 0.36),
              { position: 'absolute', bottom: 0 },
            ]}
          />
        </View>
      );
    case 'linkOff':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              left: s * 0.04,
              top: s * 0.32,
              width: s * 0.36,
              height: s * 0.36,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.18,
              transform: [{ rotate: '-30deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.04,
              top: s * 0.32,
              width: s * 0.36,
              height: s * 0.36,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.18,
              transform: [{ rotate: '-30deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 1.05,
              height: stroke,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );
    case 'check':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              width: s * 0.5,
              height: s * 0.26,
              borderLeftWidth: stroke * 1.5,
              borderBottomWidth: stroke * 1.5,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
              marginTop: -s * 0.06,
            }}
          />
        </View>
      );
    case 'info':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s,
              height: s,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s / 2,
            }}
          />
          <View
            style={[
              bar(stroke * 1.6, s * 0.32),
              { position: 'absolute', top: s * 0.42 },
            ]}
          />
          <View
            style={[dot(stroke * 1.6), { position: 'absolute', top: s * 0.28 }]}
          />
        </View>
      );
    case 'error':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s,
              height: s,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s / 2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.5,
              height: stroke * 1.4,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.5,
              height: stroke * 1.4,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );
    case 'checkCircle':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s,
              height: s,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s / 2,
            }}
          />
          <View
            style={{
              width: s * 0.36,
              height: s * 0.2,
              borderLeftWidth: stroke * 1.4,
              borderBottomWidth: stroke * 1.4,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
              marginTop: -s * 0.04,
            }}
          />
        </View>
      );
    case 'schedule':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[box({ borderRadius: s * 0.16 }), { position: 'absolute', width: s, height: s }]} />
          <View style={[bar(s, stroke), { position: 'absolute', top: s * 0.26 }]} />
          <View style={[bar(stroke * 1.4, s * 0.22), { position: 'absolute', top: 0, left: s * 0.24 }]} />
          <View style={[bar(stroke * 1.4, s * 0.22), { position: 'absolute', top: 0, right: s * 0.24 }]} />
        </View>
      );
    case 'alarm':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s * 0.82,
              height: s * 0.82,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s / 2,
            }}
          />
          <View style={[bar(stroke, s * 0.26), { position: 'absolute', top: s * 0.24 }]} />
          <View style={[bar(s * 0.22, stroke), { position: 'absolute', left: s * 0.5 }]} />
          <View
            style={[
              bar(s * 0.2, stroke),
              { position: 'absolute', top: s * 0.04, left: s * 0.06, transform: [{ rotate: '-45deg' }] },
            ]}
          />
          <View
            style={[
              bar(s * 0.2, stroke),
              { position: 'absolute', top: s * 0.04, right: s * 0.06, transform: [{ rotate: '45deg' }] },
            ]}
          />
        </View>
      );
    case 'batteryCharging':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[box({ borderRadius: s * 0.14 }), { width: s * 0.82, height: s * 0.5 }]} />
          <View style={[bar(stroke * 1.3, s * 0.18), { position: 'absolute', right: s * 0.06, top: s * 0.42 }]} />
          <View
            style={{
              position: 'absolute',
              width: s * 0.16,
              height: s * 0.38,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ skewX: '-16deg' }],
            }}
          />
        </View>
      );
    case 'callSplit':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[bar(stroke, s * 0.46), { position: 'absolute', top: 0 }]} />
          <View style={[bar(s * 0.44, stroke), { position: 'absolute', top: s * 0.44 }]} />
          <View
            style={[
              bar(stroke, s * 0.46),
              { position: 'absolute', bottom: 0, left: s * 0.16, transform: [{ rotate: '26deg' }] },
            ]}
          />
          <View
            style={[
              bar(stroke, s * 0.46),
              { position: 'absolute', bottom: 0, right: s * 0.16, transform: [{ rotate: '-26deg' }] },
            ]}
          />
        </View>
      );
    case 'deleteSweep':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[bar(s * 0.76, stroke), { position: 'absolute', top: s * 0.16 }]} />
          <View style={[bar(stroke, s * 0.18), { position: 'absolute', top: s * 0.06 }]} />
          <View
            style={[
              box({ borderRadius: s * 0.1 }),
              { position: 'absolute', top: s * 0.22, width: s * 0.58, height: s * 0.66, borderTopWidth: 0 },
            ]}
          />
        </View>
      );
    case 'notificationsOff':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              top: s * 0.12,
              width: s * 0.6,
              height: s * 0.48,
              borderWidth: stroke,
              borderColor: color,
              borderTopLeftRadius: s * 0.3,
              borderTopRightRadius: s * 0.3,
              borderBottomWidth: 0,
            }}
          />
          <View style={[bar(s * 0.72, stroke), { position: 'absolute', top: s * 0.6 }]} />
          <View style={[dot(stroke * 1.6), { position: 'absolute', bottom: s * 0.08 }]} />
          <View
            style={{
              position: 'absolute',
              width: s * 1.05,
              height: stroke,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );
    case 'warning':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.5,
              borderRightWidth: s * 0.5,
              borderBottomWidth: s * 0.86,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View style={[bar(stroke * 1.3, s * 0.3), { position: 'absolute', top: s * 0.42, backgroundColor: '#FFFFFF' }]} />
          <View style={[dot(stroke * 1.4), { position: 'absolute', bottom: s * 0.16, backgroundColor: '#FFFFFF' }]} />
        </View>
      );
    case 'cached':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s * 0.86,
              height: s * 0.86,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.43,
              borderRightColor: 'transparent',
              borderTopColor: 'transparent',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.02,
              right: s * 0.08,
              width: s * 0.26,
              height: s * 0.26,
              borderTopWidth: stroke,
              borderRightWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '18deg' }],
            }}
          />
        </View>
      );
    case 'cleaningServices':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={[
              bar(stroke * 1.4, s * 0.5),
              { position: 'absolute', top: s * 0.04, transform: [{ rotate: '20deg' }] },
            ]}
          />
          <View
            style={[
              box({ borderRadius: s * 0.14 }),
              { position: 'absolute', bottom: s * 0.06, width: s * 0.66, height: s * 0.34 },
            ]}
          />
        </View>
      );
    case 'sdCard':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              width: s * 0.72,
              height: s,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.16,
            }}>
            <View style={[bar(stroke * 1.2, s * 0.28), { position: 'absolute', top: 0, left: s * 0.12 }]} />
            <View style={[bar(stroke * 1.2, s * 0.28), { position: 'absolute', top: 0, left: s * 0.34 }]} />
            <View style={[bar(stroke * 1.2, s * 0.28), { position: 'absolute', top: 0, left: s * 0.56 }]} />
          </View>
        </View>
      );
    case 'folderZip':
      return (
        <View style={{ width: s, height: s, justifyContent: 'flex-end' }}>
          <View style={[box({ borderRadius: s * 0.16 }), { width: s, height: s * 0.62 }]} />
          <View
            style={{
              position: 'absolute',
              top: s * 0.08,
              left: 0,
              width: s * 0.46,
              height: s * 0.26,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: s * 0.12,
              borderTopRightRadius: s * 0.12,
            }}
          />
          <View style={[bar(stroke * 1.2, s * 0.4), { position: 'absolute', bottom: s * 0.1, left: s * 0.44 }]} />
        </View>
      );
    case 'search':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: s * 0.68,
              height: s * 0.68,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.34,
            }}
          />
          <View
            style={[
              bar(stroke, s * 0.36),
              { position: 'absolute', bottom: s * 0.1, right: s * 0.06, transform: [{ rotate: '-45deg' }] },
            ]}
          />
        </View>
      );
    case 'close':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[bar(s * 0.78, stroke), { position: 'absolute', transform: [{ rotate: '45deg' }] }]} />
          <View style={[bar(s * 0.78, stroke), { position: 'absolute', transform: [{ rotate: '-45deg' }] }]} />
        </View>
      );
    case 'more':
      return (
        <View style={[{ width: s, height: s }, center, { gap: stroke * 1.4 }]}>
          <View style={dot(stroke * 1.6)} />
          <View style={dot(stroke * 1.6)} />
          <View style={dot(stroke * 1.6)} />
        </View>
      );
    case 'refresh':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View
            style={{
              position: 'absolute',
              width: s * 0.86,
              height: s * 0.86,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: s * 0.43,
              borderRightColor: 'transparent',
              borderTopColor: 'transparent',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.02,
              right: s * 0.08,
              width: s * 0.26,
              height: s * 0.26,
              borderTopWidth: stroke,
              borderRightWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '18deg' }],
            }}
          />
        </View>
      );
    case 'download':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[bar(stroke, s * 0.42), { position: 'absolute', top: s * 0.04 }]} />
          <View
            style={{
              position: 'absolute',
              top: s * 0.42,
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.18,
              borderRightWidth: s * 0.18,
              borderTopWidth: s * 0.22,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
            }}
          />
          <View style={[bar(s * 0.72, stroke), { position: 'absolute', bottom: s * 0.08 }]} />
        </View>
      );
    case 'swapVert':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[bar(stroke, s * 0.5), { position: 'absolute', left: s * 0.24, top: s * 0.16 }]} />
          <View
            style={{
              position: 'absolute',
              left: s * 0.12,
              top: s * 0.06,
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.12,
              borderRightWidth: s * 0.12,
              borderBottomWidth: s * 0.16,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View style={[bar(stroke, s * 0.5), { position: 'absolute', right: s * 0.24, bottom: s * 0.16 }]} />
          <View
            style={{
              position: 'absolute',
              right: s * 0.12,
              bottom: s * 0.06,
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.12,
              borderRightWidth: s * 0.12,
              borderTopWidth: s * 0.16,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
            }}
          />
        </View>
      );
    case 'cloudUpload':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[box({ borderRadius: s * 0.26 }), { width: s, height: s * 0.5, marginTop: s * 0.34 }]} />
          <View
            style={[
              box({ borderRadius: s * 0.25 }),
              { position: 'absolute', top: s * 0.02, left: s * 0.16, width: s * 0.5, height: s * 0.5 },
            ]}
          />
          <View style={[bar(stroke, s * 0.22), { position: 'absolute', bottom: s * 0.34 }]} />
          <View
            style={{
              position: 'absolute',
              bottom: s * 0.56,
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.13,
              borderRightWidth: s * 0.13,
              borderBottomWidth: s * 0.16,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
        </View>
      );
    case 'wifiOff':
      return (
        <View style={[{ width: s, height: s }, center]}>
          {[0.94, 0.62, 0.3].map((factor, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                top: s * (0.12 + index * 0.16),
                width: s * factor,
                height: s * factor,
                borderTopWidth: stroke,
                borderLeftWidth: stroke,
                borderRightWidth: stroke,
                borderColor: color,
                borderTopLeftRadius: s,
                borderTopRightRadius: s,
              }}
            />
          ))}
          <View style={[dot(stroke * 1.9), { position: 'absolute', bottom: s * 0.06 }]} />
          <View
            style={{
              position: 'absolute',
              width: s * 1.05,
              height: stroke,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );
    case 'hardDrive':
      return (
        <View style={[{ width: s, height: s }, center]}>
          <View style={[box({ borderRadius: s * 0.16 }), { width: s, height: s * 0.7 }]} />
          <View style={[dot(stroke * 1.4), { position: 'absolute', right: s * 0.16, top: s * 0.34 }]} />
          <View style={[bar(s * 0.4, stroke * 0.9), { position: 'absolute', left: s * 0.16, top: s * 0.34 }]} />
        </View>
      );
    case 'fileText':
      return (
        <View style={{ width: s, height: s }}>
          <View style={[box({ borderRadius: s * 0.12 }), { width: s * 0.76, height: s }]} />
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: s * 0.3,
              height: s * 0.3,
              borderLeftWidth: stroke,
              borderBottomWidth: stroke,
              borderColor: color,
            }}
          />
          <View style={[bar(s * 0.44, stroke * 0.9), { position: 'absolute', left: s * 0.12, top: s * 0.44 }]} />
          <View style={[bar(s * 0.44, stroke * 0.9), { position: 'absolute', left: s * 0.12, top: s * 0.62 }]} />
        </View>
      );
    case 'photo':
      return (
        <View style={[box({ borderRadius: s * 0.16, overflow: 'hidden' }), { width: s, height: s * 0.82 }]}>
          <View style={[dot(s * 0.18), { position: 'absolute', top: s * 0.12, left: s * 0.12 }]} />
          <View
            style={{
              position: 'absolute',
              bottom: -s * 0.16,
              left: -s * 0.02,
              width: s * 0.7,
              height: s * 0.7,
              backgroundColor: color,
              borderRadius: s * 0.12,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Circular progress ring (segmented View dial, no SVG dependency)     */
/* ------------------------------------------------------------------ */

export function ProgressRing({
  size,
  stroke,
  progress,
  color,
  trackColor,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  const segments = 60;
  const filled = Math.round(pct * segments);
  const radius = size / 2 - stroke / 2;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: segments }, (_, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            width: stroke,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: index < filled ? color : trackColor,
            transform: [{ rotate: `${(index / segments) * 360}deg` }, { translateY: -radius }],
          }}
        />
      ))}
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: SPACE.base },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: SPACE.base },

  header: { gap: SPACE.md, paddingTop: SPACE.sm, paddingBottom: SPACE.xs },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  headerText: { flex: 1, gap: SPACE.xs, minWidth: 0 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  display: TYPE.display as TextStyle,
  subtitle: { ...(TYPE.footnote as TextStyle), lineHeight: 18 },

  card: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.base,
    gap: SPACE.md,
  },
  cardTitle: {
    ...(TYPE.caption as TextStyle),
    textTransform: 'uppercase',
  },
  cardBody: { gap: 0 },
  hint: { ...(TYPE.footnote as TextStyle), lineHeight: 19, paddingHorizontal: SPACE.xs },

  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.xs,
  },
  sectionLabelText: {
    color: TG_LIGHT.secondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600', fontFamily: FONT.semi,
    letterSpacing: 0.6,
    flexShrink: 1,
  },

  sliderHit: {
    height: SLIDER_THUMB,
    justifyContent: 'center',
    marginVertical: SPACE.xs,
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: RADIUS.md,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: RADIUS.md,
  },
  sliderThumb: {
    position: 'absolute',
    width: SLIDER_THUMB,
    height: SLIDER_THUMB,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: SPACE.md,
    gap: SPACE.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flexShrink: 1, flexGrow: 1, gap: 2, minWidth: 0 },
  rowLabel: { ...(TYPE.body as TextStyle) },
  rowSubtitle: { ...(TYPE.footnote as TextStyle), lineHeight: 18 },
  rowRight: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACE.sm,
    maxWidth: '58%',
  },
  rowValue: { ...(TYPE.label as TextStyle), textAlign: 'right', flexShrink: 1, lineHeight: 20 },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    minHeight: 52,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.md,
  },
  buttonLabel: { ...(TYPE.headline as TextStyle) },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },

  segmented: {
    flexDirection: 'row',
    padding: SPACE.xs,
    borderRadius: RADIUS.md,
    gap: SPACE.xs,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.sm,
  },
  segmentActive: { borderRadius: RADIUS.md },
  segmentLabel: { ...(TYPE.label as TextStyle), fontSize: 14 },

  numberField: {
    minWidth: 72,
    textAlign: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    fontSize: 16,
    fontWeight: '600', fontFamily: FONT.semi,
  },
  textField: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.base,
    paddingVertical: SPACE.md,
    fontSize: 16,
  },

  track: { height: 8, borderRadius: RADIUS.md, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.md },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACE.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 7 },
  badgeLabel: { ...(TYPE.caption as TextStyle), fontSize: 13 },

  grid: { flexDirection: 'row', gap: SPACE.md },
  tile: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.base,
    gap: SPACE.xs,
  },
  tileValue: { ...(TYPE.title as TextStyle) },
  tileLabel: { ...(TYPE.footnote as TextStyle), lineHeight: 18 },

  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: SPACE.sm,
    paddingHorizontal: SPACE.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    paddingVertical: SPACE.xs,
  },
  navIcon: { paddingHorizontal: 18, paddingVertical: 3, borderRadius: RADIUS.md },
  navIconActive: { backgroundColor: TG_LIGHT.low },
  navLabel: { fontSize: 11 },

  appHeader: {
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TG_LIGHT.highest,
  },
  appHeaderInner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appHeaderBack: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appHeaderText: { flex: 1, minWidth: 0 },
  appHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appHeaderWordmark: { color: TG_LIGHT.ink, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, fontFamily: FONT.bold },
  appHeaderE2eePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.md,
    backgroundColor: TG_LIGHT.primaryFixed,
  },
  appHeaderE2eeText: {
    color: TG_LIGHT.onPrimaryContainer,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600', fontFamily: FONT.semi,
  },
  appHeaderSubtitle: { color: TG_LIGHT.secondary, fontSize: 13, lineHeight: 18 },

  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: TG_LIGHT.card,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    maxWidth: 400,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TG_LIGHT.highest,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { flex: 1, minWidth: 0, gap: 2 },
  toastTitle: { color: TG_LIGHT.ink, fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: FONT.semi },
  toastMsg: { color: TG_LIGHT.secondary, fontSize: 13, lineHeight: 18 },
});

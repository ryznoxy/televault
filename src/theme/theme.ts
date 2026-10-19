export type ThemeMode = 'light' | 'dark';

/**
 * Plus Jakarta Sans — brand typeface. Android resolves by file name
 * (android/app/src/main/assets/fonts); iOS needs the same TTFs bundled in
 * Xcode + UIAppFonts (not wired yet).
 */
export const FONT = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semi: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  xbold: 'PlusJakartaSans-ExtraBold',
} as const;

/**
 * Design tokens — Liquid Glass, premium light-first.
 * Every component reads colors from here; never hardcode hex in screens.
 */
export type Theme = {
  mode: ThemeMode;
  bg: string;          // screen background (warm off-white)
  surface: string;     // card / sheet fill
  surfaceAlt: string;  // inset wells, tracks, chips
  glass: string;       // translucent floating nav fill
  glassBorder: string; // 1px highlight on glass edges
  ink: string;         // primary text
  muted: string;       // secondary text
  faint: string;       // tertiary text / placeholders
  border: string;      // hairline dividers
  accent: string;      // primary action (violet)
  accentSoft: string;  // accent tint background
  onAccent: string;    // text on accent
  success: string;
  successSoft: string;
  warn: string;
  danger: string;
  shadow: string;      // shadowColor
};

export const themes: Record<ThemeMode, Theme> = {
  light: {
    mode: 'light',
    bg: '#F4F4F7',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEFF4',
    glass: 'rgba(26,26,32,0.82)',
    glassBorder: 'rgba(255,255,255,0.16)',
    ink: '#111114',
    muted: '#6B6B76',
    faint: '#9A9AA4',
    border: 'rgba(17,17,20,0.08)',
    accent: '#5B5BF0',
    accentSoft: 'rgba(91,91,240,0.10)',
    onAccent: '#FFFFFF',
    success: '#22A06B',
    successSoft: 'rgba(34,160,107,0.12)',
    warn: '#C77F16',
    danger: '#D8383D',
    shadow: '#0B0B0F',
  },
  dark: {
    mode: 'dark',
    bg: '#0B0B0F',
    surface: '#16161B',
    surfaceAlt: '#1F1F26',
    glass: 'rgba(16,16,20,0.86)',
    glassBorder: 'rgba(255,255,255,0.12)',
    ink: '#F5F5F7',
    muted: '#9A9AA4',
    faint: '#6B6B76',
    border: 'rgba(255,255,255,0.10)',
    accent: '#7C7CFF',
    accentSoft: 'rgba(124,124,255,0.16)',
    onAccent: '#FFFFFF',
    success: '#34C77B',
    successSoft: 'rgba(52,199,123,0.16)',
    warn: '#E0A62B',
    danger: '#FF6369',
    shadow: '#000000',
  },
};

/**
 * TeleVault / Telegram-blue light palette. Used by the Home screen and the
 * bottom nav only; the rest of the app keeps reading `themes`.
 */
export const TG = {
  bg: '#F8F9FF',
  card: '#FFFFFF',
  low: '#EFF4FF',
  container: '#E5EEFF',
  high: '#DCE9FF',
  highest: '#D3E4FE',
  primary: '#00658E',
  primaryContainer: '#229ED9',
  onPrimaryContainer: '#003147',
  ink: '#0B1C30',
  variant: '#3E484F',
  secondary: '#565E74',
  outline: '#6F7880',
  secondaryContainer: '#DAE2FD',
  primaryFixed: '#C7E7FF',
  error: '#BA1A1A',
  errorSoft: 'rgba(186,26,26,0.10)',
} as const;

/** 8-point spacing grid. */
export const SPACE = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32 } as const;

/** Corner radii — soft-rounded system, no pills. */
export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 22 } as const;

/** Type scale (size, weight, tracking) — Plus Jakarta Sans throughout. */
export const TYPE = {
  display: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, fontFamily: FONT.bold },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, fontFamily: FONT.semi },
  headline: { fontSize: 17, fontWeight: '600', fontFamily: FONT.semi },
  body: { fontSize: 16, fontWeight: '400', fontFamily: FONT.regular },
  label: { fontSize: 15, fontWeight: '500', fontFamily: FONT.medium },
  footnote: { fontSize: 13, fontWeight: '400', fontFamily: FONT.regular },
  caption: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, fontFamily: FONT.semi },
} as const;

/** Soft elevation used by every raised surface. */
export const ELEVATION = {
  card: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  float: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

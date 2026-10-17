import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { mmkv } from '../state/mmkv';
import { themes, type Theme, type ThemeMode } from './theme';

const THEME_KEY = 'theme_mode';

type ThemeContextValue = {
  mode: ThemeMode;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readStoredMode = (): ThemeMode => (mmkv.getString(THEME_KEY) === 'dark' ? 'dark' : 'light');

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  const setMode = useCallback((next: ThemeMode) => {
    mmkv.set(THEME_KEY, next);
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      mmkv.set(THEME_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, theme: themes[mode], setMode, toggle }),
    [mode, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

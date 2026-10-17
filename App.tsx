/**
 * Telebot Backup - React Native
 *
 * @format
 */

import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNav from './src/navigation/AppNav';
import { configureScheduler } from './src/background/scheduler';
import { PROCESS_START } from './src/backup/backupRunner';
import { sessionsRepo } from './src/db/repositories/sessions';
import { useSettingsStore } from './src/state/settingsStore';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />;
}

function App() {
  const scheduleMode = useSettingsStore(state => state.config.scheduleMode);
  const intervalHours = useSettingsStore(state => state.config.intervalHours);
  const scheduledTimeHour = useSettingsStore(state => state.config.scheduledTimeHour);
  const automationPaused = useSettingsStore(state => state.config.automationPaused);

  useEffect(() => {
    configureScheduler().catch(() => undefined);
  }, [scheduleMode, intervalHours, scheduledTimeHour, automationPaused]);

  // A session still marked `running` that started before this process booted
  // was left by a process that died; clear it so History does not show a run
  // that will never finish. `PROCESS_START` (the same instant `runBackup` uses)
  // keeps a genuinely running headless/scheduled backup untouched.
  useEffect(() => {
    sessionsRepo.failStaleRunning(PROCESS_START).catch(() => undefined);
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ThemedStatusBar />
        <AppNav />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;

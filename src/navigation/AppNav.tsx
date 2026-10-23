import React, { useEffect } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { BottomNav, UpdateAlert, type TabKey } from '../components/ui';
import { WhatsNewModal } from '../components/WhatsNewModal';
import { BackgroundTour } from '../components/BackgroundTour';
import { useUpdateStore } from '../state/updateStore';
import { refreshStatusNotification } from '../background/androidStatus';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList, Routes } from './Routes';
import { useSettingsStore } from '../state/settingsStore';
import SetupScreen from '../screens/SetupScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatsScreen from '../screens/StatsScreen';
import TroubleshootScreen from '../screens/TroubleshootScreen';
import RestoreScreen from '../screens/RestoreScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ROUTES: Record<TabKey, keyof RootStackParamList> = {
  home: Routes.Home,
  setup: Routes.Setup,
  settings: Routes.Settings,
  stats: Routes.Stats,
};

function TabShell({
  tab,
  navigation,
  children,
}: {
  tab: TabKey;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.shell}>
      {children}
      <BottomNav
        active={tab}
        onChange={next => {
          if (next !== tab) {
            navigation.navigate(TAB_ROUTES[next] as never);
          }
        }}
      />
    </View>
  );
}

export default function AppNav() {
  const { theme } = useTheme();
  const setupDone = useSettingsStore(state => state.setupDone);
  const check = useUpdateStore(state => state.check);
  // One lightweight release check per cold start and whenever the app comes back
  // to the foreground: the alert floats above every screen, so a release
  // published while the app was open is still noticed without a restart.
  useEffect(() => {
    check();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        check();
        // A notification posted by an older build keeps its old icon until it
        // is replaced, so re-post on every return to the foreground.
        refreshStatusNotification();
      }
    });
    return () => subscription.remove();
  }, [check]);
  // Post the ongoing status notification once the app is up (it is gone after
  // a reboot until either the app or the headless task first runs), and keep
  // it honest when the user pauses automation or changes the schedule.
  useEffect(() => {
    refreshStatusNotification();
    return useSettingsStore.subscribe(() => refreshStatusNotification());
  }, [setupDone]);
  return (
    <View style={styles.root}>
      <WhatsNewModal />
      <BackgroundTour />
      <NavigationContainer>
      <Stack.Navigator
        initialRouteName={setupDone ? Routes.Home : Routes.Setup}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.bg },
        }}>
        <Stack.Screen name={Routes.Home}>
          {props => (
            <TabShell tab="home" navigation={props.navigation}>
              <HomeScreen {...props} />
            </TabShell>
          )}
        </Stack.Screen>
        <Stack.Screen name={Routes.Stats}>
          {props => (
            <TabShell tab="stats" navigation={props.navigation}>
              <StatsScreen {...props} />
            </TabShell>
          )}
        </Stack.Screen>
        <Stack.Screen name={Routes.Settings}>
          {props => (
            <TabShell tab="settings" navigation={props.navigation}>
              <SettingsScreen {...props} />
            </TabShell>
          )}
        </Stack.Screen>
        <Stack.Screen name={Routes.Setup}>
          {props => (
            <TabShell tab="setup" navigation={props.navigation}>
              <SetupScreen {...props} />
            </TabShell>
          )}
        </Stack.Screen>
        <Stack.Screen name={Routes.Troubleshoot} component={TroubleshootScreen} />
        <Stack.Screen name={Routes.Restore} component={RestoreScreen} />
      </Stack.Navigator>
      </NavigationContainer>
      {/* Last child on purpose: it floats above the navigator, and therefore
          above every screen, not just the four tabs. */}
      <UpdateAlert />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shell: { flex: 1 },
});

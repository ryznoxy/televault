export const Routes = {
  Setup: 'Setup',
  Home: 'Home',
  Settings: 'Settings',
  Stats: 'Stats',
  Troubleshoot: 'Troubleshoot',
  Restore: 'Restore',
} as const;

export type RouteName = (typeof Routes)[keyof typeof Routes];

export type RootStackParamList = {
  Setup: undefined;
  Home: undefined;
  Settings: undefined;
  Stats: undefined;
  Troubleshoot: undefined;
  Restore: undefined;
};

/**
 * @format
 */

import { AppRegistry } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import App from './App';
import { name as appName } from './app.json';
import { headlessTask } from './src/background/headless';
import { scheduledRunTask } from './src/background/scheduledRun';

BackgroundFetch.registerHeadlessTask(headlessTask);
// Task key must match ScheduledRunService.TASK_KEY in
// android/app/src/main/java/com/telebotbackuprn/ScheduledRunService.kt.
AppRegistry.registerHeadlessTask('TelevaultScheduledRun', () => scheduledRunTask);

AppRegistry.registerComponent(appName, () => App);

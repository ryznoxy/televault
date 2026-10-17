/**
 * @format
 */

import { AppRegistry } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import App from './App';
import { name as appName } from './app.json';
import { headlessTask } from './src/background/headless';

BackgroundFetch.registerHeadlessTask(headlessTask);

AppRegistry.registerComponent(appName, () => App);

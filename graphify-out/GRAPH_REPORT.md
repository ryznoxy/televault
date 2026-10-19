# Graph Report - fix-saf-custom-folder  (2026-10-19)

## Corpus Check
- 88 files · ~55,213 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 7, .xml 7, .properties 2)

## Summary
- 645 nodes · 1478 edges · 31 communities (20 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13c25d04`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SettingsScreen.tsx
- restoreRunner.ts
- Theme, UI Kit & App Entry
- Background Scheduling & Settings State
- File Scanning & SQLite Persistence
- backupRunner.ts
- Telegram Upload API
- HomeScreen.tsx
- Package Manifest References
- Runtime Dependencies
- iOS App Delegate
- Dev Dependencies
- Android Launcher Icons
- Project README
- SafFolderModule.kt
- Android MainActivity
- NPM Scripts
- Metro Bundler Config
- TypeScript Config
- Node Engine Constraint
- Checklist rilis
- react
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `runBackup()` - 38 edges
2. `TgIcon()` - 29 edges
3. `SettingsScreen()` - 27 edges
4. `HomeScreen()` - 24 edges
5. `TelegramBotApi` - 19 edges
6. `useTheme()` - 19 edges
7. `useSettingsStore` - 18 edges
8. `react-native` - 16 edges
9. `react-native-blob-util` - 16 edges
10. `SetupScreen()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `ThemedStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `App()` --calls--> `ThemeProvider()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `db()` --calls--> `getDb()`  [EXTRACTED]
  __tests__/filesRepo.test.ts → src/db/db.ts
- `Android Default Launcher Icon (Square, HDPI)` --semantically_similar_to--> `Android Default Launcher Icon (Square, MDPI)`  [INFERRED] [semantically similar]
  android/app/src/main/res/mipmap-hdpi/ic_launcher.png → android/app/src/main/res/mipmap-mdpi/ic_launcher.png
- `Android Default Launcher Icon (Square, HDPI)` --semantically_similar_to--> `Android Default Launcher Icon (Square, XHDPI)`  [INFERRED] [semantically similar]
  android/app/src/main/res/mipmap-hdpi/ic_launcher.png → android/app/src/main/res/mipmap-xhdpi/ic_launcher.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (31 total, 11 thin omitted)

### Community 0 - "SettingsScreen.tsx"
Cohesion: 0.05
Nodes (44): mockBlobFiles, { webcrypto }, react-native-keychain, react-native-safe-area-context, stopScheduler(), requestNotificationPermission(), isActiveTempDir(), TgSwitch() (+36 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.08
Nodes (60): @noble/hashes, react-native-blob-util, react-native-zip-archive, CryptoLike, decryptFile(), decryptFileWithKey(), deriveKey(), EncryptedFile (+52 more)

### Community 2 - "Theme, UI Kit & App Entry"
Cohesion: 0.09
Nodes (36): parseClampedInt(), Badge(), BottomNav(), Button(), Card(), Hint(), Icon(), IconName (+28 more)

### Community 3 - "Background Scheduling & Settings State"
Cohesion: 0.11
Nodes (29): App(), displayName, name, ThemedStatusBar(), react-native-background-fetch, react-native-get-random-values, headlessTask(), configureScheduler() (+21 more)

### Community 4 - "File Scanning & SQLite Persistence"
Cohesion: 0.06
Nodes (43): @op-engineering/op-sqlite, react-native, @react-native-camera-roll/camera-roll, DOC_EXTENSIONS, hasDocExtension(), isFileUri(), scanCameraRoll(), scanCategory() (+35 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.07
Nodes (50): react-native-background-actions, IDLE_RESULT, OPTIONS, BackupProgress, BackupResult, baseName(), deleteLocalOriginals(), DEVICE (+42 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.10
Nodes (23): react-native-blob-util, DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep() (+15 more)

### Community 7 - "HomeScreen.tsx"
Cohesion: 0.06
Nodes (70): @react-navigation/native, @react-navigation/native-stack, BACKUP_IN_FLIGHT_ERROR, runBackupInForeground(), AppHeader(), ProgressRing(), PulsingDot(), SectionLabel() (+62 more)

### Community 8 - "Package Manifest References"
Cohesion: 0.07
Nodes (28): @react-native/typescript-config, name, private, version, @babel/core, @babel/preset-env, @babel/runtime, eslint (+20 more)

### Community 9 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, @noble/ciphers, @noble/hashes, @op-engineering/op-sqlite, react, react-native, react-native-background-actions, react-native-background-fetch (+14 more)

### Community 10 - "iOS App Delegate"
Cohesion: 0.12
Nodes (6): AppDelegate, ReactNativeDelegate, React, React_RCTAppDelegate, ReactAppDependencyProvider, UIKit

### Community 11 - "Dev Dependencies"
Cohesion: 0.11
Nodes (19): devDependencies, @babel/core, @babel/preset-env, @babel/runtime, eslint, jest, prettier, @react-native/babel-preset (+11 more)

### Community 12 - "Android Launcher Icons"
Cohesion: 0.27
Nodes (11): Android Default Launcher Icon (Square, HDPI), Android Default Launcher Icon (Round, HDPI), Android Default Launcher Icon (Square, MDPI), Android Default Launcher Icon (Round, MDPI), Android Default Launcher Icon (Square, XHDPI), Android Default Launcher Icon (Round, XHDPI), Android Default Launcher Icon (Square, XXHDPI), Android Default Launcher Icon (Round, XXHDPI) (+3 more)

### Community 13 - "Project README"
Cohesion: 0.22
Nodes (10): Android platform build/run (npm run android), App.tsx (root application component), CocoaPods (iOS native dependency manager), Integration guide (React Native into existing apps), iOS platform build/run (npm run ios, pod install), Metro (JavaScript build tool for React Native), @react-native-community/cli, React Native Project (bootstrapped with @react-native-community/cli) (+2 more)

### Community 14 - "SafFolderModule.kt"
Cohesion: 0.09
Nodes (4): MainApplication, Entry, SafFolderModule, SafFolderPackage

### Community 16 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, lint, start, test, typecheck

### Community 17 - "Metro Bundler Config"
Cohesion: 0.40
Nodes (3): config, { getDefaultConfig, mergeConfig }, @react-native/metro-config

### Community 18 - "TypeScript Config"
Cohesion: 0.40
Nodes (4): exclude, extends, include, @react-native/typescript-config

### Community 28 - "Checklist rilis"
Cohesion: 0.25
Nodes (7): 1. Kode, 2. Build Android, 3. Uji di device (wajib, tidak bisa didelegasikan), 4. Play Console, 5. iOS (belum untuk rilis ini), 6. Setelah rilis, Checklist rilis

### Community 40 - "react"
Cohesion: 0.50
Nodes (3): react-test-renderer, react, react-test-renderer

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 240 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native-blob-util` connect `restoreRunner.ts` to `SettingsScreen.tsx`, `File Scanning & SQLite Persistence`, `backupRunner.ts`, `Telegram Upload API`, `HomeScreen.tsx`, `Package Manifest References`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runBackup()` (e.g. with `.sendDocument()` and `.sendMessage()`) actually correct?**
  _`runBackup()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettingsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05450733752620545 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `File Scanning & SQLite Persistence` to `SettingsScreen.tsx`, `restoreRunner.ts`, `Theme, UI Kit & App Entry`, `Background Scheduling & Settings State`, `backupRunner.ts`, `HomeScreen.tsx`, `Package Manifest References`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `restoreRunner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.075990675990676 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest References`, `Telegram Upload API`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
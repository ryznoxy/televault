# Graph Report - rn  (2026-10-16)

## Corpus Check
- Corpus is ~49,575 words - fits in a single context window. You may not need a graph.

## Summary
- 586 nodes · 1349 edges · 28 communities (17 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Screens, Navigation & Secure Store
- Crypto, Manifest & Restore
- Theme, UI Kit & App Entry
- Background Scheduling & Settings State
- File Scanning & SQLite Persistence
- Backup Pipeline & Chunking
- Telegram Upload API
- Session History & Stats
- Package Manifest References
- Runtime Dependencies
- iOS App Delegate
- Dev Dependencies
- Android Launcher Icons
- Project README
- Android MainApplication
- Android MainActivity
- NPM Scripts
- Metro Bundler Config
- TypeScript Config
- Node Engine Constraint

## God Nodes (most connected - your core abstractions)
1. `runBackup()` - 32 edges
2. `TgIcon()` - 29 edges
3. `SettingsScreen()` - 27 edges
4. `HomeScreen()` - 24 edges
5. `TelegramBotApi` - 19 edges
6. `useTheme()` - 19 edges
7. `useSettingsStore` - 18 edges
8. `react-native-blob-util` - 16 edges
9. `SetupScreen()` - 16 edges
10. `StatsScreen()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `configureScheduler()`  [EXTRACTED]
  App.tsx → src/background/scheduler.ts
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  App.tsx → src/state/settingsStore.ts
- `blobTransport()` --references--> `react-native-blob-util`  [EXTRACTED]
  src/net/telegramApi.ts → package.json
- `Android Default Launcher Icon (Square, HDPI)` --semantically_similar_to--> `Android Default Launcher Icon (Square, MDPI)`  [INFERRED] [semantically similar]
  android/app/src/main/res/mipmap-hdpi/ic_launcher.png → android/app/src/main/res/mipmap-mdpi/ic_launcher.png
- `Android Default Launcher Icon (Square, HDPI)` --semantically_similar_to--> `Android Default Launcher Icon (Square, XHDPI)`  [INFERRED] [semantically similar]
  android/app/src/main/res/mipmap-hdpi/ic_launcher.png → android/app/src/main/res/mipmap-xhdpi/ic_launcher.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (28 total, 11 thin omitted)

### Community 0 - "Screens, Navigation & Secure Store"
Cohesion: 0.05
Nodes (59): mockBlobFiles, { webcrypto }, react-native-keychain, react-native-safe-area-context, stopScheduler(), AppHeader(), SectionLabel(), TgIcon() (+51 more)

### Community 1 - "Crypto, Manifest & Restore"
Cohesion: 0.07
Nodes (62): @noble/hashes, react-native-blob-util, @react-native-documents/picker, @react-navigation/native-stack, CryptoLike, decryptFile(), deriveKey(), EncryptedFile (+54 more)

### Community 2 - "Theme, UI Kit & App Entry"
Cohesion: 0.06
Nodes (51): App(), displayName, name, ThemedStatusBar(), react-test-renderer, react, react-native, react-native-get-random-values (+43 more)

### Community 3 - "Background Scheduling & Settings State"
Cohesion: 0.09
Nodes (41): react-native-background-fetch, runBackupInForeground(), headlessTask(), configureScheduler(), runScheduledBackup(), shouldRunNow(), AndroidPermission, PermissionState (+33 more)

### Community 4 - "File Scanning & SQLite Persistence"
Cohesion: 0.06
Nodes (36): @op-engineering/op-sqlite, @react-native-camera-roll/camera-roll, DOC_EXTENSIONS, ensureLocalPath(), hasDocExtension(), isFileUri(), scanCameraRoll(), scanCategory() (+28 more)

### Community 5 - "Backup Pipeline & Chunking"
Cohesion: 0.08
Nodes (35): react-native-background-actions, react-native-zip-archive, BACKUP_IN_FLIGHT_ERROR, IDLE_RESULT, OPTIONS, BackupProgress, BackupResult, deleteLocalOriginals() (+27 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.10
Nodes (22): DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep(), asTransportError() (+14 more)

### Community 7 - "Session History & Stats"
Cohesion: 0.12
Nodes (30): PulsingDot(), getDb(), NewSession, SessionRecord, sessionsRepo, ActiveRunCard(), CARD_SHADOW, categoryLabel() (+22 more)

### Community 8 - "Package Manifest References"
Cohesion: 0.07
Nodes (27): @react-native/typescript-config, name, private, version, @babel/core, @babel/preset-env, @babel/runtime, eslint (+19 more)

### Community 9 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (23): dependencies, @noble/ciphers, @noble/hashes, @op-engineering/op-sqlite, react, react-native, react-native-background-actions, react-native-background-fetch (+15 more)

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

### Community 16 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, lint, start, test, typecheck

### Community 17 - "Metro Bundler Config"
Cohesion: 0.40
Nodes (3): config, { getDefaultConfig, mergeConfig }, @react-native/metro-config

### Community 18 - "TypeScript Config"
Cohesion: 0.40
Nodes (4): exclude, extends, include, @react-native/typescript-config

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 224 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native-blob-util` connect `Crypto, Manifest & Restore` to `Screens, Navigation & Secure Store`, `File Scanning & SQLite Persistence`, `Backup Pipeline & Chunking`, `Telegram Upload API`, `Session History & Stats`, `Package Manifest References`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runBackup()` (e.g. with `.sendDocument()` and `.sendMessage()`) actually correct?**
  _`runBackup()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Screens, Navigation & Secure Store` be split into smaller, more focused modules?**
  _Cohesion score 0.05030181086519115 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Theme, UI Kit & App Entry` to `Screens, Navigation & Secure Store`, `Crypto, Manifest & Restore`, `Background Scheduling & Settings State`, `File Scanning & SQLite Persistence`, `Backup Pipeline & Chunking`, `Session History & Stats`, `Package Manifest References`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `Crypto, Manifest & Restore` be split into smaller, more focused modules?**
  _Cohesion score 0.06559356136820925 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest References`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
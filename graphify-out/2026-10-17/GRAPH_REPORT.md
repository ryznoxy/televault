# Graph Report - rn  (2026-10-17)

## Corpus Check
- 83 files · ~54,561 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: (none) 6, .xml 4, .properties 2)

## Summary
- 608 nodes · 1426 edges · 31 communities (19 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `448a3baa`
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
- Android MainApplication
- Android MainActivity
- NPM Scripts
- Metro Bundler Config
- TypeScript Config
- Node Engine Constraint
- SetupScreen.tsx
- react
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `runBackup()` - 38 edges
2. `TgIcon()` - 29 edges
3. `SettingsScreen()` - 28 edges
4. `HomeScreen()` - 25 edges
5. `TelegramBotApi` - 19 edges
6. `useTheme()` - 19 edges
7. `useSettingsStore` - 18 edges
8. `react-native-blob-util` - 16 edges
9. `SetupScreen()` - 16 edges
10. `StatsScreen()` - 15 edges

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

## Communities (31 total, 12 thin omitted)

### Community 0 - "SettingsScreen.tsx"
Cohesion: 0.11
Nodes (28): @noble/hashes, isCryptoAvailable(), newSaltB64(), isActiveTempDir(), SectionLabel(), TgSwitch(), CARD_SHADOW, CATEGORY_HINTS (+20 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.07
Nodes (58): @noble/ciphers, CryptoLike, decryptFile(), decryptFileWithKey(), deriveKey(), EncryptedFile, encryptFile(), encryptFileWithKey() (+50 more)

### Community 2 - "Theme, UI Kit & App Entry"
Cohesion: 0.09
Nodes (34): parseClampedInt(), Badge(), Button(), Card(), Hint(), Icon(), IconName, NumberField() (+26 more)

### Community 3 - "Background Scheduling & Settings State"
Cohesion: 0.11
Nodes (32): App(), displayName, name, ThemedStatusBar(), react-native, react-native-background-fetch, runBackupInForeground(), headlessTask() (+24 more)

### Community 4 - "File Scanning & SQLite Persistence"
Cohesion: 0.07
Nodes (29): @op-engineering/op-sqlite, AndroidPermission, needsMediaPermissions(), PermissionState, requestBackupPermissions(), getDb(), chunksRepo, NewChunk (+21 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.06
Nodes (58): react-native-background-actions, react-native-blob-util, BACKUP_IN_FLIGHT_ERROR, IDLE_RESULT, OPTIONS, BackupProgress, BackupResult, baseName() (+50 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.12
Nodes (21): react-native-blob-util, DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep() (+13 more)

### Community 7 - "HomeScreen.tsx"
Cohesion: 0.05
Nodes (73): mockBlobFiles, { webcrypto }, react-native-safe-area-context, @react-navigation/native, @react-navigation/native-stack, isFileUri(), requestNotificationPermission(), AppHeader() (+65 more)

### Community 8 - "Package Manifest References"
Cohesion: 0.06
Nodes (30): @react-native/typescript-config, name, private, version, @babel/core, @babel/preset-env, @babel/runtime, eslint (+22 more)

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

### Community 16 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, lint, start, test, typecheck

### Community 17 - "Metro Bundler Config"
Cohesion: 0.40
Nodes (3): config, { getDefaultConfig, mergeConfig }, @react-native/metro-config

### Community 18 - "TypeScript Config"
Cohesion: 0.40
Nodes (4): exclude, extends, include, @react-native/typescript-config

### Community 31 - "SetupScreen.tsx"
Cohesion: 0.10
Nodes (17): react-native-keychain, stopScheduler(), TelegramBotApi, CARD_SHADOW, HIT_SLOP, Props, SaveStatus, SendStatus (+9 more)

### Community 40 - "react"
Cohesion: 0.50
Nodes (3): react-test-renderer, react, react-test-renderer

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 227 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native-blob-util` connect `backupRunner.ts` to `SettingsScreen.tsx`, `restoreRunner.ts`, `File Scanning & SQLite Persistence`, `Telegram Upload API`, `HomeScreen.tsx`, `Package Manifest References`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runBackup()` (e.g. with `.sendDocument()` and `.sendMessage()`) actually correct?**
  _`runBackup()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettingsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11182795698924732 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Background Scheduling & Settings State` to `SettingsScreen.tsx`, `restoreRunner.ts`, `Theme, UI Kit & App Entry`, `File Scanning & SQLite Persistence`, `backupRunner.ts`, `HomeScreen.tsx`, `Package Manifest References`, `SetupScreen.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `restoreRunner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07355769230769231 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest References`, `Telegram Upload API`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
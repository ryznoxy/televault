<<<<<<< HEAD
# Graph Report - fix-restore-kdf-floor  (2026-10-18)

## Corpus Check
- 84 files · ~54,771 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 7, .xml 7, .properties 2)
=======
# Graph Report - rn  (2026-10-18)

## Corpus Check
- 84 files · ~55,066 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 7, (none) 6, .ttf 5)
>>>>>>> 3952859 (chore(graph): refresh after the typography and radius changes)

## Summary
- 618 nodes · 1451 edges · 37 communities (26 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
<<<<<<< HEAD
- Built from commit: `1f107b0b`
=======
- Built from commit: `6a2012ed`
>>>>>>> 3952859 (chore(graph): refresh after the typography and radius changes)
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- StatsScreen.tsx
- restoreRunner.ts
- Theme, UI Kit & App Entry
- Background Scheduling & Settings State
- File Scanning & SQLite Persistence
- backupRunner.ts
- Telegram Upload API
- SettingsScreen.tsx
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
- HomeScreen.tsx
- Checklist rilis
- SetupScreen.tsx
- TroubleshootScreen.tsx
- AppNav.tsx
- react-native
- secureStore.ts
- react-native-safe-area-context
- App.tsx
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `runBackup()` - 38 edges
2. `TgIcon()` - 29 edges
3. `SettingsScreen()` - 28 edges
4. `HomeScreen()` - 25 edges
5. `useTheme()` - 20 edges
6. `TelegramBotApi` - 19 edges
7. `useSettingsStore` - 18 edges
8. `react-native-blob-util` - 16 edges
9. `SetupScreen()` - 16 edges
10. `StatsScreen()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ThemedStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `App()` --calls--> `configureScheduler()`  [EXTRACTED]
  App.tsx → src/background/scheduler.ts
- `App()` --calls--> `AppNav()`  [EXTRACTED]
  App.tsx → src/navigation/AppNav.tsx
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  App.tsx → src/state/settingsStore.ts
- `App()` --calls--> `ThemeProvider()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (37 total, 11 thin omitted)

### Community 0 - "StatsScreen.tsx"
Cohesion: 0.14
Nodes (26): TgIconName, SessionRecord, ActiveRunCard(), CARD_SHADOW, categoryLabel(), FILTER_DEFS, FLOAT_SHADOW, HIT_SLOP (+18 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.07
Nodes (63): @noble/hashes, react-native-blob-util, CryptoLike, decryptFile(), decryptFileWithKey(), deriveKey(), EncryptedFile, encryptFile() (+55 more)

### Community 2 - "Theme, UI Kit & App Entry"
Cohesion: 0.09
Nodes (36): parseClampedInt(), Badge(), BottomNav(), Button(), Card(), Hint(), Icon(), IconName (+28 more)

### Community 3 - "Background Scheduling & Settings State"
Cohesion: 0.13
Nodes (25): react-native-mmkv, zustand, runBackupInForeground(), configureScheduler(), runScheduledBackup(), shouldRunNow(), AndroidPermission, PermissionState (+17 more)

### Community 4 - "File Scanning & SQLite Persistence"
Cohesion: 0.08
Nodes (28): @op-engineering/op-sqlite, needsMediaPermissions(), requestBackupPermissions(), getDb(), chunksRepo, NewChunk, FileRecord, filesRepo (+20 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.06
Nodes (59): react-native-background-actions, @react-native-camera-roll/camera-roll, react-native-zip-archive, BACKUP_IN_FLIGHT_ERROR, IDLE_RESULT, OPTIONS, BackupProgress, BackupResult (+51 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.10
Nodes (23): react-native-blob-util, DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep() (+15 more)

### Community 7 - "SettingsScreen.tsx"
Cohesion: 0.15
Nodes (21): isActiveTempDir(), TgSwitch(), CARD_SHADOW, CATEGORY_HINTS, CATEGORY_ICONS, DisabledToggleRow(), formatBytes(), FREQ_OPTIONS (+13 more)

### Community 8 - "Package Manifest References"
Cohesion: 0.07
Nodes (28): engines, node, @react-native/typescript-config, name, private, version, @babel/core, @babel/preset-env (+20 more)

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

### Community 20 - "HomeScreen.tsx"
Cohesion: 0.18
Nodes (20): isFileUri(), requestNotificationPermission(), ProgressRing(), PulsingDot(), barVerb(), CARD_SHADOW, folderIcon(), FolderRow() (+12 more)

### Community 28 - "Checklist rilis"
Cohesion: 0.25
Nodes (7): 1. Kode, 2. Build Android, 3. Uji di device (wajib, tidak bisa didelegasikan), 4. Play Console, 5. iOS (belum untuk rilis ini), 6. Setelah rilis, Checklist rilis

### Community 29 - "SetupScreen.tsx"
Cohesion: 0.14
Nodes (13): stopScheduler(), CARD_SHADOW, HIT_SLOP, Props, SaveStatus, SendStatus, styles, TestStatus (+5 more)

### Community 30 - "TroubleshootScreen.tsx"
Cohesion: 0.23
Nodes (15): AppHeader(), SectionLabel(), TgIcon(), Toast(), useToast(), StatsScreen(), CARD_SHADOW, Diagnostics (+7 more)

### Community 31 - "AppNav.tsx"
Cohesion: 0.19
Nodes (11): @react-navigation/native, @react-navigation/native-stack, TabKey, AppNav(), Stack, styles, TAB_ROUTES, TabShell() (+3 more)

### Community 32 - "react-native"
Cohesion: 0.36
Nodes (5): displayName, name, react-native, react-native-background-fetch, headlessTask()

### Community 33 - "secureStore.ts"
Cohesion: 0.29
Nodes (4): react-native-keychain, Credentials, EMPTY, secureStore

### Community 34 - "react-native-safe-area-context"
Cohesion: 0.40
Nodes (3): mockBlobFiles, { webcrypto }, react-native-safe-area-context

### Community 40 - "App.tsx"
Cohesion: 0.31
Nodes (7): App(), ThemedStatusBar(), react-test-renderer, react, react-native-get-random-values, react-test-renderer, PROCESS_START

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 234 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native-blob-util` connect `restoreRunner.ts` to `StatsScreen.tsx`, `File Scanning & SQLite Persistence`, `backupRunner.ts`, `Telegram Upload API`, `SettingsScreen.tsx`, `Package Manifest References`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runBackup()` (e.g. with `.sendDocument()` and `.sendMessage()`) actually correct?**
  _`runBackup()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `StatsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `react-native` to `StatsScreen.tsx`, `restoreRunner.ts`, `Theme, UI Kit & App Entry`, `Background Scheduling & Settings State`, `File Scanning & SQLite Persistence`, `backupRunner.ts`, `SettingsScreen.tsx`, `App.tsx`, `Package Manifest References`, `HomeScreen.tsx`, `SetupScreen.tsx`, `TroubleshootScreen.tsx`, `AppNav.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `restoreRunner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07082494969818913 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest References`, `Telegram Upload API`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
# Graph Report - rn  (2026-10-17)

## Corpus Check
- 82 files · ~50,925 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: (none) 5, .xml 4, .properties 2)

## Summary
- 597 nodes · 1388 edges · 42 communities (30 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- SettingsScreen.tsx
- restoreRunner.ts
- Theme, UI Kit & App Entry
- Background Scheduling & Settings State
- File Scanning & SQLite Persistence
- backupRunner.ts
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
- restoreRunner.test.ts
- RestoreScreen.tsx
- HomeScreen.tsx
- SetupScreen.tsx
- TroubleshootScreen.tsx
- crypto.ts
- AppNav.tsx
- fileScanner.ts
- secureStore.ts
- foregroundService.test.ts
- chunker.ts
- incremental.ts
- react
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `runBackup()` - 36 edges
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
- `ThemedStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `App()` --calls--> `ThemeProvider()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `Android Default Launcher Icon (Square, HDPI)` --semantically_similar_to--> `Android Default Launcher Icon (Square, MDPI)`  [INFERRED] [semantically similar]
  android/app/src/main/res/mipmap-hdpi/ic_launcher.png → android/app/src/main/res/mipmap-mdpi/ic_launcher.png
- `Android Default Launcher Icon (Square, HDPI)` --semantically_similar_to--> `Android Default Launcher Icon (Square, XHDPI)`  [INFERRED] [semantically similar]
  android/app/src/main/res/mipmap-hdpi/ic_launcher.png → android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
- `Android Default Launcher Icon (Square, HDPI)` --semantically_similar_to--> `Android Default Launcher Icon (Square, XXHDPI)`  [INFERRED] [semantically similar]
  android/app/src/main/res/mipmap-hdpi/ic_launcher.png → android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (42 total, 12 thin omitted)

### Community 0 - "SettingsScreen.tsx"
Cohesion: 0.15
Nodes (21): isActiveTempDir(), TgSwitch(), CARD_SHADOW, CATEGORY_HINTS, CATEGORY_ICONS, DisabledToggleRow(), formatBytes(), FREQ_OPTIONS (+13 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.16
Nodes (26): react-native-zip-archive, assertSafeName(), baseName(), findManifestPath(), findManifestPaths(), isManifestName(), isSafeName(), joinChunks() (+18 more)

### Community 2 - "Theme, UI Kit & App Entry"
Cohesion: 0.09
Nodes (33): parseClampedInt(), Badge(), Button(), Card(), Hint(), Icon(), IconName, NumberField() (+25 more)

### Community 3 - "Background Scheduling & Settings State"
Cohesion: 0.10
Nodes (34): App(), displayName, name, ThemedStatusBar(), react-native-background-actions, react-native-background-fetch, react-native-get-random-values, BACKUP_IN_FLIGHT_ERROR (+26 more)

### Community 4 - "File Scanning & SQLite Persistence"
Cohesion: 0.09
Nodes (22): react-native, AndroidPermission, needsMediaPermissions(), PermissionState, requestBackupPermissions(), chunksRepo, NewChunk, FileRecord (+14 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.19
Nodes (17): baseName(), deleteLocalOriginals(), DEVICE, freeSpaceBytes(), mimeFor(), runBackup(), sleep(), cleanupChunks() (+9 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.10
Nodes (23): react-native-blob-util, DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep() (+15 more)

### Community 7 - "Session History & Stats"
Cohesion: 0.10
Nodes (34): @op-engineering/op-sqlite, PulsingDot(), getDb(), NewSession, SessionRecord, sessionsRepo, CREATE_TABLES, MIGRATIONS (+26 more)

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

### Community 16 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, lint, start, test, typecheck

### Community 17 - "Metro Bundler Config"
Cohesion: 0.40
Nodes (3): config, { getDefaultConfig, mergeConfig }, @react-native/metro-config

### Community 18 - "TypeScript Config"
Cohesion: 0.40
Nodes (4): exclude, extends, include, @react-native/typescript-config

### Community 28 - "restoreRunner.test.ts"
Cohesion: 0.18
Nodes (16): batQuote(), createManifest(), DECRYPT_NOTE(), Manifest, ManifestEncryption, ManifestFile, manifestToJson(), reassemblyCommand() (+8 more)

### Community 29 - "RestoreScreen.tsx"
Cohesion: 0.13
Nodes (16): mockBlobFiles, { webcrypto }, @react-native-documents/picker, react-native-safe-area-context, RestoreFileResult, RestorePhase, RestoreResult, baseName() (+8 more)

### Community 30 - "HomeScreen.tsx"
Cohesion: 0.18
Nodes (18): isFileUri(), ProgressRing(), barVerb(), CARD_SHADOW, folderIcon(), FolderRow(), formatBytes(), formatCount() (+10 more)

### Community 31 - "SetupScreen.tsx"
Cohesion: 0.14
Nodes (13): stopScheduler(), CARD_SHADOW, HIT_SLOP, Props, SaveStatus, SendStatus, styles, TestStatus (+5 more)

### Community 32 - "TroubleshootScreen.tsx"
Cohesion: 0.22
Nodes (15): AppHeader(), SectionLabel(), TgIcon(), TgIconName, Toast(), useToast(), CARD_SHADOW, Diagnostics (+7 more)

### Community 33 - "crypto.ts"
Cohesion: 0.30
Nodes (13): @noble/hashes, CryptoLike, decryptFile(), deriveKey(), EncryptedFile, encryptFile(), fromBase64(), globalCrypto() (+5 more)

### Community 34 - "AppNav.tsx"
Cohesion: 0.18
Nodes (12): @react-navigation/native, @react-navigation/native-stack, BottomNav(), TabKey, TABS, Stack, styles, TAB_ROUTES (+4 more)

### Community 35 - "fileScanner.ts"
Cohesion: 0.27
Nodes (11): react-native-blob-util, DOC_EXTENSIONS, hasDocExtension(), scanCameraRoll(), scanCategory(), scanCustomFolder(), scanCustomFolders(), scanDocuments() (+3 more)

### Community 36 - "secureStore.ts"
Cohesion: 0.29
Nodes (4): react-native-keychain, Credentials, EMPTY, secureStore

### Community 37 - "foregroundService.test.ts"
Cohesion: 0.25
Nodes (7): BackupProgress, isRunningMock, mockControl, runBackupMock, startMock, stopMock, updateNotificationMock

### Community 38 - "chunker.ts"
Cohesion: 0.52
Nodes (5): chunkFile, chunkName(), ChunkRange, computeChunkRanges(), MAX_CHUNK_SIZE

### Community 39 - "incremental.ts"
Cohesion: 0.50
Nodes (3): CandidateFile, needsBackup(), TrackedFile

### Community 40 - "react"
Cohesion: 0.50
Nodes (3): react-test-renderer, react, react-test-renderer

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 226 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native-blob-util` connect `fileScanner.ts` to `SettingsScreen.tsx`, `crypto.ts`, `restoreRunner.ts`, `File Scanning & SQLite Persistence`, `backupRunner.ts`, `chunker.ts`, `Telegram Upload API`, `Package Manifest References`, `Session History & Stats`, `restoreRunner.test.ts`, `RestoreScreen.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runBackup()` (e.g. with `.sendDocument()` and `.sendMessage()`) actually correct?**
  _`runBackup()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Theme, UI Kit & App Entry` be split into smaller, more focused modules?**
  _Cohesion score 0.09390243902439024 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `File Scanning & SQLite Persistence` to `SettingsScreen.tsx`, `TroubleshootScreen.tsx`, `Theme, UI Kit & App Entry`, `Background Scheduling & Settings State`, `AppNav.tsx`, `backupRunner.ts`, `Session History & Stats`, `Package Manifest References`, `RestoreScreen.tsx`, `HomeScreen.tsx`, `SetupScreen.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `Background Scheduling & Settings State` be split into smaller, more focused modules?**
  _Cohesion score 0.09663120567375887 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest References`, `Telegram Upload API`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
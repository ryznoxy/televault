# Graph Report - rn  (2026-10-22)

## Corpus Check
- 124 files · ~109,233 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 8, (none) 6, .ttf 5)

## Summary
- 858 nodes · 2271 edges · 47 communities (28 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dccd74d8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SettingsScreen.tsx
- restoreRunner.ts
- SetupScreen.tsx
- foregroundService.ts
- backupRunner.test.ts
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
- engines
- VaultStatusModule
- Checklist rilis
- updateStore.ts
- crypto.ts
- db.ts
- fileScanner.ts
- ExactAlarm
- restoreRunner.test.ts
- restoreDrill.ts
- .build
- react-native-blob-util
- secureStore.ts
- AlarmReceiver.kt
- AGENTS.md
- BootReceiver.kt
- ScheduledRunService.kt
- incremental.ts
- safFolder.ts
- DESIGN.md

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 55 edges
2. `runBackup()` - 42 edges
3. `tgTheme()` - 40 edges
4. `TgIcon()` - 33 edges
5. `SettingsScreen()` - 32 edges
6. `HomeScreen()` - 30 edges
7. `TelegramBotApi` - 27 edges
8. `react-native` - 21 edges
9. `react-native-blob-util` - 20 edges
10. `SetupScreen()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `ThemedStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `App()` --calls--> `configureScheduler()`  [EXTRACTED]
  App.tsx → src/background/scheduler.ts
- `App()` --calls--> `AppNav()`  [EXTRACTED]
  App.tsx → src/navigation/AppNav.tsx
- `App()` --calls--> `logError()`  [EXTRACTED]
  App.tsx → src/state/errorLog.ts
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  App.tsx → src/state/settingsStore.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (47 total, 19 thin omitted)

### Community 0 - "SettingsScreen.tsx"
Cohesion: 0.06
Nodes (67): react-native, @react-native-documents/picker, @react-navigation/native-stack, VaultStatusNative, relativeTime(), statusBody(), statusVisible(), AndroidPermission (+59 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.11
Nodes (37): sha256File(), Manifest, assertSafeName(), assertSafeNameReturn(), baseName(), findManifestPath(), findManifestPaths(), isManifestName() (+29 more)

### Community 2 - "SetupScreen.tsx"
Cohesion: 0.05
Nodes (50): App(), ThemedStatusBar(), mockBlobFiles, { webcrypto }, react-test-renderer, react, react-native-get-random-values, react-native-safe-area-context (+42 more)

### Community 3 - "foregroundService.ts"
Cohesion: 0.08
Nodes (49): displayName, name, react-native-background-actions, react-native-background-fetch, hideStatusNotification(), nativeStatus(), refreshStatusNotification(), syncExactAlarm() (+41 more)

### Community 4 - "backupRunner.test.ts"
Cohesion: 0.12
Nodes (15): ScanResult, needsMediaPermissions(), requestBackupPermissions(), ApiInstance, apiMock, chunksMock, filesMock, fsMock (+7 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.12
Nodes (32): baseName(), deleteLocalOriginals(), DEVICE, freeSpaceBytes(), mimeFor(), runBackup(), sleep(), summarizeErrors() (+24 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.09
Nodes (27): react-native-blob-util, DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep() (+19 more)

### Community 7 - "HomeScreen.tsx"
Cohesion: 0.06
Nodes (85): WakeSource, AppHeader(), Badge(), BottomNav(), Button(), Card(), Hint(), Icon() (+77 more)

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
Cohesion: 0.07
Nodes (6): MainApplication, RunStop, RunStopReceiver, Entry, SafFolderModule, SafFolderPackage

### Community 16 - "NPM Scripts"
Cohesion: 0.22
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

### Community 29 - "updateStore.ts"
Cohesion: 0.15
Nodes (24): mmkv, mmkvStorage, dismissUpdateTag(), isUpdateDismissed(), pendingFromStorage(), UPDATE_DISMISS_KEY, UpdatePhase, UpdateUiState (+16 more)

### Community 30 - "crypto.ts"
Cohesion: 0.19
Nodes (20): @noble/hashes, CryptoLike, decryptFile(), decryptFileWithKey(), deriveKey(), EncryptedFile, encryptFile(), encryptFileWithKey() (+12 more)

### Community 31 - "db.ts"
Cohesion: 0.20
Nodes (10): @op-engineering/op-sqlite, getDb(), FileRecord, filesRepo, NewFile, CREATE_TABLES, MIGRATIONS, SCHEMA_VERSION (+2 more)

### Community 32 - "fileScanner.ts"
Cohesion: 0.24
Nodes (13): @react-native-camera-roll/camera-roll, DOC_EXTENSIONS, ensureLocalPath(), hasDocExtension(), isFileUri(), scanCameraRoll(), scanCategory(), scanCustomFolder() (+5 more)

### Community 35 - "restoreRunner.test.ts"
Cohesion: 0.24
Nodes (7): joinChunks(), chunksRepo, NewChunk, StoredPart, fs, latin1(), shaOf()

### Community 36 - "restoreDrill.ts"
Cohesion: 0.44
Nodes (7): DrillResult, runRestoreDrill(), smallestDownloadable(), restoreFromTelegram(), active, trackTempDir(), untrackTempDir()

### Community 38 - "react-native-blob-util"
Cohesion: 0.50
Nodes (6): react-native-blob-util, clearRunStop(), flagPath(), requestRunStop(), runStopRequested(), fs

### Community 39 - "secureStore.ts"
Cohesion: 0.29
Nodes (4): react-native-keychain, Credentials, EMPTY, secureStore

### Community 44 - "incremental.ts"
Cohesion: 0.50
Nodes (3): CandidateFile, needsBackup(), TrackedFile

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 267 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `NPM Scripts` to `Package Manifest References`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettingsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05966724039013196 - nodes in this community are weakly interconnected._
- **Why does `VaultStatusModule` connect `VaultStatusModule` to `NPM Scripts`, `SafFolderModule.kt`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Should `restoreRunner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11025641025641025 - nodes in this community are weakly interconnected._
- **Should `SetupScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05314685314685315 - nodes in this community are weakly interconnected._
- **Should `foregroundService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08243727598566308 - nodes in this community are weakly interconnected._
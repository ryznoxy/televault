# Graph Report - rn  (2026-10-29)

## Corpus Check
- 127 files · ~120,200 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 7, (none) 6, .ttf 5)

## Summary
- 893 nodes · 2413 edges · 49 communities (32 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f4992c3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SettingsScreen.tsx
- restoreRunner.ts
- StatusNotification.kt
- foregroundService.ts
- backupRunner.test.ts
- backupRunner.ts
- Telegram Upload API
- StatsScreen.tsx
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
- BackgroundTour.tsx
- Checklist rilis
- updateStore.ts
- ui.tsx
- db.ts
- fileScanner.ts
- SetupScreen.tsx
- ExactAlarm
- HomeScreen.tsx
- manifest.ts
- zustand
- react-native-blob-util
- chunker.ts
- AlarmReceiver.kt
- AGENTS.md
- BootReceiver.kt
- ScheduledRunService.kt
- incremental.ts
- ThemeProvider.tsx
- DESIGN.md
- TroubleshootScreen.tsx
- VaultStatusModule.kt

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 56 edges
2. `runBackup()` - 43 edges
3. `tgTheme()` - 41 edges
4. `SettingsScreen()` - 35 edges
5. `TgIcon()` - 33 edges
6. `TelegramBotApi` - 30 edges
7. `HomeScreen()` - 30 edges
8. `RestoreScreen()` - 27 edges
9. `useSettingsStore` - 24 edges
10. `react-native` - 21 edges

## Surprising Connections (you probably didn't know these)
- `ThemedStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `App()` --calls--> `configureScheduler()`  [EXTRACTED]
  App.tsx → src/background/scheduler.ts
- `App()` --calls--> `logError()`  [EXTRACTED]
  App.tsx → src/state/errorLog.ts
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  App.tsx → src/state/settingsStore.ts
- `db()` --calls--> `getDb()`  [EXTRACTED]
  __tests__/filesRepo.test.ts → src/db/db.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (49 total, 17 thin omitted)

### Community 0 - "SettingsScreen.tsx"
Cohesion: 0.09
Nodes (42): @noble/hashes, hasAllFilesAccess(), openAllFilesSettings(), CryptoLike, decryptFile(), decryptFileWithKey(), deriveKey(), EncryptedFile (+34 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.06
Nodes (71): react-native-blob-util, react-native-keychain, partNameFor(), Manifest, CompleteGroup, DrillResult, runRestoreDrill(), smallestCompleteGroup() (+63 more)

### Community 3 - "foregroundService.ts"
Cohesion: 0.06
Nodes (73): displayName, name, react-native-background-actions, react-native-background-fetch, hideStatusNotification(), isCharging(), nativeStatus(), refreshStatusNotification() (+65 more)

### Community 4 - "backupRunner.test.ts"
Cohesion: 0.10
Nodes (19): ScanResult, AndroidPermission, needsMediaPermissions(), PermissionState, requestBackupPermissions(), Category, ApiInstance, apiMock (+11 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.18
Nodes (15): isUnmeteredNetwork(), baseName(), deleteLocalOriginals(), DEVICE, freeSpaceBytes(), mimeFor(), runBackup(), sleep() (+7 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.09
Nodes (27): react-native-blob-util, DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep() (+19 more)

### Community 7 - "StatsScreen.tsx"
Cohesion: 0.13
Nodes (35): AppHeader(), PulsingDot(), TgIcon(), TgSwitch(), Toast(), NewSession, SessionRecord, IconToggleRow() (+27 more)

### Community 8 - "Package Manifest References"
Cohesion: 0.07
Nodes (29): @react-native/typescript-config, name, private, version, @babel/core, @babel/preset-env, @babel/runtime, eslint (+21 more)

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
Nodes (9): getConstants(), versionCodeOf(), scripts, android, ios, lint, start, test (+1 more)

### Community 17 - "Metro Bundler Config"
Cohesion: 0.40
Nodes (3): config, { getDefaultConfig, mergeConfig }, @react-native/metro-config

### Community 18 - "TypeScript Config"
Cohesion: 0.40
Nodes (4): exclude, extends, include, @react-native/typescript-config

### Community 23 - "BackgroundTour.tsx"
Cohesion: 0.17
Nodes (17): guideFor(), OEM_GUIDE, OemGuide, BackgroundTour(), createStyles(), createStyles(), WhatsNewModal(), useTourStore (+9 more)

### Community 28 - "Checklist rilis"
Cohesion: 0.25
Nodes (7): 1. Kode, 2. Build Android, 3. Uji di device (wajib, tidak bisa didelegasikan), 4. Play Console, 5. iOS (belum untuk rilis ini), 6. Setelah rilis, Checklist rilis

### Community 29 - "updateStore.ts"
Cohesion: 0.14
Nodes (25): mmkv, mmkvStorage, dismissUpdateTag(), isUpdateDismissed(), pendingFromStorage(), UPDATE_DISMISS_KEY, UpdatePhase, UpdateUiState (+17 more)

### Community 30 - "ui.tsx"
Cohesion: 0.12
Nodes (27): parseClampedInt(), Badge(), BottomNav(), Button(), Card(), Hint(), Icon(), IconName (+19 more)

### Community 31 - "db.ts"
Cohesion: 0.20
Nodes (10): @op-engineering/op-sqlite, getDb(), FileRecord, filesRepo, NewFile, CREATE_TABLES, MIGRATIONS, SCHEMA_VERSION (+2 more)

### Community 32 - "fileScanner.ts"
Cohesion: 0.20
Nodes (16): react-native, DOC_EXTENSIONS, ensureLocalPath(), hasDocExtension(), isFileUri(), scanCameraRoll(), scanCategory(), scanCustomFolder() (+8 more)

### Community 33 - "SetupScreen.tsx"
Cohesion: 0.10
Nodes (17): mockBlobFiles, { webcrypto }, react-native-safe-area-context, stopScheduler(), CARD_SHADOW, createStyles(), HIT_SLOP, Props (+9 more)

### Community 35 - "HomeScreen.tsx"
Cohesion: 0.19
Nodes (20): requestNotificationPermission(), ProgressRing(), TgIconName, Toggle(), CARD_SHADOW, createStyles(), folderIcon(), FolderRow() (+12 more)

### Community 36 - "manifest.ts"
Cohesion: 0.21
Nodes (15): batQuote(), createManifest(), DECRYPT_NOTE(), MANIFEST_VERSION, ManifestEncryption, ManifestFile, manifestFileName(), ManifestPart (+7 more)

### Community 38 - "react-native-blob-util"
Cohesion: 0.57
Nodes (5): clearRunStop(), flagPath(), requestRunStop(), runStopRequested(), fs

### Community 39 - "chunker.ts"
Cohesion: 0.43
Nodes (6): chunkFile, chunkName(), ChunkRange, cleanupChunks(), computeChunkRanges(), MAX_CHUNK_SIZE

### Community 44 - "incremental.ts"
Cohesion: 0.50
Nodes (3): CandidateFile, needsBackup(), TrackedFile

### Community 45 - "ThemeProvider.tsx"
Cohesion: 0.15
Nodes (17): App(), ThemedStatusBar(), react-test-renderer, react, react-native-get-random-values, react-test-renderer, PROCESS_START, AppNav() (+9 more)

### Community 49 - "TroubleshootScreen.tsx"
Cohesion: 0.14
Nodes (21): @react-navigation/native, @react-navigation/native-stack, formatBytes(), SectionLabel(), TabKey, useToast(), Stack, styles (+13 more)

### Community 50 - "VaultStatusModule.kt"
Cohesion: 0.16
Nodes (9): cancelExactAlarm(), hasAllFilesAccess(), hideRunProgress(), hideStatus(), isCharging(), openAllFilesSettings(), scheduleExactAlarm(), showRunProgress() (+1 more)

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 286 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `NPM Scripts` to `Package Manifest References`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettingsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09178743961352658 - nodes in this community are weakly interconnected._
- **Why does `versionCodeOf()` connect `NPM Scripts` to `VaultStatusModule.kt`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Should `restoreRunner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06110154905335628 - nodes in this community are weakly interconnected._
- **Should `foregroundService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056831683168316834 - nodes in this community are weakly interconnected._
- **Should `backupRunner.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10276679841897234 - nodes in this community are weakly interconnected._
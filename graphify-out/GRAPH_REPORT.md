# Graph Report - rn  (2026-10-24)

## Corpus Check
- 126 files · ~114,739 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 7, (none) 6, .ttf 5)

## Summary
- 875 nodes · 2342 edges · 50 communities (33 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `87afa236`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SettingsScreen.tsx
- restoreRunner.ts
- .build
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
- TroubleshootScreen.tsx
- Checklist rilis
- updateStore.ts
- ui.tsx
- db.ts
- fileScanner.ts
- SetupScreen.tsx
- ExactAlarm
- HomeScreen.tsx
- manifest.ts
- react-native-blob-util
- chunker.ts
- AlarmReceiver.kt
- AGENTS.md
- BootReceiver.kt
- ScheduledRunService.kt
- incremental.ts
- updateAlert.test.tsx
- DESIGN.md
- AppNav.tsx
- VaultStatusModule.kt
- react-native-safe-area-context

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 56 edges
2. `runBackup()` - 43 edges
3. `tgTheme()` - 41 edges
4. `SettingsScreen()` - 35 edges
5. `TgIcon()` - 33 edges
6. `HomeScreen()` - 30 edges
7. `TelegramBotApi` - 27 edges
8. `useSettingsStore` - 23 edges
9. `react-native` - 21 edges
10. `TroubleshootScreen()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `ThemedStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `App()` --calls--> `AppNav()`  [EXTRACTED]
  App.tsx → src/navigation/AppNav.tsx
- `App()` --calls--> `ThemeProvider()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `db()` --calls--> `getDb()`  [EXTRACTED]
  __tests__/filesRepo.test.ts → src/db/db.ts
- `render()` --calls--> `UpdateAlert()`  [EXTRACTED]
  __tests__/updateAlert.test.tsx → src/components/ui.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (50 total, 17 thin omitted)

### Community 0 - "SettingsScreen.tsx"
Cohesion: 0.13
Nodes (30): hasAllFilesAccess(), openAllFilesSettings(), isActiveTempDir(), NumberField(), SectionLabel(), TgIcon(), TgSwitch(), CARD_SHADOW (+22 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.06
Nodes (76): @noble/hashes, react-native-blob-util, react-native-keychain, CryptoLike, decryptFile(), decryptFileWithKey(), deriveKey(), EncryptedFile (+68 more)

### Community 3 - "foregroundService.ts"
Cohesion: 0.05
Nodes (77): App(), displayName, name, ThemedStatusBar(), react-native-background-actions, react-native-background-fetch, zustand, hideStatusNotification() (+69 more)

### Community 4 - "backupRunner.test.ts"
Cohesion: 0.10
Nodes (19): ScanResult, AndroidPermission, needsMediaPermissions(), PermissionState, requestBackupPermissions(), Category, CategoryKey, ApiInstance (+11 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.17
Nodes (16): isUnmeteredNetwork(), baseName(), deleteLocalOriginals(), DEVICE, freeSpaceBytes(), mimeFor(), PROCESS_START, runBackup() (+8 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.09
Nodes (27): react-native-blob-util, DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep() (+19 more)

### Community 7 - "StatsScreen.tsx"
Cohesion: 0.16
Nodes (27): PulsingDot(), SessionRecord, ActiveRunCard(), CARD_SHADOW, categoryLabel(), createStyles(), FILTER_DEFS, FLOAT_SHADOW (+19 more)

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

### Community 23 - "TroubleshootScreen.tsx"
Cohesion: 0.13
Nodes (23): guideFor(), OEM_GUIDE, OemGuide, WakeSource, BackgroundTour(), createStyles(), AppHeader(), TgIconName (+15 more)

### Community 28 - "Checklist rilis"
Cohesion: 0.25
Nodes (7): 1. Kode, 2. Build Android, 3. Uji di device (wajib, tidak bisa didelegasikan), 4. Play Console, 5. iOS (belum untuk rilis ini), 6. Setelah rilis, Checklist rilis

### Community 29 - "updateStore.ts"
Cohesion: 0.16
Nodes (23): dismissUpdateTag(), isUpdateDismissed(), pendingFromStorage(), UPDATE_DISMISS_KEY, UpdatePhase, UpdateUiState, useUpdateStore, appVersion() (+15 more)

### Community 30 - "ui.tsx"
Cohesion: 0.11
Nodes (30): formatBytes(), parseClampedInt(), Badge(), BottomNav(), Button(), Card(), Hint(), Icon() (+22 more)

### Community 31 - "db.ts"
Cohesion: 0.21
Nodes (10): @op-engineering/op-sqlite, getDb(), FileRecord, filesRepo, NewFile, CREATE_TABLES, MIGRATIONS, SCHEMA_VERSION (+2 more)

### Community 32 - "fileScanner.ts"
Cohesion: 0.18
Nodes (16): react-native, @react-native-camera-roll/camera-roll, DOC_EXTENSIONS, ensureLocalPath(), hasDocExtension(), isFileUri(), scanCameraRoll(), scanCategory() (+8 more)

### Community 33 - "SetupScreen.tsx"
Cohesion: 0.10
Nodes (29): react, stopScheduler(), CARD_SHADOW, createStyles(), HIT_SLOP, Props, SaveStatus, SendStatus (+21 more)

### Community 35 - "HomeScreen.tsx"
Cohesion: 0.17
Nodes (22): requestNotificationPermission(), ProgressBar(), ProgressRing(), Toggle(), useToast(), CARD_SHADOW, createStyles(), folderIcon() (+14 more)

### Community 36 - "manifest.ts"
Cohesion: 0.25
Nodes (13): batQuote(), createManifest(), DECRYPT_NOTE(), MANIFEST_VERSION, ManifestFile, manifestFileName(), manifestToJson(), reassembleScriptName() (+5 more)

### Community 38 - "react-native-blob-util"
Cohesion: 0.57
Nodes (5): clearRunStop(), flagPath(), requestRunStop(), runStopRequested(), fs

### Community 39 - "chunker.ts"
Cohesion: 0.42
Nodes (7): chunkFile, chunkName(), ChunkRange, cleanupChunks(), computeChunkRanges(), MAX_CHUNK_SIZE, partNameFor()

### Community 44 - "incremental.ts"
Cohesion: 0.50
Nodes (3): CandidateFile, needsBackup(), TrackedFile

### Community 45 - "updateAlert.test.tsx"
Cohesion: 0.33
Nodes (5): react-test-renderer, react-test-renderer, RELEASE, render(), setUpdate()

### Community 49 - "AppNav.tsx"
Cohesion: 0.22
Nodes (9): @react-navigation/native, @react-navigation/native-stack, TabKey, Stack, styles, TAB_ROUTES, RootStackParamList, RouteName (+1 more)

### Community 50 - "VaultStatusModule.kt"
Cohesion: 0.17
Nodes (9): cancelExactAlarm(), hasAllFilesAccess(), hideRunProgress(), hideStatus(), isCharging(), openAllFilesSettings(), scheduleExactAlarm(), showRunProgress() (+1 more)

### Community 52 - "react-native-safe-area-context"
Cohesion: 0.40
Nodes (3): mockBlobFiles, { webcrypto }, react-native-safe-area-context

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 278 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `NPM Scripts` to `Package Manifest References`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettingsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Why does `versionCodeOf()` connect `NPM Scripts` to `VaultStatusModule.kt`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Should `restoreRunner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05720122574055159 - nodes in this community are weakly interconnected._
- **Should `foregroundService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053726453726453724 - nodes in this community are weakly interconnected._
- **Should `backupRunner.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10276679841897234 - nodes in this community are weakly interconnected._
# Graph Report - rn  (2026-10-23)

## Corpus Check
- 124 files · ~110,647 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 7, (none) 6, .ttf 5)

## Summary
- 860 nodes · 2284 edges · 47 communities (30 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23c787e6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SettingsScreen.tsx
- restoreRunner.ts
- BackgroundTour.tsx
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
- VaultStatusModule
- Checklist rilis
- updateStore.ts
- ui.tsx
- db.ts
- fileScanner.ts
- SetupScreen.tsx
- ExactAlarm
- HomeScreen.tsx
- manifest.ts
- StatusNotification.kt
- react-native-blob-util
- chunker.ts
- AlarmReceiver.kt
- AGENTS.md
- BootReceiver.kt
- ScheduledRunService.kt
- incremental.ts
- react-native-safe-area-context
- DESIGN.md

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 56 edges
2. `runBackup()` - 42 edges
3. `tgTheme()` - 41 edges
4. `TgIcon()` - 33 edges
5. `SettingsScreen()` - 32 edges
6. `HomeScreen()` - 30 edges
7. `TelegramBotApi` - 27 edges
8. `react-native` - 21 edges
9. `TroubleshootScreen()` - 21 edges
10. `react-native-blob-util` - 20 edges

## Surprising Connections (you probably didn't know these)
- `ThemedStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `App()` --calls--> `ThemeProvider()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `db()` --calls--> `getDb()`  [EXTRACTED]
  __tests__/filesRepo.test.ts → src/db/db.ts
- `render()` --calls--> `UpdateAlert()`  [EXTRACTED]
  __tests__/updateAlert.test.tsx → src/components/ui.tsx
- `render()` --calls--> `ThemeProvider()`  [EXTRACTED]
  __tests__/updateAlert.test.tsx → src/theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (47 total, 17 thin omitted)

### Community 0 - "SettingsScreen.tsx"
Cohesion: 0.13
Nodes (29): requestNotificationPermission(), isActiveTempDir(), NumberField(), SectionLabel(), TgSwitch(), CARD_SHADOW, CATEGORY_HINTS, CATEGORY_ICONS (+21 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.06
Nodes (74): @noble/hashes, react-native-keychain, CryptoLike, decryptFile(), decryptFileWithKey(), deriveKey(), EncryptedFile, encryptFile() (+66 more)

### Community 2 - "BackgroundTour.tsx"
Cohesion: 0.10
Nodes (27): zustand, guideFor(), OEM_GUIDE, OemGuide, BackgroundTour(), createStyles(), createStyles(), WhatsNewModal() (+19 more)

### Community 3 - "foregroundService.ts"
Cohesion: 0.05
Nodes (87): App(), displayName, name, ThemedStatusBar(), react-native-background-actions, react-native-background-fetch, hideStatusNotification(), nativeStatus() (+79 more)

### Community 4 - "backupRunner.test.ts"
Cohesion: 0.11
Nodes (17): ScanResult, AndroidPermission, needsMediaPermissions(), PermissionState, requestBackupPermissions(), ApiInstance, apiMock, chunksMock (+9 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.20
Nodes (14): baseName(), deleteLocalOriginals(), DEVICE, freeSpaceBytes(), mimeFor(), PROCESS_START, runBackup(), sleep() (+6 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.08
Nodes (29): react-native-blob-util, stopScheduler(), DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry() (+21 more)

### Community 7 - "StatsScreen.tsx"
Cohesion: 0.13
Nodes (32): AppHeader(), PulsingDot(), TgIcon(), NewSession, SessionRecord, ActiveRunCard(), CARD_SHADOW, categoryLabel() (+24 more)

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
Cohesion: 0.11
Nodes (28): react-test-renderer, react, react-test-renderer, dismissUpdateTag(), isUpdateDismissed(), pendingFromStorage(), UPDATE_DISMISS_KEY, UpdatePhase (+20 more)

### Community 30 - "ui.tsx"
Cohesion: 0.12
Nodes (27): Badge(), BottomNav(), Button(), Card(), Hint(), Icon(), IconName, navColors() (+19 more)

### Community 31 - "db.ts"
Cohesion: 0.20
Nodes (10): @op-engineering/op-sqlite, getDb(), FileRecord, filesRepo, NewFile, CREATE_TABLES, MIGRATIONS, SCHEMA_VERSION (+2 more)

### Community 32 - "fileScanner.ts"
Cohesion: 0.18
Nodes (17): react-native, @react-native-camera-roll/camera-roll, DOC_EXTENSIONS, ensureLocalPath(), hasDocExtension(), isFileUri(), scanCameraRoll(), scanCategory() (+9 more)

### Community 33 - "SetupScreen.tsx"
Cohesion: 0.12
Nodes (17): @react-navigation/native, @react-navigation/native-stack, Stack, styles, TAB_ROUTES, RootStackParamList, RouteName, Routes (+9 more)

### Community 35 - "HomeScreen.tsx"
Cohesion: 0.21
Nodes (19): ProgressBar(), ProgressRing(), Toggle(), CARD_SHADOW, createStyles(), folderIcon(), FolderRow(), formatBytes() (+11 more)

### Community 36 - "manifest.ts"
Cohesion: 0.23
Nodes (14): batQuote(), createManifest(), DECRYPT_NOTE(), MANIFEST_VERSION, ManifestEncryption, ManifestFile, manifestFileName(), manifestToJson() (+6 more)

### Community 38 - "react-native-blob-util"
Cohesion: 0.50
Nodes (6): react-native-blob-util, clearRunStop(), flagPath(), requestRunStop(), runStopRequested(), fs

### Community 39 - "chunker.ts"
Cohesion: 0.52
Nodes (5): chunkFile, chunkName(), ChunkRange, computeChunkRanges(), MAX_CHUNK_SIZE

### Community 44 - "incremental.ts"
Cohesion: 0.50
Nodes (3): CandidateFile, needsBackup(), TrackedFile

### Community 45 - "react-native-safe-area-context"
Cohesion: 0.40
Nodes (3): mockBlobFiles, { webcrypto }, react-native-safe-area-context

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 268 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `NPM Scripts` to `Package Manifest References`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettingsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `VaultStatusModule` connect `VaultStatusModule` to `NPM Scripts`, `SafFolderModule.kt`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Should `restoreRunner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.057203956161454156 - nodes in this community are weakly interconnected._
- **Should `BackgroundTour.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10420168067226891 - nodes in this community are weakly interconnected._
- **Should `foregroundService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0524790236460717 - nodes in this community are weakly interconnected._
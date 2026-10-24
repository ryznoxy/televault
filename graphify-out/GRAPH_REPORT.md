# Graph Report - rn  (2026-10-24)

## Corpus Check
- 126 files · ~114,657 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 7, (none) 6, .ttf 5)

## Summary
- 874 nodes · 2340 edges · 53 communities (37 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `525dc9f4`
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
- StatusNotification.kt
- react-native-blob-util
- chunker.ts
- AlarmReceiver.kt
- AGENTS.md
- BootReceiver.kt
- ScheduledRunService.kt
- incremental.ts
- ThemeProvider.tsx
- DESIGN.md
- secureStore.ts
- TroubleshootScreen.tsx
- AppNav.tsx
- VaultStatusModule.kt
- tgTheme
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
- `App()` --calls--> `ThemeProvider()`  [EXTRACTED]
  App.tsx → src/theme/ThemeProvider.tsx
- `db()` --calls--> `getDb()`  [EXTRACTED]
  __tests__/filesRepo.test.ts → src/db/db.ts
- `render()` --calls--> `UpdateAlert()`  [EXTRACTED]
  __tests__/updateAlert.test.tsx → src/components/ui.tsx
- `blobTransport()` --references--> `react-native-blob-util`  [EXTRACTED]
  src/net/telegramApi.ts → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Official React Native learning/documentation resources** — readme_setup_environment_guide, readme_troubleshooting_guide, readme_integration_guide [EXTRACTED 1.00]
- **Run-the-app workflow (Metro + platform build + Fast Refresh)** — readme_metro, readme_android_platform, readme_ios_platform, readme_fast_refresh [EXTRACTED 1.00]
- **Android Launcher Icon Multi-Density Asset Set** — android_app_src_main_res_mipmap_hdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_mdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_android_default_icon_square, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_android_default_icon_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_android_default_icon_round [INFERRED 0.85]

## Communities (53 total, 16 thin omitted)

### Community 0 - "SettingsScreen.tsx"
Cohesion: 0.13
Nodes (28): hasAllFilesAccess(), openAllFilesSettings(), isActiveTempDir(), TgIcon(), CARD_SHADOW, CATEGORY_HINTS, CATEGORY_ICONS, createStyles() (+20 more)

### Community 1 - "restoreRunner.ts"
Cohesion: 0.07
Nodes (70): @noble/hashes, react-native-blob-util, CryptoLike, decryptFile(), decryptFileWithKey(), deriveKey(), EncryptedFile, encryptFile() (+62 more)

### Community 2 - "BackgroundTour.tsx"
Cohesion: 0.23
Nodes (12): createStyles(), WhatsNewModal(), ELEVATION, FONT, RADIUS, SPACE, TG, TG_DARK (+4 more)

### Community 3 - "foregroundService.ts"
Cohesion: 0.05
Nodes (80): App(), displayName, name, ThemedStatusBar(), react-native-background-actions, react-native-background-fetch, hideStatusNotification(), isCharging() (+72 more)

### Community 4 - "backupRunner.test.ts"
Cohesion: 0.12
Nodes (15): ScanResult, needsMediaPermissions(), requestBackupPermissions(), ApiInstance, apiMock, chunksMock, filesMock, fsMock (+7 more)

### Community 5 - "backupRunner.ts"
Cohesion: 0.16
Nodes (17): isUnmeteredNetwork(), baseName(), deleteLocalOriginals(), DEVICE, freeSpaceBytes(), mimeFor(), PROCESS_START, runBackup() (+9 more)

### Community 6 - "Telegram Upload API"
Cohesion: 0.09
Nodes (26): DocumentApi, httpCodeOf(), isRetryable(), retryAfterOf(), retryDelayMs(), sendDocumentWithRetry(), sleep(), asTransportError() (+18 more)

### Community 7 - "StatsScreen.tsx"
Cohesion: 0.14
Nodes (29): PulsingDot(), NewSession, SessionRecord, ActiveRunCard(), CARD_SHADOW, categoryLabel(), createStyles(), FILTER_DEFS (+21 more)

### Community 8 - "Package Manifest References"
Cohesion: 0.07
Nodes (29): @react-native/typescript-config, name, private, version, @babel/core, @babel/preset-env, @babel/runtime, eslint (+21 more)

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
Cohesion: 0.27
Nodes (8): zustand, guideFor(), OEM_GUIDE, OemGuide, BackgroundTour(), createStyles(), TourState, useTourStore

### Community 28 - "Checklist rilis"
Cohesion: 0.25
Nodes (7): 1. Kode, 2. Build Android, 3. Uji di device (wajib, tidak bisa didelegasikan), 4. Play Console, 5. iOS (belum untuk rilis ini), 6. Setelah rilis, Checklist rilis

### Community 29 - "updateStore.ts"
Cohesion: 0.14
Nodes (25): mmkv, mmkvStorage, dismissUpdateTag(), isUpdateDismissed(), pendingFromStorage(), UPDATE_DISMISS_KEY, UpdatePhase, UpdateUiState (+17 more)

### Community 30 - "ui.tsx"
Cohesion: 0.13
Nodes (27): Badge(), BottomNav(), Button(), Card(), Hint(), Icon(), IconName, navColors() (+19 more)

### Community 31 - "db.ts"
Cohesion: 0.20
Nodes (10): @op-engineering/op-sqlite, getDb(), FileRecord, filesRepo, NewFile, CREATE_TABLES, MIGRATIONS, SCHEMA_VERSION (+2 more)

### Community 32 - "fileScanner.ts"
Cohesion: 0.18
Nodes (16): react-native, @react-native-camera-roll/camera-roll, DOC_EXTENSIONS, ensureLocalPath(), hasDocExtension(), isFileUri(), scanCameraRoll(), scanCategory() (+8 more)

### Community 33 - "SetupScreen.tsx"
Cohesion: 0.15
Nodes (12): stopScheduler(), CARD_SHADOW, createStyles(), HIT_SLOP, Props, SaveStatus, SendStatus, TestStatus (+4 more)

### Community 35 - "HomeScreen.tsx"
Cohesion: 0.21
Nodes (19): requestNotificationPermission(), ProgressRing(), Toggle(), useToast(), CARD_SHADOW, createStyles(), folderIcon(), FolderRow() (+11 more)

### Community 36 - "manifest.ts"
Cohesion: 0.23
Nodes (14): batQuote(), createManifest(), DECRYPT_NOTE(), Manifest, MANIFEST_VERSION, ManifestFile, manifestFileName(), manifestToJson() (+6 more)

### Community 38 - "react-native-blob-util"
Cohesion: 0.57
Nodes (5): clearRunStop(), flagPath(), requestRunStop(), runStopRequested(), fs

### Community 39 - "chunker.ts"
Cohesion: 0.42
Nodes (7): chunkFile, chunkName(), ChunkRange, cleanupChunks(), computeChunkRanges(), MAX_CHUNK_SIZE, partNameFor()

### Community 44 - "incremental.ts"
Cohesion: 0.50
Nodes (3): CandidateFile, needsBackup(), TrackedFile

### Community 45 - "ThemeProvider.tsx"
Cohesion: 0.18
Nodes (12): react-test-renderer, react, react-test-renderer, Theme, ThemeMode, readStoredMode(), ThemeContext, ThemeContextValue (+4 more)

### Community 47 - "secureStore.ts"
Cohesion: 0.29
Nodes (4): react-native-keychain, Credentials, EMPTY, secureStore

### Community 48 - "TroubleshootScreen.tsx"
Cohesion: 0.18
Nodes (10): WakeSource, TgIconName, CARD_SHADOW, Diagnostics, EMPTY_DIAGNOSTICS, Props, ErrorLogEntry, ON_ACCENT (+2 more)

### Community 49 - "AppNav.tsx"
Cohesion: 0.22
Nodes (9): @react-navigation/native, @react-navigation/native-stack, TabKey, Stack, styles, TAB_ROUTES, RootStackParamList, RouteName (+1 more)

### Community 50 - "VaultStatusModule.kt"
Cohesion: 0.16
Nodes (9): cancelExactAlarm(), hasAllFilesAccess(), hideRunProgress(), hideStatus(), isCharging(), openAllFilesSettings(), scheduleExactAlarm(), showRunProgress() (+1 more)

### Community 51 - "tgTheme"
Cohesion: 0.46
Nodes (8): AppHeader(), SectionLabel(), createStyles(), DetailLine(), InfoRow(), TroubleshootScreen(), wakeLabel(), tgTheme()

### Community 52 - "react-native-safe-area-context"
Cohesion: 0.40
Nodes (3): mockBlobFiles, { webcrypto }, react-native-safe-area-context

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `React`, `React_RCTAppDelegate`, `ReactAppDependencyProvider`, `@react-native-clipboard/clipboard` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 277 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `NPM Scripts` to `Package Manifest References`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **What connects `UIKit`, `React`, `React_RCTAppDelegate` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettingsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `versionCodeOf()` connect `NPM Scripts` to `VaultStatusModule.kt`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Should `restoreRunner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06783511846802986 - nodes in this community are weakly interconnected._
- **Should `foregroundService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051962676962676965 - nodes in this community are weakly interconnected._
- **Should `backupRunner.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
<div align="center">

# TeleVault

**Backup terenkripsi dari HP Android langsung ke Telegram** — tanpa server, tanpa langganan cloud.

File besar dipotong, dienkripsi di perangkat, lalu dikirim sebagai dokumen ke chat bot pribadi kamu.
Dari chat itu semuanya bisa dipulihkan lagi lewat aplikasi.

[![CI](https://github.com/ryznoxy/televault/actions/workflows/ci.yml/badge.svg)](https://github.com/ryznoxy/televault/actions/workflows/ci.yml)
[![Release](https://github.com/ryznoxy/televault/actions/workflows/release.yml/badge.svg)](https://github.com/ryznoxy/televault/actions/workflows/release.yml)
![React Native](https://img.shields.io/badge/React%20Native-0.87-61DAFB)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey)

</div>

---

## Tampilan

| Utama | Riwayat |
|:---:|:---:|
| ![Layar Utama](docs/home.png) | ![Layar Riwayat](docs/stats.png) |
| **Setup** | **Pengaturan** |
| ![Layar Setup](docs/setup.png) | ![Layar Pengaturan](docs/settings.png) |

## Fitur

- 🔐 **Enkripsi di perangkat** — AES-256-GCM, kunci dari PBKDF2-SHA256 (210.000 iterasi, salt 16 byte, IV 12 byte **per potongan**). Passphrase tidak pernah dikirim ke Telegram; hanya salt dan IV-nya.
- 🗂️ **Kategori backup** — Photos, Videos, Documents, dan folder custom bebas lewat SAF (juga di Android). Contacts & SMS menyusul (lihat [Batasan](#batasan-yang-diketahui)).
- ✂️ **Chunking** — file dipecah maksimal 49 MB per bagian supaya lolos batas 50 MB Bot API; dengan enkripsi aktif batasnya 16 MB supaya puncak RAM tetap rendah. Arsip dinamai `backup-<waktu>.zip` (contoh `backup-2026-10-20-09-31-00.zip`), potongannya `…zip.001`, `.002`, … Setiap potongan dienkripsi sendiri, jadi backup multi-GB tidak perlu menahan seluruh arsip di memori.
- ♻️ **Backup inkremental** — file yang `mtime`-nya tidak berubah dilewati, jadi backup harian hanya mengunggah yang baru. Maksimal berkas per run bisa diatur (default 250); sisanya lanjut otomatis di run berikutnya.
- 📋 **Manifest + skrip reassembly** — setiap arsip mengirim `<nama>.manifest.json` (ukuran, jumlah chunk, SHA-256, daftar IV, info enkripsi) plus skrip `.sh`/`.bat` untuk menyatukan potongan tanpa aplikasi.
- 👆 **Restore one-tap dari bot** — pilih sesi di layar Pulihkan, manifest dan semua potongan diunduh otomatis dari chat bot, lalu gabung → verifikasi SHA-256 → dekripsi per potongan → ekstrak zip. Tersedia untuk backup yang dibuat sejak v1.1.0 (app menyimpan `file_id` Telegram tiap potongan; DB lokal yang menyimpannya hilang kalau app dihapus). Backup lama tetap bisa dipulihkan manual: download potongan + manifest dari Telegram, lalu "Pilih berkas backup". Iterasi PBKDF2 restore mengikuti yang tercatat di manifest (minimum 210.000), jadi backup lama tetap bisa dibuka.
- 🚀 **Self-update** — app memeriksa [Releases](https://github.com/ryznoxy/televault/releases) saat dibuka; kalau ada versi baru muncul banner, tap untuk unduh (dengan progres), verifikasi SHA-256, lalu installer Android terbuka. Checksum tidak cocok → APK dibuang, tidak pernah dibuka.
- 🔌 **Setup tanpa browser** — Chat ID dideteksi otomatis: kirim pesan ke bot, tekan Deteksi Otomatis, kolom terisi sendiri (wajib ID angka; bot tidak bisa mengirim ke @username untuk chat pribadi/grup privat).
- ⏰ **Penjadwalan** — manual, interval (jam), jam tertentu tiap hari, atau hanya saat charging.
- 🌙 **Jalan di background** — `react-native-background-fetch` + foreground service, termasuk headless task saat aplikasi tertutup.
- 📶 **Upload tahan putus** — retry dengan backoff (`Retry-After` 429 dihormati, dibatasi 60 detik); progres, riwayat sesi, dan statistik tersimpan lokal (SQLite) dan bisa diekspor CSV.
- 🛠️ **Troubleshoot** — layar diagnostik untuk izin, koneksi bot, dan panduan baterai per OEM.
- 📡 **Wifi-only** dan passphrase strength check.
- 🌗 **Tema terang & gelap** — toggle dark mode di Settings, semua layar ter-tokenisasi mengikuti.

## Alur backup

```
scan kategori → saring file berubah → (opsional) zip → potong 49 MB → enkripsi per potongan
   → upload sendDocument ke chat bot (simpan file_id tiap potongan & manifest) → catat sesi di SQLite
```

## Instalasi

APK siap install ada di halaman [**Releases**](https://github.com/ryznoxy/televault/releases) — ambil `app-release.apk` dari rilis terbaru, buka, dan install (Android akan minta konfirmasi "Install anyway" dari Play Protect — normal untuk APK di luar Play Store).

Update berikutnya tidak perlu download manual lagi: buka app, kalau ada versi baru akan muncul banner di layar Utama.

## Prasyarat (untuk build dari source)

- Node.js >= 22.11, JDK 17, Android SDK (mengikuti [set up environment](https://reactnative.dev/docs/set-up-your-environment)).
- Bot Telegram: buat lewat [@BotFather](https://t.me/BotFather). Chat ID tidak perlu dicari manual — kirim pesan ke bot, lalu di layar Setup tekan **Deteksi Otomatis**.
- Untuk iOS: Xcode + CocoaPods (`bundle install && bundle exec pod install`).

> [!IMPORTANT]
> Token bot, chat ID, dan passphrase enkripsi disimpan di keychain/keystore perangkat lewat `react-native-keychain`, bukan di source atau `.env`. Ketiganya hanya dibaca saat backup/restore berjalan dan tidak pernah dikirim ke Telegram. Menghapus aplikasi menghapus keychain-nya — simpan passphrase di tempat lain juga.

## Menjalankan

```sh
npm install
npm start          # Metro
npm run android    # terminal lain
npm run ios
```

Di aplikasi: layar Setup → tempel token bot → kirim pesan ke bot → Deteksi Otomatis chat ID → kirim pesan tes → pilih kategori, jadwal, dan passphrase → backup pertama.

## Pengembangan

```sh
npm test           # Jest
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
```

Ketiganya juga jalan di CI (`.github/workflows/ci.yml`) untuk setiap push ke `main` dan setiap pull request.

Struktur:

```
src/
  backup/     scan, chunker, crypto, hasher, manifest, zip, upload retry, runner backup & restore
  background/ scheduler, foreground service, headless task, aturan kapan backup jalan
  db/         op-sqlite: schema + repository sessions/files/chunks
  net/        klien Bot API (token selalu di-redact dari error)
  screens/    Home, Setup, Restore, Settings, Stats, Troubleshoot
  state/      zustand store (MMKV persist), secure store, riwayat
  theme/      token warna terang/gelap
  update/     self-updater (cek rilis, unduh APK, verifikasi checksum)
__tests__/    unit test per modul
```

## Rilis

Rilis otomatis lewat GitHub Actions: **push tag `vX.Y.Z` → workflow [`release.yml`](.github/workflows/release.yml) build APK signed + `SHA256SUMS`, lalu tempel keduanya ke GitHub Release**. App yang sudah ter-install mendeteksinya lewat banner self-update.

Persiapan sekali saja (mesin rilis / repo):

1. Buat upload keystore sekali (simpan file + password-nya; kehilangan keduanya berarti tidak bisa merilis update lagi):

   ```sh
   keytool -genkeypair -v -keystore televault-upload.keystore \
     -alias televault -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Set 4 repo secrets (**Settings → Secrets and variables → Actions**):

   | Secret | Isi |
   |---|---|
   | `TELEVAULT_STORE_FILE_B64` | keystore di-encode base64 (`base64 -w0 televault-upload.keystore`) |
   | `TELEVAULT_STORE_PASSWORD` | password keystore |
   | `TELEVAULT_KEY_ALIAS` | alias key (mis. `televault`) |
   | `TELEVAULT_KEY_PASSWORD` | password key |

3. Untuk build release lokal (di luar CI), taruh propertinya di `~/.gradle/gradle.properties` — **jangan** di `android/gradle.properties` yang ikut ter-commit:

   ```properties
   TELEVAULT_STORE_FILE=/absolute/path/televault-upload.keystore
   TELEVAULT_STORE_PASSWORD=...
   TELEVAULT_KEY_ALIAS=televault
   TELEVAULT_KEY_PASSWORD=...
   ```

   Kalau salah satu properti kosong, build release **gagal** dan tidak diam-diam memakai debug key.

Rilis versi baru:

```sh
git tag v1.3.0 && git push origin v1.3.0
```

`versionName` dan `versionCode` di-stamp otomatis dari tag (versionCode = semver encoded: `v1.2.3` → `1002003`) — tidak perlu edit `build.gradle` per rilis.

### iOS

Bundle id `com.televault.app`, `MARKETING_VERSION` di `ios/TelebotBackupRN.xcodeproj`. Jalankan `bundle install && bundle exec pod install`, set team + signing di Xcode, lalu archive. iOS belum diuji di device (lihat Batasan).

## Batasan yang diketahui

- **7z belum didukung** — writer 7z tidak tersedia di Hermes; opsi format ditampilkan tapi dinonaktifkan (`src/backup/zipper.ts`).
- **49 MB per chunk** — batas Bot API publik (16 MB saat enkripsi aktif, demi RAM). Server Bot API lokal bisa menaikkan ini, tapi belum jadi target build.
- **Contacts & SMS belum ada** — barisnya tampil nonaktif ("Segera hadir"); belum ada reader-nya.
- **Documents di Android 11+ bisa kosong** — scoped storage membatasi folder `Download`/`Documents`. Kategori yang terbaca 0 berkas akan memberitahukannya di ringkasan backup.
- **Android 15+ membatasi foreground service `dataSync` ±6 jam per hari** — backup yang lebih lama dari itu bisa dihentikan sistem; jalankan ulang atau kecilkan jumlah berkas per run (`maxFilesPerRun`).
- **Jadwal global, bukan per folder** — satu jadwal untuk semua kategori terpilih.
- **Restore one-tap butuh DB lokal** — `file_id` potongan disimpan di SQLite app. Hapus app = hilang; restore HP baru tetap bisa lewat jalur manual (download dari Telegram).
- **APK debug butuh Metro; pakai build release** — hanya `assembleRelease` yang membundel JS. APK di Releases sudah release build.
- **iOS belum diuji di device.**
- **Package Kotlin masih `com.telebotbackuprn`** (nama modul Xcode `TelebotBackupRN`), tapi id yang dipasang/dipublikasikan adalah `com.televault.app` di kedua platform — id ini permanen setelah rilis pertama.

Checklist rilis lengkap ada di [`docs/release-checklist.md`](docs/release-checklist.md).

## Git

`main` stabil. Setiap fitur/perbaikan di branch sendiri:

```sh
git switch main && git pull --ff-only
git switch -c feat/<slug>
# ... commit kecil, Conventional Commits: feat(backup): ...
git push -u origin feat/<slug>
git switch main && git merge --no-ff feat/<slug>
```

Branch tidak dihapus sampai fitur terverifikasi di device, supaya bug susulan bisa di-fix di branch yang sama.

---

<div align="center">
<sub>TeleVault — backup kamu, kunci kamu, channel kamu.</sub>
</div>

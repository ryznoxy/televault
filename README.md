# TeleVault

Backup terenkripsi dari HP Android/iOS langsung ke **Telegram** — tanpa server, tanpa langganan cloud. TeleVault memotong file besar jadi beberapa bagian, mengenkripsinya di perangkat, lalu mengirimkannya sebagai dokumen ke chat bot pribadi kamu. Dari chat itu semuanya bisa dipulihkan lagi lewat aplikasi.

Status: aplikasi React Native 0.87, Android jadi target utama, iOS ikut terbangun tapi belum diuji di device.

## Fitur

- **Kategori backup** — Photos, Videos, Documents, dan folder custom (Android: hanya Photos/Videos/Documents, lihat Batasan).
- **Enkripsi di perangkat** — AES-256-GCM, kunci dari PBKDF2-SHA256 (210.000 iterasi, salt 16 byte, IV 12 byte **per potongan**). Passphrase tidak pernah dikirim ke Telegram; hanya salt dan IV-nya.
- **Chunking** — file dipecah maksimal 49 MB per bagian (`nama.zip.001`, `.002`, …) supaya lolos batas 50 MB Bot API; dengan enkripsi aktif batasnya 16 MB supaya puncak RAM tetap rendah. Setiap potongan dienkripsi sendiri, jadi backup multi-GB tidak perlu menahan seluruh arsip di memori.
- **Backup inkremental** — file yang `mtime`-nya tidak berubah dilewati, jadi backup harian hanya mengunggah yang baru.
- **Manifest + skrip reassembly** — setiap arsip mengirim `<nama>.manifest.json` (ukuran, jumlah chunk, SHA-256, daftar IV, info enkripsi) plus skrip `.sh`/`.bat` untuk menyatukan potongan tanpa aplikasi.
- **Restore dari Telegram** — pilih potongan → gabung → verifikasi SHA-256 → dekripsi per potongan → ekstrak zip, dengan status per berkas.
- **Penjadwalan** — manual, interval (jam), jam tertentu tiap hari, atau hanya saat charging.
- **Jalan di background** — `react-native-background-fetch` + foreground service, termasuk headless task saat aplikasi tertutup.
- **Upload tahan putus** — retry dengan backoff (`Retry-After` 429 dihormati, dibatasi 60 detik); progres, riwayat sesi, dan statistik tersimpan lokal (SQLite) dan bisa diekspor CSV.
- **Troubleshoot** — layar diagnostik untuk izin, koneksi bot, dan panduan baterai per OEM.
- **Wifi-only** dan passphrase strength check.

## Alur backup

```
scan kategori → saring file berubah → (opsional) zip → potong 49 MB → enkripsi per potongan
   → upload sendDocument ke chat bot → upload manifest + skrip → catat sesi di SQLite
```

## Prasyarat

- Node.js >= 22.11, JDK 17, Android SDK (mengikuti [set up environment](https://reactnative.dev/docs/set-up-your-environment)).
- Bot Telegram: buat lewat [@BotFather](https://t.me/BotFather), lalu ambil **chat ID** (kirim pesan ke bot, buka `https://api.telegram.org/bot<TOKEN>/getUpdates`).
- Untuk iOS: Xcode + CocoaPods (`bundle install && bundle exec pod install`).

Token bot, chat ID, dan passphrase enkripsi disimpan di keychain/keystore perangkat lewat `react-native-keychain`, bukan di source atau `.env`. Ketiganya hanya dibaca saat backup/restore berjalan dan tidak pernah dikirim ke Telegram. Menghapus aplikasi menghapus keychain-nya — simpan passphrase di tempat lain juga.

## Menjalankan

```sh
npm install
npm start          # Metro
npm run android    # terminal lain
npm run ios
```

Di aplikasi: layar Setup → tempel token bot → validasi → tempel chat ID → kirim pesan tes → pilih kategori, jadwal, dan passphrase → backup pertama.

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
__tests__/    unit test per modul
```

## Rilis

### Android (Play Store)

1. Buat upload keystore sekali (simpan file + password-nya; kehilangan keduanya berarti tidak bisa merilis update lagi):

   ```sh
   keytool -genkeypair -v -keystore televault-upload.keystore \
     -alias televault -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Tambahkan empat baris ini ke `%USERPROFILE%\.gradle\gradle.properties` (atau `~/.gradle/gradle.properties`) — **jangan** ke `android/gradle.properties` yang ikut ter-commit:

   ```properties
   TELEVAULT_STORE_FILE=/absolute/path/televault-upload.keystore
   TELEVAULT_STORE_PASSWORD=...
   TELEVAULT_KEY_ALIAS=televault
   TELEVAULT_KEY_PASSWORD=...
   ```

3. Build: `cd android && ./gradlew bundleRelease` (AAB ada di `android/app/build/outputs/bundle/release/`).

Kalau salah satu properti di atas kosong, build release **gagal** dan tidak diam-diam memakai debug key.

`versionCode` dan `versionName` ada di `android/app/build.gradle`; naikkan `versionCode` di setiap unggahan baru.

### iOS

Bundle id `com.televault.app`, `MARKETING_VERSION` di `ios/TelebotBackupRN.xcodeproj`. Jalankan `bundle install && bundle exec pod install`, set team + signing di Xcode, lalu archive. iOS belum diuji di device (lihat Batasan).

## Batasan yang diketahui

- **7z belum didukung** — writer 7z tidak tersedia di Hermes; opsi format ditampilkan tapi dinonaktifkan (`src/backup/zipper.ts`).
- **49 MB per chunk** — batas Bot API publik (16 MB saat enkripsi aktif, demi RAM). Server Bot API lokal bisa menaikkan ini, tapi belum jadi target build.
- **Contacts & SMS belum ada** — barisnya tampil nonaktif ("Segera hadir"); belum ada reader-nya.
- **Folder custom belum jalan di Android** — SAF hanya memberi `content://` yang tidak bisa ditelusuri `ls`, jadi kategorinya dinonaktifkan di Android dan folder bebas dipakai di iOS.
- **Documents di Android 11+ bisa kosong** — scoped storage membatasi folder `Download`/`Documents`. Kategori yang terbaca 0 berkas akan memberitahukannya di ringkasan backup.
- **Android 15+ membatasi foreground service `dataSync` ±6 jam per hari** — backup yang lebih lama dari itu bisa dihentikan sistem; jalankan ulang atau kecilkan jumlah berkas per run (`maxFilesPerRun`).
- **Jadwal global, bukan per folder** — satu jadwal untuk semua kategori terpilih.
- **Tema masih terang saja** — baris "Tampilan gelap" nonaktif.
- **iOS belum diuji di device.**
- **Package Kotlin masih `com.telebotbackuprn`** (nama modul Xcode `TelebotBackupRN`), tapi id yang dipasang/dipublikasikan adalah `com.televault.app` di kedua platform — ganti sekarang kalau mau nama lain, karena id ini permanen setelah rilis pertama.

Checklist rilis lengkap (build, uji device, Play Console) ada di [`docs/release-checklist.md`](docs/release-checklist.md).

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

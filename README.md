# TeleVault

Backup terenkripsi dari HP Android/iOS langsung ke **Telegram** — tanpa server, tanpa langganan cloud. TeleVault memotong file besar jadi beberapa bagian, mengenkripsinya di perangkat, lalu mengirimkannya sebagai dokumen ke chat bot pribadi kamu. Dari chat itu semuanya bisa dipulihkan lagi lewat aplikasi.

Status: aplikasi React Native 0.87, Android jadi target utama, iOS ikut terbangun tapi belum diuji di device.

## Fitur

- **Kategori backup** — Photos, Videos, Documents, Contacts, SMS, dan folder custom (bisa lebih dari satu, masing-masing punya jadwal sendiri).
- **Enkripsi di perangkat** — AES-256-GCM, kunci dari PBKDF2-SHA256 (210.000 iterasi, salt 16 byte, IV 12 byte per file). Passphrase tidak pernah dikirim atau disimpan; hanya salt-nya.
- **Chunking** — file dipecah maksimal 49 MB per bagian (`nama.zip.001`, `.002`, …) supaya lolos batas 50 MB Bot API.
- **Backup inkremental** — file yang `mtime`-nya tidak berubah dilewati, jadi backup harian hanya mengunggah yang baru.
- **Manifest + skrip reassembly** — setiap sesi mengirim `manifest.json` (ukuran, jumlah chunk, SHA-256, info enkripsi) plus skrip `.sh`/`.bat` untuk menyatukan potongan tanpa aplikasi.
- **Restore dari Telegram** — gabung chunk → verifikasi SHA-256 → dekripsi → ekstrak zip, dengan status per file.
- **Penjadwalan** — manual, interval (jam), jam tertentu tiap hari, atau hanya saat charging.
- **Jalan di background** — `react-native-background-fetch` + foreground service, termasuk headless task saat aplikasi tertutup.
- **Upload tahan putus** — retry dengan backoff; progres, riwayat sesi, dan statistik tersimpan lokal (SQLite) dan bisa diekspor CSV.
- **Troubleshoot** — layar diagnostik untuk izin, koneksi bot, dan panduan baterai per OEM.
- **Wifi-only, tema terang/gelap**, dan passphrase strength check.

## Alur backup

```
scan kategori → saring file berubah → (opsional) zip → enkripsi → potong 49 MB
   → upload sendDocument ke chat bot → upload manifest.json + skrip → catat sesi di SQLite
```

## Prasyarat

- Node.js >= 22.11, JDK 17, Android SDK (mengikuti [set up environment](https://reactnative.dev/docs/set-up-your-environment)).
- Bot Telegram: buat lewat [@BotFather](https://t.me/BotFather), lalu ambil **chat ID** (kirim pesan ke bot, buka `https://api.telegram.org/bot<TOKEN>/getUpdates`).
- Untuk iOS: Xcode + CocoaPods (`bundle install && bundle exec pod install`).

Token bot dan chat ID disimpan di keychain/keystore lewat `react-native-keychain`, bukan di source atau `.env`.

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

## Batasan yang diketahui

- **7z belum didukung** — writer 7z tidak tersedia di Hermes; opsi format ditampilkan tapi dinonaktifkan (`src/backup/zipper.ts`).
- **49 MB per chunk** — batas Bot API publik. Server Bot API lokal bisa menaikkan ini, tapi belum jadi target build.
- **Package ID Android masih `com.telebotbackuprn`** dan target Xcode masih `TelebotBackupRN`; nama tampilan aplikasi sudah TeleVault. Mengganti package ID akan membuat instalasi lama terlihat sebagai aplikasi berbeda (data hilang), jadi sengaja dibiarkan.

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

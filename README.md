<div align="center">

<img src="docs/logo.png" width="150" alt="TeleVault" />

# TeleVault

**Backup terenkripsi dari HP Android langsung ke Telegram.** Tanpa server, tanpa langganan cloud.

[![CI](https://github.com/ryznoxy/televault/actions/workflows/ci.yml/badge.svg)](https://github.com/ryznoxy/televault/actions/workflows/ci.yml)
[![Release](https://github.com/ryznoxy/televault/actions/workflows/release.yml/badge.svg)](https://github.com/ryznoxy/televault/actions/workflows/release.yml)
[![Rilis](https://img.shields.io/github/v/release/ryznoxy/televault?label=rilis)](https://github.com/ryznoxy/televault/releases)
![React Native](https://img.shields.io/badge/React%20Native-0.87-61DAFB)
![Platform](https://img.shields.io/badge/platform-Android-lightgrey)
![VibeCoded App](https://img.shields.io/badge/VibeCoded-App-7C3AED)

</div>

---

## Ringkasan

TeleVault memindahkan backup HP kamu ke chat bot Telegram pribadi. Berkas dipindai dari galeri atau folder pilihan, dienkripsi di perangkat, dipotong sesuai batas Bot API, lalu dikirim sebagai dokumen. Kunci enkripsi tidak pernah meninggalkan HP, dan pemulihan bisa dilakukan dari aplikasi atau dari skrip yang ikut terkirim.

Cocok untuk yang ingin backup rutin tanpa menyewa storage: Telegram sudah jadi tempat penyimpanannya, aplikasi ini yang mengurus enkripsi, jadwal, dan pemulihan.

## Tampilan

| Utama | Riwayat |
|:---:|:---:|
| <img src="docs/home.png" width="260" alt="Layar Utama" /> | <img src="docs/stats.png" width="260" alt="Layar Riwayat" /> |
| **Setup** | **Pengaturan** |
| <img src="docs/setup.png" width="260" alt="Layar Setup" /> | <img src="docs/settings.png" width="260" alt="Layar Pengaturan" /> |

## Fitur

### Backup dan enkripsi

- **Kategori**: Photos, Videos, Documents, dan folder sendiri lewat pemilih folder Android (SAF).
- **Inkremental**: berkas yang tidak berubah dilewati, jadi backup harian hanya mengunggah yang baru.
- **Batas per run**: jumlah berkas dibagi rata ke kategori yang punya berkas baru, sisanya lanjut di run berikutnya.
- **Enkripsi di perangkat**: AES-256-GCM, kunci dari PBKDF2-SHA256, satu IV untuk setiap potongan.
- **Kirim media langsung (opsional)**: foto dan video di bawah 45 MB dikirim dengan nama aslinya sehingga tampil dengan pratinjau di Telegram; bisa dinyalakan di Pengaturan.
- **Zip secara default**: backup baru digabung per kategori, lalu dipotong maksimal 49 MB per bagian — sedikit pesan, mudah dipulihkan.
- **Manifest dan skrip**: setiap arsip membawa manifest JSON plus skrip `.sh` dan `.bat` untuk menyatukan potongan tanpa aplikasi.

### Penjadwalan dan latar belakang

- **Frekuensi**: Harian pada jam pilihan adalah bawaan instalasi baru (default 02:00), jadi backup jalan sendiri setelah setup; Tiap Jam, ±15 Menit, Mingguan, dan Manual tetap tersedia.
- **Hanya saat charging**: satu toggle yang menahan jadwal apa pun sampai HP dicolok. Alarm 02:00 tetap bangun tepat waktu, memeriksa charger, lalu melewati slot itu kalau tidak dicas.
- **Jeda kapan saja**: tombol Jeda di layar Utama menghentikan jadwal tanpa menghapus pengaturan.
- **Alarm eksak**: jadwal jam tertentu memakai alarm bentuk alarm jam, jadi tidak digeser Doze.
- **Tahan reboot**: alarm dipasang ulang setelah HP reboot, jam diubah, atau zona waktu berpindah.
- **Jalan tanpa app terbuka**: backup berjalan di foreground service milik alarm, termasuk headless task.
- **Hanya Wi-Fi**: diperiksa di semua jalur, jadi backup terjadwal pun tidak jalan di data seluler.
- **Hentikan di tengah jalan**: tombol Hentikan di layar Utama dan di notifikasi; potongan tidak pernah terkirim setengah.
- **Progres lintas proses**: layar Utama membaca sesi berjalan dari database, jadi backup otomatis tetap terlihat progresnya.

### Pemulihan

- **Restore one-tap**: pilih sesi, unduh manifest dan semua potongan dari chat, gabung, verifikasi SHA-256, dekripsi, ekstrak.
- **Impor manifest dari Telegram**: di HP baru atau setelah reinstall — kirim file manifest ke bot, app mengunduh semua potongan otomatis tanpa perlu database lama.
- **Resolusi alamat file berlapis**: unduhan mencari `file_id` dari database lokal, lalu dari manifest, lalu bot menyalin pesan aslinya (`forwardMessage`) untuk mendapat alamat baru.
- **Restore dari folder**: untuk backup lama tanpa alamat file di manifest — tunjuk folder backup di HP, app mencocokkan berkas lewat nama dan hash.
- **Restore manual**: unduh berkas dari Telegram lalu pilih lewat aplikasi.
- **Uji pemulihan**: satu tombol di Troubleshooting yang mengunduh arsip terkecil, mendekripsi, dan mencocokkan hash-nya.
- **Riwayat dan statistik**: sesi tersimpan di SQLite lokal, rasio keberhasilan dihitung dari run selesai, bisa diekspor CSV.

### Antarmuka dan pembaruan

- **Notifikasi status**: satu notifikasi senyap yang menunjukkan app aktif dan kapan backup terakhir berjalan.
- **Notifikasi progres**: persen dan kecepatan unggah selama backup berjalan.
- **Alert pembaruan**: muncul di atas layar mana pun, dengan tombol Perbarui dan Nanti, progres unduh, dan tombol batal.
- **Modal apa baru**: ringkasan perubahan tampil sekali setelah update.
- **Troubleshooting**: status izin, panduan baterai per merek, sumber wake terakhir, dan popup kegagalan terakhir.
- **Tour persiapan**: empat langkah seusai setup meminta izin semua file, bebas optimasi baterai, dan autostart — tidak perlu backup manual dulu agar popup izinnya muncul.
- **Tema terang dan gelap**: semua layar mengikuti token warna.

## Alur backup

```
scan kategori -> saring berkas berubah -> zip per kategori (default) -> potong 49 MB
   -> enkripsi per potongan -> kirim ke chat bot -> simpan file_id dan sesi
```

## Instalasi

1. Unduh `TeleVault-v<versi>.apk` dari halaman [**Releases**](https://github.com/ryznoxy/televault/releases).
2. Buka berkasnya dan setujui pemasangan. Android akan menampilkan peringatan "Install anyway", normal untuk APK yang tidak berasal dari toko aplikasi.
3. Buka app, tempel token bot dari [@BotFather](https://t.me/BotFather), kirim pesan ke bot, lalu tekan **Deteksi Otomatis** untuk mengisi chat ID.

Update berikutnya tidak perlu unduh manual: alert di dalam app menawarkan tombol Perbarui, dan APK diverifikasi SHA-256 sebelum installer dibuka.

## Build dari source

Prasyarat: Node.js 22.11 atau lebih baru, JDK 17, Android SDK dengan platform 37 dan build-tools 37.

```sh
npm install
npm start          # Metro
npm run android    # terminal lain
```

Build APK release tanpa Metro:

```sh
cd android && ./gradlew assembleRelease
```

> [!IMPORTANT]
> Token bot, chat ID, dan passphrase disimpan di keychain atau keystore perangkat lewat `react-native-keychain`, bukan di source atau `.env`. Ketiganya hanya dibaca saat backup atau restore berjalan dan tidak pernah dikirim ke Telegram. Menghapus aplikasi menghapus keychain-nya, jadi simpan passphrase di tempat lain juga.

Pemeriksaan sebelum commit:

```sh
npm test           # Jest
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
```

Ketiganya juga jalan di CI untuk setiap push ke `main` dan setiap pull request.

## Struktur

```
src/
  backup/      scan, chunker, crypto, hasher, manifest, zip, upload retry, runner, restore, drill
  background/  scheduler, foreground service, headless task, notifikasi status, aturan kapan backup jalan
  components/  komponen UI, alert update, modal apa baru, tour latar belakang
  db/          op-sqlite: schema dan repository sessions/files/chunks
  net/         klien Bot API (token selalu di-redact dari error)
  navigation/  root navigator
  screens/     Home, Setup, Restore, Settings, Stats, Troubleshoot
  state/       zustand store (MMKV persist), secure store, riwayat, log error, update, tour
  theme/       token warna terang dan gelap
  update/      self-updater (cek rilis, unduh APK, verifikasi checksum), catatan versi
__tests__/     unit test per modul
```

## Rilis

Rilis otomatis lewat GitHub Actions: push tag `vX.Y.Z`, workflow [`release.yml`](.github/workflows/release.yml) membangun APK bertanda tangan, mengganti namanya jadi `TeleVault-vX.Y.Z.apk`, lalu melampirkan APK dan `SHA256SUMS` ke GitHub Release.

Persiapan sekali saja:

1. Buat upload keystore dan simpan berkas beserta password-nya. Kehilangan keduanya berarti tidak bisa merilis update lagi.

   ```sh
   keytool -genkeypair -v -keystore televault-upload.keystore \
     -alias televault -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Set empat repo secrets di **Settings, Secrets and variables, Actions**:

   | Secret | Isi |
   |---|---|
   | `TELEVAULT_STORE_FILE_B64` | keystore dalam base64 (`base64 -w0 televault-upload.keystore`) |
   | `TELEVAULT_STORE_PASSWORD` | password keystore |
   | `TELEVAULT_KEY_ALIAS` | alias key, misalnya `televault` |
   | `TELEVAULT_KEY_PASSWORD` | password key |

3. Untuk build release lokal, taruh propertinya di `~/.gradle/gradle.properties`, jangan di `android/gradle.properties` yang ikut ter-commit:

   ```properties
   TELEVAULT_STORE_FILE=/absolute/path/televault-upload.keystore
   TELEVAULT_STORE_PASSWORD=...
   TELEVAULT_KEY_ALIAS=televault
   TELEVAULT_KEY_PASSWORD=...
   ```

   Kalau salah satu kosong, build release gagal dan tidak diam-diam memakai debug key.

Rilis versi baru:

```sh
git tag v1.6.2 && git push origin v1.6.2
```

`versionName` dan `versionCode` di-stamp otomatis dari tag. versionCode mengikuti pola semver: `v1.6.2` jadi `10602`.

Checklist lengkap ada di [`docs/release-checklist.md`](docs/release-checklist.md).

## Batasan yang diketahui

- **7z belum didukung**: writer 7z tidak tersedia di Hermes, opsi format ditampilkan tapi nonaktif.
- **49 MB per potongan**: batas Bot API publik, dan 16 MB saat enkripsi aktif demi RAM.
- **Kirim langsung butuh enkripsi mati**: berkas `.enc` tidak bisa dibuka di Telegram.
- **Contacts dan SMS belum ada**: barisnya tampil nonaktif, belum ada pembacanya.
- **Documents kosong tanpa izin Semua file**: Android 11+ menutup folder Download dan Documents publik dari aplikasi biasa, dan pemilih folder bawaan menolak kedua folder itu. Nyalakan **Akses semua file** di Pengaturan, lalu tambahkan foldernya lewat tombol cepat di layar yang sama.
- **Foreground service dibatasi di Android 15+**: backup yang berjalan lebih dari sekitar 6 jam bisa dihentikan sistem.
- **Jadwal global, bukan per folder**: satu jadwal untuk semua kategori terpilih.
- **Jam tertentu butuh izin alarm**: kalau izin dicabut, jadwal turun ke alarm tidak eksak.
- **Mode interval dan charging tidak eksak**: keduanya lewat JobScheduler, jadi Doze dan pembatasan merek bisa menundanya. Jalur charging menambah syarat colokan, jadi bisa lebih lambat lagi.
- **Izin Semua file hanya bisa dinyalakan manual**: Android tidak menyediakan dialog, hanya layar setelan dengan sakelar; app membuka layar itu untukmu.
- **Restore backup lama tanpa `file_id`**: manifest lama (sebelum v2.1) belum menyimpan alamat file; pakai Restore dari folder atau unduh manual.
- **Autostart tidak bisa diaktifkan dari app**: Android tidak menyediakan API-nya, app hanya membuka layar setelan merek.
- **APK debug butuh Metro**: hanya build release yang membundel JavaScript.
- **Package Kotlin masih `com.telebotbackuprn`**: id yang dipasang tetap `com.televault.app`, permanen setelah rilis pertama.

## Detail teknis

- Potongan 49 MB karena batas unggah Bot API publik 50 MB. Saat enkripsi aktif batasnya turun ke 16 MB, karena jalur kripto di JS memegang beberapa salinan satu potongan sekaligus.
- Berkas yang hanya jadi satu potongan diunggah dengan nama aslinya. Berkas yang benar-benar dipecah memakai akhiran `.001`, `.002`, dan restore menerima kedua bentuk nama.
- Manifest versi 2.1 menyimpan nama, ukuran, jumlah potongan, SHA-256 arsip, daftar IV per potongan, dan alamat `file_id` + nomor pesan Telegram tiap potongan — manifest cukup sendiri untuk mengunduh ulang semuanya.
- Jadwal jam tertentu memakai `setAlarmClock`, bentuk alarm yang tidak ditunda Doze dan diperlakukan seperti alarm pengguna oleh pengelola baterai merek. Konsekuensinya ikon alarm tampil di status bar selama jadwal aktif. Tidak ada suara yang dibunyikan app.
- Android 12 ke atas menolak foreground service yang dimulai dari latar belakang, jadi alarm itu sendiri yang memulai service, bukan job periodik.
- Gap antar kiriman mulai dari 1 detik, naik ke jendela `retry_after` saat Bot API membalas 429, lalu turun perlahan lagi.
- Troubleshooting menyimpan 20 entri log terakhir, supaya kegagalan yang tertelan sistem tetap terlihat.

## Kebijakan privasi

Ringkas, tanpa server sisi kami:

- **Tidak ada analitik, iklan, atau telemetri.** App tidak mengumpulkan data penggunaan dan tidak memuat kode pihak ketiga untuk itu.
- **Yang keluar dari HP kamu hanya backup itu sendiri**, dikirim ke chat bot Telegram milikmu lewat Bot API. Kalau enkripsi mati, berkas dikirim apa adanya ke chat itu; kalau enkripsi hidup, yang sampai ke Telegram adalah potongan terenkripsi dan manifest.
- **Kunci tidak pernah ikut.** Passphrase dibaca dari keychain perangkat, dipakai untuk menurunkan kunci, lalu dibuang. Yang tercatat di manifest hanya salt dan daftar IV.
- **Cek pembaruan memanggil `api.github.com` dan mengunduh APK dari `github.com`.** GitHub melihat alamat IP dan user agent untuk permintaan itu, seperti pada kunjungan web biasa. Tidak ada identitas perangkat atau akun yang dikirim; versi terpasang dibaca dari `PackageManager` dan dibandingkan di sisi app.
- **Semua state app ada di perangkat**: SQLite (sesi, berkas, potongan), MMKV (pengaturan dan catatan penjadwalan), keychain (token bot, chat ID, passphrase). Tidak ada sinkronisasi ke layanan kami karena tidak ada layanan kami.
- **Ekspor CSV memakai share sheet Android**, jadi kamu yang memilih tujuannya.
- **Penghapusan data**: hapus pesan di chat Telegram, lalu uninstall app. Tidak ada akun atau basis data sisi kami yang perlu dihapus.

Izin yang diminta dan alasannya:

| Izin | Alasan |
|---|---|
| `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` | Membaca galeri untuk kategori Photos dan Videos |
| `READ_EXTERNAL_STORAGE` (Android 12 ke bawah) | Membaca folder yang sama di versi Android lama |
| `MANAGE_EXTERNAL_STORAGE` (opsional, sakelar manual) | Membaca folder Download dan Documents publik, yang ditutup Android 11+ |
| `INTERNET`, `ACCESS_NETWORK_STATE` | Mengunggah ke Bot API dan memeriksa apakah koneksi berbayar |
| `POST_NOTIFICATIONS` | Notifikasi status dan progres backup |
| `FOREGROUND_SERVICE` dan `FOREGROUND_SERVICE_DATA_SYNC` | Backup tetap jalan saat app di latar belakang |
| `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `USE_EXACT_ALARM` | Menjaga jadwal tetap bangun, termasuk setelah reboot |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Membuka dialog pengecualian baterai, karena pembatasan merek menunda jadwal |
| `REQUEST_INSTALL_PACKAGES` | Memasang APK saat kamu menekan Perbarui |

## Hak cipta dan lisensi

Copyright (c) 2026 ryznoxy. Semua hak dilindungi.

- Source code, logo, dan nama TeleVault adalah karya proyek ini. Belum ada lisensi publik; mengunduh APK untuk dipakai sendiri di perangkatmu dipersilakan, membagikan build hasil modifikasi atas nama TeleVault tidak.
- Komponen pihak ketiga tetap di bawah lisensinya masing-masing: React Native dan Hermes (MIT), `react-native-background-fetch` (MIT), `react-native-background-actions` (MIT), `react-native-blob-util` (MIT), `@react-native-documents/picker` (MIT), `react-native-keychain` (MIT), `react-native-mmkv` dan Nitro Modules (MIT), `op-sqlite` (MIT), `zustand` (MIT), `@noble/ciphers` dan `@noble/hashes` (MIT).
- Telegram adalah merek dagang Telegram Messenger. Aplikasi ini tidak berafiliasi, tidak disponsori, dan tidak diperiksa oleh Telegram maupun Google.
- APK ditandatangani upload key proyek. Build dengan penanda tangan lain tidak bisa dipasang di atas instalasi yang ada, jadi hanya rilis di halaman Releases yang kompatibel satu sama lain.

---

<div align="center">

<sub>TeleVault: backup kamu, kunci kamu, channel kamu.</sub>

<sub><b>VibeCoded App</b> - dibangun bersama agen AI, bukan diketik sendirian.</sub>

</div>

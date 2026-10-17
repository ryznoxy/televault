# Checklist rilis

Dipakai sekali per rilis. Centang berurutan; jangan lompat ke Play Console sebelum bagian "Uji di device" selesai.

## 1. Kode

- [ ] `npm ci` bersih (lockfile cocok dengan `package.json`)
- [ ] `npm run typecheck` → 0 error
- [ ] `npm test` → semua lulus
- [ ] `npm run lint` → 0 error (warning lama boleh)
- [ ] `graphify update .` lalu commit `graphify-out/` kalau berubah
- [ ] Tidak ada `TODO`/`console.log` baru di `src/`
- [ ] Versi naik: `versionCode` +1 dan `versionName` di `android/app/build.gradle`, `version` di `package.json`, `MARKETING_VERSION` di Xcode

## 2. Build Android

- [ ] Empat properti `TELEVAULT_*` ada di `~/.gradle/gradle.properties` (bukan di repo)
- [ ] `cd android && ./gradlew bundleRelease` → BUILD SUCCESSFUL
- [ ] AAB ada di `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Sertifikat AAB/APK adalah upload key, bukan debug:
      `apksigner verify --print-certs app-release.apk` → SHA-256 bukan `FA:C6:17:...:3B:9C`
- [ ] `aapt2 dump badging app-release.apk | Select-String package` → `com.televault.app`, versi benar
- [ ] `aapt2 dump permissions app-release.apk` → tidak ada `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, `USE_BIOMETRIC`, `WRITE_EXTERNAL_STORAGE`
- [ ] Ikon launcher bukan robot React Native (violet + gembok), ikon adaptif bulat benar di Android 8+
- [ ] Upload key + password tersimpan di dua tempat (password manager + cadangan offline). Hilang = tidak bisa merilis update lagi.

## 3. Uji di device (wajib, tidak bisa didelegasikan)

Siapkan satu HP fisik dengan galeri berisi: 1 foto kecil, 1 video >49 MB, 1 dokumen PDF.

- [ ] Setup: token bot + chat ID valid → tes koneksi hijau
- [ ] Backup tanpa enkripsi: foto + video >49 MB → potongan terkirim, manifest + skrip `.sh`/`.bat` muncul di chat
- [ ] Backup dengan enkripsi (passphrase kuat) → manifest berisi `ivs` sepanjang jumlah potongan
- [ ] Restore hasil backup terenkripsi: pilih potongan + manifest → status per berkas `ok`, hash cocok, file terbuka
- [ ] Restore hasil backup tanpa enkripsi → idem
- [ ] Restore dari file yang diunduh ulang lewat Telegram (nama file bisa diubah) → tetap ketemu potongannya
- [ ] Dua berkas bernama sama (`IMG_0001.jpg` di dua folder, zip dimatikan) → dua entri berbeda di manifest
- [ ] Izin: Android 13+ minta izin foto/video, lalu minta izin notifikasi saat menekan Backup
- [ ] Notifikasi foreground service muncul selama backup
- [ ] Jadwal (interval 15 menit) jalan saat app ditutup → sesi baru muncul di History
- [ ] Wifi-only aktif → backup menolak jalan di data seluler
- [ ] App di-kill saat backup → buka lagi, tidak ada sesi "running" menggantung
- [ ] HP RAM 2 GB: backup galeri besar dengan enkripsi → tidak OOM (pantau di logcat `FATAL EXCEPTION`)
- [ ] Rotasi layar + dark mode sistem tidak merusak tata letak

## 4. Play Console

- [ ] App content: Data safety (data apa yang dikirim ke Telegram, terenkripsi, tidak dibagikan ke pihak ketiga)
- [ ] Privacy policy URL aktif (wajib karena app mengakses foto/dokumen)
- [ ] Content rating kuesioner
- [ ] Target audience + ads declaration (tidak ada iklan)
- [ ] Ikon 512×512, feature graphic 1024×500, minimal 4 screenshot ponsel
- [ ] Short description + full description (sebutkan: backup terenkripsi ke chat Telegram pribadi, butuh bot token sendiri)
- [ ] Track: internal testing dulu → closed testing → production
- [ ] Upload AAB, isi release notes, rollout 20% → 100%

## 5. iOS (belum untuk rilis ini)

- [ ] `bundle install && bundle exec pod install`
- [ ] Signing team di Xcode, `com.televault.app`
- [ ] Archive + TestFlight, uji ulang bagian 3 di iPhone
- [ ] App Privacy questionnaire (foto, dokumen)

## 6. Setelah rilis

- [ ] Tag `v<version>` di `main`
- [ ] Simpan AAB + mapping (kalau minify dinyalakan) untuk deobfuscation crash
- [ ] Pantau crash/ANR Play Console 48 jam pertama
- [ ] Kalau ada bug: perbaiki di branch baru, jangan menimpa tag rilis

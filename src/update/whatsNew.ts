/**
 * Release notes shown in the "what's new" modal after an update. Keyed by
 * version (without the `v` prefix). Only versions listed here get a modal;
 * older or unlisted installs just update silently.
 */
export type WhatsNew = {
  title: string;
  items: string[];
};

export const WHATS_NEW: Record<string, WhatsNew> = {
  '1.5.4': {
    title: 'Apa baru di v1.5.4',
    items: [
      'App bisa dibuka lagi: v1.5.3 berhenti saat start sebelum jendela sempat muncul',
      'Alert pembaruan tampil di atas semua layar, dengan tombol Perbarui dan Nanti',
      'Rilis yang ditemukan tetap ditampilkan walau app di-restart',
      'Ikon notifikasi backup kembali rapi di status bar',
    ],
  },
  '1.5.3': {
    title: 'Apa baru di v1.5.3',
    items: [
      'Alert pembaruan kini muncul di atas, di semua layar, dengan tombol Perbarui dan Nanti',
      'Rilis yang ditemukan tetap ditampilkan walau app di-restart, dan hilang sendiri setelah versinya dipasang',
      'Cek Pembaruan di Pengaturan memunculkan alert lagi walau sebelumnya sudah ditutup',
      'Ikon notifikasi backup kembali rapi di status bar',
    ],
  },
  '1.5.2': {
    title: 'Apa baru di v1.5.2',
    items: ['Ikon aplikasi baru'],
  },
  '1.5.1': {
    title: 'Apa baru di v1.5.1',
    items: [
      'Alarm jadwal memakai bentuk alarm jam, jadi tidak ditahan Doze atau penghemat baterai merek',
      'Alarm dipasang ulang sendiri setelah HP restart atau jam berubah',
      'Troubleshooting kini menyebut sumber bangun: alarm eksak atau JobScheduler',
    ],
  },
  '1.5.0': {
    title: 'Apa baru di v1.5.0',
    items: [
      'Tombol Hentikan: berhentikan backup yang sedang jalan dari layar Utama atau dari notifikasi',
      'Progres backup otomatis tetap terlihat di layar Utama walau app baru dibuka',
      'Jeda kirim adaptif supaya Bot API tidak kena rate limit, dan potongan tidak dilewati saat 429',
    ],
  },
  '1.4.0': {
    title: 'Apa baru di v1.4.0',
    items: [
      'Batas berkas per backup kini benar-benar per backup, bukan per kategori',
      'Kategori Dokumen bisa diarahkan ke folder pilihan lewat Pengaturan, jadi berkasnya benar-benar terbaca',
      'Rasio Keberhasilan dan "backup terakhir" menghitung run partial, bukan hanya yang sukses penuh',
    ],
  },
  '1.3.3': {
    title: 'Apa baru di v1.3.3',
    items: [
      'Perbaikan: backup otomatis di Android 12 ke atas dulu diam-diam gagal saat aplikasi di latar belakang',
      'Jadwal jam tertentu kini memakai alarm eksak, jadi benar-benar jalan di jam yang dipilih',
      'Kegagalan penjadwalan tercatat di log Troubleshooting, tidak hilang tanpa jejak',
      'Troubleshooting menampilkan kapan sistem terakhir membangunkan aplikasi',
    ],
  },
  '1.3.2': {
    title: 'Apa baru di v1.3.2',
    items: [
      'Deteksi versi kini membaca data asli Android — banner pembaruan akhirnya berfungsi',
      'Versi terpasang tampil di Pengaturan > Aplikasi',
      'Tur persiapan latar belakang: bebas optimasi baterai + autostart',
      'Notifikasi status permanen saat backup otomatis aktif',
      'Cek pembaruan otomatis paling sering 1 jam sekali',
      'Uji Pemulihan memilih arsip yang potongannya benar-benar tersedia',
    ],
  },
  '1.3.0': {
    title: 'Apa baru di v1.3.0',
    items: [
      'Kecepatan & estimasi waktu selesai saat backup berjalan',
      'Banner pembaruan tetap ada saat pindah halaman, dengan tombol batal',
      'Uji Pemulihan: buktikan backup bisa dipulihkan (Troubleshooting)',
      'Cek pembaruan manual di Pengaturan',
      'Log error ringan di Troubleshooting',
      'Perbaikan warna toggle, progress bar, dan kontras dark mode',
    ],
  },
};

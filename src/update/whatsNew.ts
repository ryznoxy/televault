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
  '1.7.0': {
    title: 'Apa baru di v1.7.0',
    items: [
      'Ganti HP jadi mudah: tekan "Impor manifest dari Telegram", kirim manifest ke bot, semua foto/video terunduh otomatis',
      'Backup baru kini default di-zip jadi satu arsip; mode kirim langsung tetap bisa dinyalakan di Pengaturan',
      'Restore dari folder: tunjuk folder backup lama di HP, file dicocokkan otomatis lewat nama dan hash',
      'Manifest kini menyimpan alamat file di Telegram, jadi restore tetap jalan walau database lokal hilang',
      'Uji Pemulihan lebih cermat: cukup cek satu arsip utuh terkecil, sesi yang potongannya kurang dilewati',
      'Izin folder yang dicabut Android kini memunculkan pesan jelas: pilih ulang folder di Pengaturan',
    ],
  },
  '1.6.4': {
    title: 'Apa baru di v1.6.4',
    items: [
      'Jadwal kini punya toggle "Hanya saat Charging": keempat frekuensi tetap, dan backup hanya jalan saat HP dicas',
      'Izin "Akses semua file" di Pengaturan: kategori Dokumen dan folder Download/Documents publik akhirnya bisa dibaca',
      'Alarm yang ditolak sistem tidak lagi mematikan aplikasi, dan jadwal besok tetap terpasang',
      'Tombol Perbarui di alert pembaruan kini biru, sewarna kartunya, bukan ungu',
    ],
  },
  '1.6.3': {
    title: 'Apa baru di v1.6.3',
    items: [
      'Pengaturan jadwal kini punya pilihan Hanya saat charging dan Manual, di samping Tiap Jam, Harian, Mingguan, dan 15 Menit',
      'Notifikasi status menghitung backup yang selesai sebagian, jadi tidak lagi menulis "belum pernah berjalan" padahal Riwayat berisi',
    ],
  },
  '1.6.2': {
    title: 'Apa baru di v1.6.2',
    items: [
      'Foto dan video yang cukup satu potongan dikirim dengan nama aslinya, jadi tampil dengan pratinjau di Telegram',
      'Opsi "Hanya Wi-Fi" sekarang benar-benar dipatuhi: backup ditolak saat memakai data seluler, termasuk backup terjadwal',
      'Notifikasi status tidak lagi memakai ikon besar kotak hitam',
    ],
  },
  '1.6.1': {
    title: 'Apa baru di v1.6.1',
    items: [
      'Batas kirim langsung dibatasi 45 MB, karena di atas itu berkas dipecah jadi beberapa potongan',
      'Saat enkripsi aktif, kirim langsung dinonaktifkan: berkas .enc tidak bisa dibuka di Telegram',
    ],
  },
  '1.6.0': {
    title: 'Apa baru di v1.6.0',
    items: [
      'Foto & video kecil dikirim langsung ke Telegram, sisanya di-zip; batas ukurannya bisa diatur di Pengaturan',
      'Ikon notifikasi memakai logo baru',
      'Troubleshooting: ketuk "Kegagalan terakhir" untuk lihat alasan lengkap',
      'Pengaturan folder Dokumen dihapus; folder dokumen publik tidak bisa dibaca di Android 11+',
    ],
  },
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

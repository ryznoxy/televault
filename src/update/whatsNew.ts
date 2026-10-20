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

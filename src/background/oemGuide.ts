/**
 * Autostart paths per OEM. Android exposes no API to turn autostart on, so the
 * app can only send the user to the right screen and show the path. Brands are
 * matched by Build.MANUFACTURER, which is why the keys are substrings.
 */
export type OemGuide = {
  oem: string;
  keys: string[];
  path: string;
};

export const OEM_GUIDE: OemGuide[] = [
  {
    oem: 'Xiaomi / Redmi / POCO',
    keys: ['xiaomi', 'redmi', 'poco'],
    path: 'Setelan > Aplikasi > Kelola > Autostart AKTIF',
  },
  {
    oem: 'Oppo / Realme',
    keys: ['oppo', 'realme'],
    path: 'Setelan > Baterai > Manajemen baterai > Izinkan latar belakang',
  },
  {
    oem: 'Samsung',
    keys: ['samsung'],
    path: 'Setelan > Aplikasi > Baterai > Tanpa batas',
  },
  {
    oem: 'Huawei / Honor',
    keys: ['huawei', 'honor'],
    path: 'Setelan > Aplikasi > Peluncuran aplikasi > Manual > aktifkan semua',
  },
  {
    oem: 'OnePlus',
    keys: ['oneplus'],
    path: 'Setelan > Baterai > Optimasi baterai > Jangan optimalkan',
  },
  {
    oem: 'Vivo / iQOO',
    keys: ['vivo', 'iqoo'],
    path: 'Setelan > Baterai > Latar belakang > Izinkan',
  },
];

/** Guide entry for the current device, or undefined on an unlisted brand. */
export function guideFor(manufacturer: string | undefined): OemGuide | undefined {
  const brand = (manufacturer ?? '').toLowerCase();
  return OEM_GUIDE.find(entry => entry.keys.some(key => brand.includes(key)));
}

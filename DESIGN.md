# TeleVault — Design System

Dokumen desain aplikasi TeleVault (React Native), terinspirasi dari visual dashboard finansial modern: layout modular, statistik yang mudah dipindai, kartu dengan hierarki jelas, dan navigasi bawah yang konsisten.

Seluruh design token dikelola di src/theme/theme.ts, sedangkan komponen bersama berada di src/components/ui.tsx.

Aturan utama: tidak ada warna, font, radius, spacing, atau elevation yang di-hardcode di layar. Semua harus menggunakan token dari theme.

1. Arah Desain
Konsep visual
Style: Modern Fintech Dashboard — minimal, terstruktur, dan informatif.
Layout: Modular card-based layout, terinspirasi dari dashboard Finance dan Target pada referensi.
Karakter: Clean, compact, rounded, dengan pemisahan konten yang jelas.
Aksen utama: Telegram Blue #229ED9.
Warna pendukung: Netral terang, navy ink, dan violet untuk visualisasi data atau status sekunder.
Tipografi: Plus Jakarta Sans.
Mode: Light-first, dengan dark mode melalui ThemeProvider.
Platform: React Native, Android dan iOS.
Prinsip desain
Information first — nominal, status, dan informasi penting harus mudah ditemukan.
Card-based hierarchy — kelompokkan informasi berdasarkan fungsi, bukan dengan banyak divider.
Compact but breathable — tampilkan lebih banyak informasi tanpa membuat layar terasa padat.
Consistent surfaces — semua kartu, tombol, dan navigasi menggunakan sistem token yang sama.
Subtle emphasis — gunakan warna aksen seperlunya, bukan gradient, glow, atau dekorasi berlebihan.
Security by design — identitas E2EE dan status keamanan tetap mudah dikenali.

Referensi visual digunakan sebagai inspirasi struktur dan hierarki, bukan untuk menyalin warna, logo, atau branding aplikasi lain.

2. Struktur Layout
2.1 Screen background

Setiap layar menggunakan background dari theme sesuai konteksnya.

Background umum menggunakan themes.light.bg atau themes.dark.bg.
Kartu utama menggunakan themes.light.surface atau themes.dark.surface.
Kartu sekunder dan inset menggunakan surfaceAlt.
Konten disusun dalam satu kolom dengan jarak antarbagian yang konsisten.
Safe area wajib diperhitungkan pada header dan bottom navigation.
2.2 Dashboard pattern

Layout dashboard mengadaptasi pola visual pada referensi:

App header dengan judul halaman dan aksi utama.
Hero section untuk informasi terpenting.
Summary cards untuk metrik atau status.
Detail section untuk aktivitas, perangkat, atau transaksi.
Bottom navigation yang selalu konsisten.

Pola ini boleh digunakan pada Home dan layar ringkasan lainnya. Jangan memaksakan seluruh bagian ke setiap layar.

2.3 Card hierarchy
Jenis kartu	Fungsi	Style
Hero Card	Informasi utama atau status keamanan	RADIUS.xl
Summary Card	Statistik dan ringkasan	RADIUS.lg
Standard Card	Informasi perangkat atau aktivitas	RADIUS.lg
Compact Card	Item kecil atau metadata	RADIUS.md
Inset Container	Informasi tambahan di dalam kartu	RADIUS.md

Semua radius wajib mengambil nilai dari RADIUS. Dilarang menggunakan borderRadius literal pada layar.

2.4 Grid
Gunakan dua kolom untuk statistik yang setara dan cukup ringkas.
Gunakan satu kolom untuk konten yang membutuhkan deskripsi panjang.
Gunakan grid dua kolom hanya jika lebar perangkat mencukupi.
Pada perangkat kecil, kartu harus dapat beralih menjadi satu kolom.
Gap antar-kartu menggunakan SPACE.md atau SPACE.base.
Hindari tinggi kartu yang dipaksakan jika konten memiliki panjang dinamis.
3. Tipografi — Plus Jakarta Sans

Semua teks aplikasi menggunakan Plus Jakarta Sans dengan pemetaan font family berdasarkan bobot.

Bobot	Font family
400	PlusJakartaSans-Regular
500	PlusJakartaSans-Medium
600	PlusJakartaSans-SemiBold
700	PlusJakartaSans-Bold
800	PlusJakartaSans-ExtraBold
3.1 Type scale
Token	Size	Weight	Tracking	Pemakaian
display	28	700	-0.6	Judul hero dan ringkasan utama
title	20	700	-0.3	Judul kartu dan angka statistik
headline	17	600	0	Judul section dan item
body	16	400	0	Teks isi
label	15	500	0	Label form dan informasi
footnote	13	400	0	Metadata dan keterangan
caption	12	600	0.4	Status kecil dan label tambahan
3.2 Typography rules
Gunakan TYPE.display untuk satu pesan utama per layar, bukan semua judul.
Nominal atau metrik utama dapat memakai TYPE.title.
Judul section harus konsisten dan tidak terlalu besar.
Metadata menggunakan warna muted, bukan opacity acak.
Angka penting harus mudah dipindai dan menggunakan alignment yang konsisten.
Hindari terlalu banyak variasi ukuran font dalam satu kartu.
Wordmark TeleVault menggunakan ukuran 24, bobot 700, tracking -0.5.

Seluruh ukuran dan bobot yang digunakan komponen harus berasal dari token TYPE atau token tipografi tambahan yang didefinisikan secara terpusat.

4. Color System
4.1 Telegram palette — Home dan navigasi
Token	Hex	Fungsi
TG.bg	#F8F9FF	Background Home
TG.card	#FFFFFF	Permukaan kartu
TG.low	#EFF4FF	Background indikator aktif
TG.container	#E5EEFF	Container berwarna
TG.high	#DCE9FF	Surface dengan emphasis
TG.highest	#D3E4FE	Inset dan state terpilih
TG.primary	#00658E	Aksen teks dan ikon
TG.primaryContainer	#229ED9	Aksen Telegram utama
TG.onPrimaryContainer	#003147	Teks pada container aksen
TG.ink	#0B1C30	Teks utama
TG.secondary	#565E74	Teks sekunder
TG.outline	#6F7880	Ikon dan elemen pasif
TG.primaryFixed	#C7E7FF	Container highlight
TG.error	#BA1A1A	Error
TG.errorSoft	Existing token	Background error lembut
4.2 General theme palette
Token	Light	Dark
bg	#F4F4F7	#0B0B0F
surface	#FFFFFF	#16161B
surfaceAlt	#EFEFF4	#1F1F26
ink	#111114	#F5F5F7
muted	#6B6B76	#9A9AA4
faint	#9A9AA4	#6B6B76
border	Ink 8% opacity	White 10% opacity
accent	#5B5BF0	#7C7CFF
success	#22A06B	#34C77B
warn	#C77F16	#E0A62B
danger	#D8383D	#FF6369
4.3 Color usage rules
Telegram Blue adalah warna identitas utama TeleVault.
Violet boleh dipakai sebagai aksen sekunder untuk chart, data visualization, atau status tertentu.
Jangan menggunakan violet sebagai pengganti warna identitas Telegram di seluruh aplikasi.
Success, warning, dan danger hanya digunakan untuk status yang relevan.
Background tidak menggunakan hitam atau putih murni sebagai warna tema umum.
Jangan menulis nilai hex atau RGBA langsung di komponen layar.
Jangan mengandalkan warna saja untuk menyampaikan status; sertakan teks atau ikon.
4.4 Accent discipline

Distribusi visual yang disarankan:

70% permukaan netral.
20% struktur, teks, dan border.
10% aksen dan status.

Angka tersebut merupakan panduan visual, bukan pembatasan warna secara matematis.

5. Spacing System

Gunakan grid spacing 8-point melalui konstanta SPACE.

Token	Nilai	Pemakaian
xs	4	Jarak ikon dengan teks
sm	8	Jarak elemen berdekatan
md	12	Padding komponen compact
base	16	Padding kartu standar
lg	24	Jarak antar-section
xl	32	Jarak besar atau area hero
Rules
Padding kartu standar menggunakan SPACE.base.
Kartu compact menggunakan SPACE.md jika sesuai.
Jarak antar-section menggunakan SPACE.lg.
Jarak antar-kartu dalam grid menggunakan SPACE.md.
Padding horizontal layar harus konsisten antar-screen.
Jangan membuat token baru untuk variasi yang sebenarnya sudah dapat ditangani SPACE.
Jika diperlukan ukuran baru, tambahkan ke theme dan dokumentasikan penggunaannya.
6. Radius System

Semua sudut menggunakan sistem soft-rounded.

Token	Nilai	Pemakaian
RADIUS.sm	10	Badge, chip, elemen compact
RADIUS.md	14	Tombol, input, kartu kecil
RADIUS.lg	18	Kartu standar
RADIUS.xl	22	Hero card dan kartu besar
Rules
Dilarang menggunakan rounded full atau radius 999.
Dilarang memakai borderRadius angka literal di screen.
Jangan mencampur banyak radius dalam satu kelompok kartu yang setara.
Gunakan radius berdasarkan hierarki komponen.
Komponen dengan fungsi sama wajib memakai radius yang sama.
Radius system tetap ditegakkan melalui __tests__/theme.test.ts.

Bentuk tombol dan badge tetap rounded, tetapi tidak boleh berubah menjadi kapsul penuh.

7. Elevation dan Border
Elevation tokens
Token	Shadow opacity / radius	Elevation	Pemakaian
card	0.06 / 16	3	Kartu utama
float	0.22 / 24	12	Floating navigation dan toast
Rules
Gunakan shadow ringan untuk membedakan surface dari background.
Jangan menambahkan shadow ke setiap kartu jika perbedaan warna surface sudah cukup.
Jangan menggunakan glow atau colored shadow dekoratif.
Gunakan border hairline untuk pemisahan yang subtil.
Border harus mengambil warna dari theme.
Hindari kombinasi border kontras tinggi dan shadow berat pada satu elemen.
8. Komponen Inti — src/components/ui.tsx
8.1 AppHeader

Header utama aplikasi menampilkan:

Wordmark TeleVault, 24px Bold.
Label E2EE sebagai penanda keamanan.
Subtitle atau judul screen jika diperlukan.
Tombol back opsional.
Action button opsional untuk fungsi utama layar.

Ketentuan:

Tidak memakai avatar atau logo tile dekoratif.
Safe-area top wajib diperhitungkan.
Tombol back menggunakan container 40px dengan RADIUS.md.
Ikon memakai TgIcon.
Semua warna dan spacing membaca theme.
8.2 SectionLabel

Judul section untuk membagi informasi dalam dashboard.

Judul menggunakan TYPE.headline.
Action seperti See all menggunakan TYPE.footnote.
Warna judul menggunakan token ink.
Action menggunakan token aksen atau muted, sesuai tingkat kepentingannya.
Jarak atas dan bawah mengikuti SPACE.
8.3 SummaryCard

Kartu ringkasan untuk menampilkan status atau angka penting.

Struktur umum:

Label kecil.
Nilai utama.
Keterangan opsional.
Ikon atau status opsional.

Ketentuan:

Background menggunakan token surface.
Radius menggunakan RADIUS.lg.
Padding menggunakan SPACE.base.
Nilai utama menggunakan TYPE.title.
Teks pendukung menggunakan TYPE.footnote.
Jangan menampilkan terlalu banyak metrik dalam satu kartu.
8.4 HeroCard

Kartu dengan emphasis tertinggi dalam satu section.

Contoh penggunaan:

Status keamanan akun.
Status enkripsi.
Ringkasan identitas atau key.
Informasi setup yang perlu ditindaklanjuti.

Ketentuan:

Gunakan RADIUS.xl.
Maksimal satu emphasis utama per section.
Gunakan background aksen hanya jika memperjelas prioritas.
Pastikan kontras teks memenuhi WCAG AA.
Jangan menggunakan gradient atau glow.
8.5 ActivityItem

Item untuk aktivitas terbaru, riwayat setup, atau perubahan status.

Struktur:

Ikon aktivitas.
Judul aktivitas.
Subtitle atau timestamp.
Status opsional.

Ketentuan:

Tinggi item mengikuti konten.
Gunakan divider subtil jika dibutuhkan.
Teks utama memakai TYPE.label atau TYPE.body.
Metadata memakai TYPE.footnote.
Status harus mempunyai label yang dapat dibaca screen reader.
8.6 PrimaryButton dan SecondaryButton

Primary button:

Menggunakan warna aksen utama.
Label menggunakan bobot SemiBold.
Memiliki pressed feedback.
Menggunakan RADIUS.md.

Secondary button:

Menggunakan surface atau container netral.
Border opsional dari theme.
Tidak boleh bersaing secara visual dengan primary button.

Semua tombol harus memiliki state disabled, pressed, dan loading bila relevan.

8.7 IconToggleRow

Baris pengaturan atau opsi yang memiliki ikon dan kontrol di sisi kanan.

Ikon menggunakan TgIcon.
Judul menggunakan TYPE.label.
Deskripsi menggunakan TYPE.footnote.
Tinggi minimum mengikuti target sentuh aksesibel.
State aktif dan nonaktif tidak hanya dibedakan melalui warna.
8.8 PulsingDot dan Toast

PulsingDot digunakan untuk status live atau proses yang benar-benar aktif. Jangan menggunakannya sebagai dekorasi.

Toast:

Menggunakan theme-aware surface.
Memiliki teks yang ringkas.
Memiliki status atau ikon yang relevan.
Menggunakan elevation float bila tampil di atas konten.
Tidak menutupi navigasi atau kontrol penting.
9. Bottom Navigation

Bottom navigation terdiri dari empat tab:

Utama — ikon grid.
Setup Key — ikon key.
Pengaturan — ikon tune.
Riwayat — ikon history.
Visual behavior
Background light: rgba(255,255,255,0.94).
Background dark: rgba(16,16,20,0.92).
Border atas menggunakan hairline.
Padding bawah mengikuti safe-area.
Tab aktif menggunakan container TG.low.
Ikon aktif menggunakan TG.primaryContainer.
Label aktif menggunakan SemiBold.
Ikon dan label idle menggunakan TG.secondary.
Rules
Menggunakan tablist dan tab accessibility roles.
Setiap tab mempunyai accessible label.
Label tidak boleh terpotong atau menyusut.
Target sentuh harus nyaman digunakan.
Indikator aktif memakai bentuk rounded sesuai RADIUS.md, bukan pill penuh.
Navigasi harus konsisten di seluruh screen utama.
Dark mode harus mengikuti theme.
10. Icon System

Gunakan satu keluarga ikon internal melalui TgIcon.

Stroke 2px.
Bentuk garis sederhana dan konsisten.
Tidak menggunakan emoji sebagai ikon UI.
Tidak menggunakan library ikon eksternal.
Ukuran ikon mengambil token atau ukuran standar komponen.
Ikon dekoratif tidak boleh mengambil alih hierarki teks.

Ikon harus mempunyai makna yang jelas dan tidak hanya berfungsi sebagai dekorasi.

11. Chart dan Data Visualization

Terinspirasi dari grafik sederhana pada dashboard referensi, TeleVault dapat menggunakan visualisasi data untuk informasi yang memang membutuhkan ringkasan visual.

Contoh:

Aktivitas setup key dari waktu ke waktu.
Jumlah perangkat terhubung.
Riwayat proses enkripsi.
Distribusi status verifikasi.
Rules
Gunakan garis sederhana dan minim grid.
Warna seri utama menggunakan token aksen.
Seri sekunder memakai warna pendukung yang telah ditentukan di theme.
Label sumbu dan keterangan menggunakan token tipografi kecil.
Hindari efek 3D, gradient, dan shadow dekoratif.
Chart harus mempunyai label atau ringkasan tekstual yang aksesibel.
Jangan menampilkan grafik jika data terlalu sedikit untuk memberi informasi bermakna.
Warna chart harus mendukung light dan dark mode.

Chart bukan elemen wajib pada Home. Prioritaskan status keamanan dan tindakan utama aplikasi.

12. Aksesibilitas dan Interaksi
Kontras teks utama memenuhi WCAG AA.
Target sentuh kecil harus mempunyai hitSlop minimal 8.
Feedback tekan menggunakan opacity atau scale yang subtil.
Tombol mempunyai label aksesibilitas yang jelas.
Navigasi menggunakan accessibility roles.
Status keamanan harus dijelaskan melalui teks, bukan warna saja.
Loading, error, empty state, dan success harus memiliki representasi yang jelas.
Jangan mengandalkan animasi untuk menyampaikan informasi penting.
Teks tidak boleh terpotong secara tidak sengaja.
Layout harus mendukung ukuran layar kecil dan font scaling yang wajar.
Animasi harus menghormati preferensi reduced motion jika didukung implementasi.
13. Dark Mode

Dark mode tersedia melalui ThemeProvider dan preferensi tema disimpan menggunakan MMKV.

Rules
Semua surface membaca token themes.dark.
Teks utama menggunakan token ink.
Teks sekunder menggunakan muted.
Border menggunakan token border.
Aksen menyesuaikan nilai accent atau palet Telegram yang sesuai.
Bottom navigation mengikuti mode aktif.
Shadow dikurangi jika tidak efektif pada background gelap.
Tidak boleh ada warna light mode yang di-hardcode di komponen.
Semua komponen baru wajib diuji dalam light dan dark mode.

Catatan: palet TG pada Home masih light-only sampai implementasi dark mode khusus Telegram selesai.

14. Screen Design Guidelines
Home

Urutan prioritas:

AppHeader dan identitas TeleVault.
Hero status keamanan atau setup.
Summary cards untuk status penting.
Aktivitas terbaru.
Bottom navigation.

Home harus memberi gambaran kondisi aplikasi dalam sekali lihat. Jangan memenuhi layar dengan statistik yang tidak membantu keputusan pengguna.

Setup Key
Fokus pada satu alur setup utama.
Tampilkan status langkah dengan jelas.
Gunakan card untuk informasi key dan instruksi.
Pisahkan tindakan utama dari tindakan sekunder.
Tampilkan peringatan sebelum tindakan sensitif.
Pengaturan
Kelompokkan pengaturan berdasarkan kategori.
Gunakan IconToggleRow dan komponen form bersama.
Beri deskripsi singkat pada pengaturan keamanan yang penting.
Hindari membuat setiap baris menjadi kartu terpisah jika daftar lebih mudah dipindai.
Riwayat
Gunakan ActivityItem untuk setiap entri.
Urutkan aktivitas secara kronologis.
Tampilkan timestamp dan status secara konsisten.
Sediakan empty state ketika belum ada aktivitas.
15. Implementasi dan Aturan Kode
Source of truth
Theme tokens: src/theme/theme.ts
Shared components: src/components/ui.tsx
Theme persistence: MMKV melalui ThemeProvider
Theme validation: __tests__/theme.test.ts
Wajib dilakukan
Impor token dari theme.
Gunakan komponen bersama sebelum membuat komponen baru.
Tambahkan token ke theme jika benar-benar diperlukan.
Pastikan semua screen mendukung dark mode jika screen tersebut menggunakan general theme.
Uji radius dan penggunaan token.
Verifikasi layout pada ukuran layar kecil.
Pastikan komponen interaktif memiliki accessibility label.
Pertahankan konsistensi visual antara screen.
Dilarang dilakukan
Hardcode hex color di screen.
Hardcode spacing atau borderRadius di screen.
Menggunakan rounded full atau radius 999.
Menambahkan gradient dekoratif atau glow.
Menggunakan emoji sebagai ikon UI.
Membuat palet warna baru hanya untuk satu screen.
Membuat komponen serupa tanpa memeriksa src/components/ui.tsx.
Menggunakan warna untuk menyampaikan status tanpa label pendukung.
Membuat layout desktop-style yang memaksa banyak kolom pada ponsel kecil.
16. Status Implementasi
Item	Status
Font Android + type scale global	Selesai
Radius system tanpa rounded full	Selesai
Radius validation melalui test	Selesai
BottomNav theme-aware	Selesai
Design direction card-based dashboard	Pedoman desain
Standardisasi SummaryCard dan HeroCard	Perlu audit implementasi
Konsistensi chart tokens	Perlu audit implementasi
Font iOS (UIAppFonts + Xcode target)	Belum
Dark mode khusus palet TG	Belum
Verifikasi visual di perangkat	Belum

Status di atas merupakan baseline dokumentasi dan bukan klaim bahwa semua komponen sudah tersedia di kode.

17. Final Design Principles

TeleVault menggunakan pendekatan Modern Fintech Dashboard × Secure Messaging.

Hasil akhirnya harus terasa modern dan terstruktur seperti dashboard finansial pada referensi, tetapi tetap sederhana, berorientasi keamanan, dan mudah dipakai.

Prioritas desain:

Informasi utama mudah ditemukan.
Hierarki kartu konsisten.
Telegram Blue tetap menjadi identitas visual.
Tipografi dan spacing konsisten.
Radius dan warna dikendalikan oleh token.
Light dan dark mode tidak saling bertentangan.
Aksesibilitas menjadi bagian dari komponen, bukan tambahan belakangan.

Golden rule: desain boleh berkembang, tetapi setiap keputusan visual harus tetap menggunakan sistem token TeleVault dan memperkuat pengalaman pengguna yang aman, jelas, dan konsisten.

# UI / UX Guidelines
- Kurangi penggunaan class `font-black` dan `font-bold` agar tampilan aplikasi terasa lebih "native" dan elegan. Gunakan `font-medium` atau `font-semibold` sewajarnya.
- Pastikan menggunakan font berjenis `sans-serif` untuk seluruh pengembangan antarmuka (UI/UX) pada proyek ini.

### Aplikasi Customer - UI/UX Development SOP
Dalam setiap pengembangan tampilan dan interaksi UI/UX di ekosistem tutahtitah (terutama aplikasi_customer), patuhi aturan berikut tanpa pengecualian:
1. **Premium Styling & Micro-animations**: Setiap styling di semua halaman atau tampilan harus sepenuhnya memanfaatkan palet desain premium yang disediakan oleh Tailwind CSS v4. Selalu gunakan interaksi *micro-animation* secara maksimal (misal: hover states, active states, transisi halus).
2. **Android Native Feel**: Pastikan setiap desain UI/UX terasa seperti aplikasi Android Native (mobile-first, navigasi bawah yang solid, proper touch targets).
3. **Smooth Skeleton Loading**: Jika diperlukan *skeleton loading* pada saat data di-fetch, selalu gunakan *skeleton loading* yang sangat *smooth* dan estetis (menggunakan Tailwind `animate-pulse` dengan gradasi/warna yang tepat).
4. **Notifikasi Standar**: Pastikan selalu menggunakan `react-hot-toast` untuk setiap notifikasi (success, error, warning, info) pada ekosistem tutahtitah, dengan styling kustom yang membulat (*rounded*) dan modern.

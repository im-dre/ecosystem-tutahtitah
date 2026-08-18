# 🌟 Ekosistem TutahTitah

Selamat datang di *repository* utama **Ekosistem TutahTitah**! Proyek ini adalah sebuah platform terintegrasi yang menghubungkan pelanggan, kurir, admin, dan pelaku UMKM (khususnya di kawasan Cikalong Wetan) dalam satu ekosistem digital yang cerdas dan efisien.

## 📦 Struktur Proyek (Monorepo)
*Repository* ini memuat beberapa aplikasi utama yang dibangun menggunakan teknologi modern (Vite + React + TailwindCSS + Supabase):

1. **📱 Aplikasi Customer (`/aplikasi_customer`)**
   - Aplikasi PWA (Progressive Web App) yang digunakan oleh pelanggan untuk memesan layanan Jastip, Antar Jemput, Kirim Barang, dan Belanja Pasar.
   - Fitur unggulan: Keranjang belanja cerdas, katalog UMKM, sistem pelacakan order secara *realtime*, dan optimasi egress SWR.
   
2. **💼 Aplikasi Internal (`/aplikasi_internal`)**
   - Dashboard pusat yang digunakan oleh **Admin** dan **Kurir**.
   - Admin bertugas untuk memantau pesanan masuk, membagi tugas ke kurir, mengatur harga, dan melihat laporan performa.
   - Kurir menggunakan aplikasi ini untuk menerima *task* pesanan, melaporkan kendala, dan menyelesaikan pengantaran.

3. **🏪 Portal UMKM (`/portal_umkm`)**
   - Portal web khusus bagi para pelaku Usaha Mikro Kecil Menengah (UMKM).
   - Digunakan untuk mengatur ketersediaan stok, mengubah harga produk, mengelola etalase, dan memantau analitik penjualan mereka secara mandiri.

4. **🌐 Website Profil (`/website_tutahtitah`)**
   - Halaman *landing page* profil utama untuk TutahTitah (SEO & Company Profile).

## 🚀 Teknologi Utama
- **Frontend**: React.js (Vite), Tailwind CSS, Lucide React (Icons).
- **Backend & Database**: Supabase (PostgreSQL), Supabase Realtime, Supabase Storage.
- **State & Caching**: Zustand, SWR, React Context.

## ⚙️ Persyaratan Sistem
- Node.js versi 18+ (Disarankan versi LTS terbaru)
- npm / yarn / pnpm

## 🛠️ Cara Menjalankan Aplikasi di Local
1. *Clone repository* ini:
   ```bash
   git clone https://github.com/im-dre/ecosystem-tutahtitah.git
   cd ecosystem-tutahtitah
   ```
2. Masuk ke aplikasi yang ingin dijalankan, misalnya Aplikasi Customer:
   ```bash
   cd aplikasi_customer
   ```
3. Install dependensi:
   ```bash
   npm install
   ```
4. Jalankan *development server*:
   ```bash
   npm run dev
   ```

---
*Dibuat dengan semangat memajukan UMKM lokal Cikalong Wetan!* 🚀

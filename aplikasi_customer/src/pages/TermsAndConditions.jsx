import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto sm:border-x sm:border-gray-200">
      {/* Header */}
      <div className="bg-white px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">Syarat & Ketentuan</h1>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white p-6 pb-12 shadow-sm text-sm text-gray-600 space-y-6 leading-relaxed">
        <p className="text-gray-500 mb-6">Terakhir diperbarui: 15 Agustus 2026</p>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">1. Ketentuan Umum</h2>
          <p>Dengan menggunakan aplikasi TutahTitah, Anda secara otomatis menyetujui syarat dan ketentuan yang berlaku. Kami berhak melakukan perubahan terhadap isi dari dokumen ini tanpa adanya pemberitahuan sebelumnya kepada pengguna.</p>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">2. Layanan Pengiriman (Jastip, Antar Jemput & Kirim Barang)</h2>
          <p>Seluruh layanan pengiriman dan jasa titip dioperasikan oleh kurir mitra lokal. Waktu estimasi tiba dan ketersediaan layanan dapat berubah tergantung pada cuaca, kondisi operasional di lapangan, atau hari libur.</p>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">3. Tanggung Jawab Barang dan Ganti Rugi</h2>
          <p>TutahTitah berusaha menjaga keamanan setiap barang. Namun, kerusakan akibat pengepakan yang tidak standar dari pihak pengguna bukanlah tanggung jawab kami. Ganti rugi maksimal hanya berlaku untuk transaksi yang dilindungi asuransi platform.</p>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">4. Kebijakan Transaksi dan Pengembalian Dana</h2>
          <p>Refund (Pengembalian dana) hanya dapat diproses apabila: (1) Pesanan belum disetujui atau diproses oleh pihak toko/kurir; atau (2) Terjadi kegagalan sistem yang mengakibatkan double deduction pada metode pembayaran yang digunakan.</p>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">5. Etika Penggunaan Layanan</h2>
          <p>Pengguna diwajibkan berkomunikasi dengan sopan dengan CS, Toko, dan Kurir. TutahTitah berhak membekukan akun yang terbukti melakukan order fiktif (penipuan) atau pelecehan verbal terhadap mitra.</p>
        </div>
      </div>

      {/* Footer TutahTitah */}
      <div className="bg-white border-t border-gray-100 p-6 flex flex-col items-center justify-center text-center mt-2">
        <img src="/logo-tutahtitah-biru.webp" alt="TutahTitah" className="h-16 object-contain mb-3" onError={(e) => e.target.src = '/logo-tutahtitah-biru.webp'} />
        <p className="text-[10px] text-gray-400 font-medium mb-1">TUTAHTITAH CIKALONG WETAN</p>
        <p className="text-[10px] text-gray-400 font-medium mb-4">Cikalong Wetan, Jawa Barat</p>

        <a
          href="https://wa.me/6287842344481"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-full text-xs font-bold hover:bg-green-100 transition-colors"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png" alt="WA" className="w-4 h-4 object-contain" />
          Hubungi WhatsApp Resmi
        </a>
      </div>
    </div>
  );
}

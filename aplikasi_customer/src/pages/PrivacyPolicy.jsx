import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto sm:border-x sm:border-gray-200">
      {/* Header */}
      <div className="bg-white px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">Kebijakan Privasi</h1>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white p-6 pb-12 shadow-sm text-sm text-gray-600 space-y-6 leading-relaxed">
        <p className="text-gray-500 mb-6">Terakhir diperbarui: 15 Agustus 2026</p>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">1. Pengumpulan Data Pribadi</h2>
          <p>Saat Anda membuat akun dan menggunakan TutahTitah, kami mengumpulkan informasi penting untuk keperluan operasional. Data tersebut meliputi: Nama lengkap, Nomor Handphone, Alamat Email, Lokasi (Titik Maps), dan daftar Alamat Pengiriman.</p>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">2. Penggunaan Data</h2>
          <p>Data pribadi Anda akan digunakan secara eksklusif untuk tujuan memproses pesanan, memfasilitasi komunikasi antara Anda dan kurir/mitra toko, menyelesaikan keluhan, serta menganalisa kebutuhan pengguna guna meningkatkan kualitas aplikasi.</p>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">3. Keamanan Data Pengguna</h2>
          <p>Keamanan data adalah prioritas kami. Semua informasi pengguna dilindungi dengan standar keamanan tinggi di *database* cloud. Hanya pihak yang berwenang dan memiliki akses sah yang dapat membaca data Anda untuk keperluan layanan.</p>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">4. Pembagian dan Penyingkapan Data</h2>
          <p>Kami menjamin bahwa TutahTitah tidak akan pernah menjual atau menyewakan informasi Anda kepada pihak ketiga. Namun, sebagian data seperti nama dan alamat pengiriman dapat dibagikan kepada kurir yang ditugaskan murni untuk tujuan keberhasilan pengantaran pesanan.</p>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-base mb-2">5. Permintaan Penghapusan Akun</h2>
          <p>Anda memiliki hak atas data Anda. Apabila Anda ingin menghapus akun beserta seluruh data riwayatnya, Anda dapat menghubungi Customer Service kami melalui WhatsApp resmi untuk proses penutupan akun.</p>
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

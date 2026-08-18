import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, MapPin, Navigation, FileText, Package, User, Loader2, Phone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function KirimBarangOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  
  const [formData, setFormData] = useState(() => {
    let initialItemType = '';
    let initialPickup = '';
    let initialDestination = '';
    let initialRecipient = '';
    let initialNotes = '';
    
    if (location.state?.raw_order_text) {
      const text = location.state.raw_order_text;
      const barangMatch = text.match(/Nama\/Jenis Barang:\s*(.+)/);
      const ambilMatch = text.match(/Alamat Pengambilan:\s*(.+)/);
      const tujuanMatch = text.match(/Alamat Tujuan:\s*(.+)/);
      const penerimaMatch = text.match(/Nama Penerima:\s*(.+)/);
      const noteMatch = text.match(/Note:\s*(.+)/);
      
      if (barangMatch) initialItemType = barangMatch[1].trim();
      if (ambilMatch) initialPickup = ambilMatch[1].trim();
      if (tujuanMatch) initialDestination = tujuanMatch[1].trim();
      if (penerimaMatch) initialRecipient = penerimaMatch[1].trim();
      if (noteMatch) initialNotes = noteMatch[1].trim();
    }
    
    return {
      itemType: initialItemType,
      pickup: initialPickup,
      destination: initialDestination,
      recipient: initialRecipient,
      notes: initialNotes
    };
  });

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('auth_id', user.id)
          .single();
          
        if (data) {
          setProfile(data);
        }
      }
    };
    fetchUserAndProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const useProfileAddress = (field) => {
    if (profile && profile.address) {
      setFormData(prev => ({ ...prev, [field]: profile.address }));
      toast.success('Alamat profil disalin.');
    } else {
      toast.error('Belum ada alamat di profil Anda.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemType.trim() || !formData.pickup.trim() || !formData.destination.trim() || !formData.recipient.trim()) {
      toast.error('Mohon lengkapi semua data wajib.');
      return;
    }

    if (!user || !profile) {
      toast.error('Data profil tidak ditemukan. Silakan lengkapi profil Anda.');
      return;
    }

    try {
      setLoading(true);

      const rawOrderText = `Nama/Jenis Barang: ${formData.itemType}\nAlamat Pengambilan: ${formData.pickup}\nAlamat Tujuan: ${formData.destination}\nNama Penerima: ${formData.recipient}\nNote: ${formData.notes || '-'}`;

      // Insert order
      const { data, error } = await supabase.from('orders').insert([{
        customer_id: profile.id,
        customer_name: profile.name,
        customer_wa: profile.whatsapp || profile.wa_number || profile.phone || '-', 
        customer_address: formData.pickup,
        tipe_layanan: 'Kirim Barang',
        merchant_id: null,
        items: [{
          id: `kirimbarang_${Date.now()}`,
          name: 'Layanan Kirim/Antar Barang',
          is_custom: true,
          qty: 1,
          price: 0
        }],
        total_amount: 0,
        status: 'pending',
        raw_order_text: rawOrderText
      }]).select().single();

      if (error) throw error;

      if (location.state?.isRepeatOrder) {
        toast.success('Pesanan Kirim Barang berhasil dibuat!');
        navigate('/activity', { replace: true });
      } else {
        setCreatedOrderId(data.id);
        setShowFavoriteModal(true);
      }
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Gagal membuat pesanan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteResponse = async (isFavorite) => {
    if (isFavorite && createdOrderId) {
      try {
        await supabase.from('orders').update({ is_favorite: true }).eq('id', createdOrderId);
        toast.success("Pesanan ditambahkan ke Favorit! ❤️");
      } catch (e) {
        console.error(e);
      }
    } else {
      toast.success('Pesanan Kirim Barang berhasil dibuat!');
    }
    setShowFavoriteModal(false);
    navigate('/activity', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-4 py-4 flex items-center gap-3 shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full active:scale-95 transition-all text-gray-700">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1 flex items-center gap-2">
          <Package size={20} className="text-primary" />
          Kirim/Antar Barang
        </h1>
      </div>

      <div className="p-4 flex-1">

        {/* Informasi Pengirim */}
        {profile && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <User size={16} className="text-primary" /> Informasi Pengirim
            </h2>
            <div className="space-y-2">
              <p className="text-xs text-gray-600 flex items-start gap-2">
                <User size={14} className="mt-0.5 shrink-0" />
                <span className="font-semibold text-gray-800">{profile.name}</span>
              </p>
              <p className="text-xs text-gray-600 flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0" />
                <span className="font-semibold text-gray-800">{profile.whatsapp || profile.wa_number || profile.phone || '-'}</span>
              </p>
              <p className="text-xs text-gray-600 flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span className="leading-relaxed">{profile.address || 'Belum ada alamat tersimpan.'}</span>
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Kirim atau antar paket/barang dengan aman. Silakan lengkapi detail barang dan alamat di bawah ini.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Item Type */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                <Package size={14} className="text-purple-500" />
                Jenis Barang <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="itemType"
                value={formData.itemType}
                onChange={handleChange}
                placeholder="Contoh: Dokumen / Makanan / Pakaian"
                className="w-full text-sm text-gray-800 p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                required
              />
            </div>

            {/* Pickup Address */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <MapPin size={14} className="text-blue-500" />
                  Alamat Pengambilan <span className="text-red-500">*</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => useProfileAddress('pickup')}
                  className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 active:scale-95 transition-all"
                >
                  Gunakan Alamat Profil
                </button>
              </div>
              <textarea
                name="pickup"
                value={formData.pickup}
                onChange={handleChange}
                placeholder="Contoh: Jl. Sudirman No. 10 (Titip di pos satpam)"
                rows={3}
                className="w-full text-sm text-gray-800 p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                required
              />
            </div>

            {/* Destination Address */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Navigation size={14} className="text-green-500" />
                  Alamat Pengantaran <span className="text-red-500">*</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => useProfileAddress('destination')}
                  className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 active:scale-95 transition-all"
                >
                  Gunakan Alamat Profil
                </button>
              </div>
              <textarea
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="Contoh: Perumahan Indah Blok A2, Cikalong Wetan"
                rows={3}
                className="w-full text-sm text-gray-800 p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                required
              />
            </div>

            {/* Recipient Name */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                <User size={14} className="text-orange-500" />
                Nama Penerima <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="recipient"
                value={formData.recipient}
                onChange={handleChange}
                placeholder="Contoh: Bpk. Budi (08123456789)"
                className="w-full text-sm text-gray-800 p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                <FileText size={14} className="text-gray-400" />
                Catatan (Opsional)
              </label>
              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Contoh: Barang mudah pecah / Awas tumpah"
                className="w-full text-sm text-gray-800 p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="pt-4 pb-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-white text-primary border border-primary font-bold text-sm rounded-xl hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                  ) : (
                    'Pesan Layanan'
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-4">
                Tarif ongkos kirim akan diinformasikan oleh admin setelah pesanan dibuat.
              </p>
            </div>
          </form>
        </div>
      </div>
      {/* Pop-up Favorit Modal */}
      {showFavoriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Simpan ke Favorit?</h3>
            <p className="text-sm text-center text-gray-500 mb-6 leading-relaxed">
              Pesanan berhasil dibuat! Apakah pesanan ini mau dimasukin ke daftar favorit biar gampang dipesan lagi nanti?
            </p>
            <div className="flex flex-col gap-2.5">
              <button 
                onClick={() => handleFavoriteResponse(true)}
                className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl active:bg-red-100 transition-colors"
              >
                Ya, Simpan Favorit
              </button>
              <button 
                onClick={() => handleFavoriteResponse(false)}
                className="w-full py-3 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Tidak sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Camera, Loader2, LogOut, User as UserIcon, ChevronRight, MapPin, Lock, Store, Heart, HeadphonesIcon, FileText, Shield, Ticket, Plus, Edit3, Trash2, X, Home, Briefcase, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AddressForm from '../components/AddressForm';

const MenuItem = ({ icon, title, subtitle, onClick, textColor = "text-gray-800" }) => (
  <div 
    onClick={(e) => {
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
      if (onClick) onClick(e);
    }} 
    className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all cursor-pointer active:scale-[0.99] select-none"
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className={`font-semibold ${textColor}`}>{title}</h4>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <ChevronRight size={18} className="text-gray-300" />
  </div>
);

const compressAvatar = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Paksa ukuran persegi native avatar (300x300 px)
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        
        canvas.width = MAX_WIDTH;
        canvas.height = MAX_HEIGHT;
        const ctx = canvas.getContext('2d');
        
        // Gambar ulang foto ke kanvas dengan ukuran baru
        ctx.drawImage(img, 0, 0, MAX_WIDTH, MAX_HEIGHT);
        
        // Ekspor menjadi blob dengan kualitas 0.7 (Kompresi 70%)
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.7);
      };
    };
  });
};
export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => {
    const cached = localStorage.getItem('tutahtitah_customer_profile');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return { name: '', phone: '', email: '', avatar_url: '', auth_id: '' };
      }
    }
    return { name: '', phone: '', email: '', avatar_url: '', auth_id: '' };
  });
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  
  const [editProfileForm, setEditProfileForm] = useState({ name: '', phone: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [securityForm, setSecurityForm] = useState({ newPassword: '', confirmPassword: '' });
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editingAddressData, setEditingAddressData] = useState(null);
  const [tempAddress, setTempAddress] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const getAddressIcon = (label, isDefault) => {
    const colorClass = isDefault ? "text-primary" : "text-gray-400";
    switch (label?.toLowerCase()) {
      case 'rumah': return <Home size={16} className={colorClass} />;
      case 'kantor': return <Briefcase size={16} className={colorClass} />;
      case 'kosan': return <Building2 size={16} className={colorClass} />;
      default: return <MapPin size={16} className={colorClass} />;
    }
  };

  useEffect(() => {
    fetchProfileAndAddresses();
  }, []);

  const fetchProfileAndAddresses = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, addrRes] = await Promise.all([
        supabase.from('customers').select('*').eq('auth_id', user.id).maybeSingle(),
        supabase.from('customer_addresses').select('*').eq('auth_id', user.id).order('is_default', { ascending: false })
      ]);

      if (profileRes.error) throw profileRes.error;
      if (profileRes.data) {
        const profileData = {
          name: profileRes.data.name || '',
          phone: profileRes.data.phone || '',
          email: profileRes.data.email || '',
          avatar_url: profileRes.data.avatar_url || '',
          auth_id: profileRes.data.auth_id || ''
        };
        setProfile(profileData);
        localStorage.setItem('tutahtitah_customer_profile', JSON.stringify(profileData));
        if (profileData.name) {
          localStorage.setItem('tutahtitah_customer_name', profileData.name.split(' ')[0]);
        }
      }

      if (addrRes.error) {
        // Abaikan error kalau tabel belum ada saat migrasi belum dijalankan
        console.warn(addrRes.error);
      } else if (addrRes.data) {
        setAddresses(addrRes.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Pilih file gambar untuk diunggah.');
      }

      const file = event.target.files[0];
      const compressedFile = await compressAvatar(file);
      const fileExt = 'jpg';
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Anda belum login');

      // Bikin path folder berdasarkan User ID
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file ke Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('customer-avatars')
        .upload(fileName, compressedFile, { upsert: true, cacheControl: '31536000' });

      if (uploadError) throw uploadError;

      // Dapatkan URL publik dari gambar yang baru diupload
      const { data: { publicUrl } } = supabase.storage
        .from('customer-avatars')
        .getPublicUrl(fileName);

      // Update kolom avatar_url di tabel customers
      const { error: updateError } = await supabase
        .from('customers')
        .update({ avatar_url: publicUrl })
        .eq('auth_id', profile.auth_id);

      if (updateError) throw updateError;

      // Perbarui state lokal agar UI langsung berubah
      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));

    } catch (error) {
      console.error('Gagal upload avatar:', error.message);
      toast.error('Gagal mengunggah foto profil: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAddress = async (payload) => {
    const { label, full_address } = payload;
    if (!full_address) {
      toast.error('Alamat tidak boleh kosong');
      return;
    }
    
    try {
      setIsSavingAddress(true);
      
      if (editingAddressData) {
        // Mode Update
        const { error } = await supabase
          .from('customer_addresses')
          .update({ label, full_address })
          .eq('id', editingAddressData.id)
          .eq('auth_id', profile.auth_id);
          
        if (error) throw error;
        setAddresses(prev => prev.map(a => a.id === editingAddressData.id ? { ...a, label, full_address } : a));
        toast.success('Alamat berhasil diperbarui!');
      } else {
        // Mode Insert
        const isFirst = addresses.length === 0;
        const { data, error } = await supabase
          .from('customer_addresses')
          .insert({
            auth_id: profile.auth_id,
            label,
            full_address,
            is_default: isFirst
          })
          .select()
          .single();

        if (error) throw error;
        
        setAddresses(prev => {
          const newList = [...prev, data];
          return newList.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
        });
        toast.success('Alamat berhasil ditambahkan!');
      }
      setIsEditingAddress(false);
      setEditingAddressData(null);
    } catch (error) {
      console.error('Error saving address:', error.message);
      toast.error('Gagal menyimpan alamat.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleEditClick = (addr) => {
    let detail = '';
    if (addr.full_address) {
      const lines = addr.full_address.split('\n');
      if (lines.length >= 2) {
        // Line 0 is [Label]
        // Last 2 lines are Desa/Kel and Provinsi
        // So the detail address is everything in between
        const detailLines = lines.slice(1, Math.max(1, lines.length - 2));
        detail = detailLines.join('\n').trim();
        
        // Fallback jika karena suatu hal lines-nya sedikit
        if (!detail && lines.length === 2) detail = lines[1];
      } else {
        detail = addr.full_address; // Fallback kalau format hancur
      }
    }
    setEditingAddressData({ ...addr, detail });
    setIsEditingAddress(true);
  };

  const handleSetDefault = async (id) => {
    try {
      // Optomistic update
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })).sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0)));
      
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('auth_id', profile.auth_id);
      
      if (error) throw error;
      toast.success('Alamat utama berhasil diubah');
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengubah alamat utama');
      // Revert if needed, but we can just refetch
      fetchProfileAndAddresses();
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm('Apakah kamu yakin ingin menghapus alamat ini?')) return;
    try {
      setAddresses(prev => prev.filter(a => a.id !== id));
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id)
        .eq('auth_id', profile.auth_id);
      
      if (error) throw error;
      toast.success('Alamat berhasil dihapus');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus alamat');
      fetchProfileAndAddresses();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleContactCS = async () => {
    if (!profile.auth_id) return;
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('customer_id', profile.auth_id)
      .eq('chat_type', 'support')
      .limit(1)
      .maybeSingle();

    if (existingChat) {
      navigate(`/chat/${existingChat.id}`);
    } else {
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          chat_type: 'support',
          customer_id: profile.auth_id,
          participant_id: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single();

      if (newChat && !error) {
        navigate(`/chat/${newChat.id}`);
      }
    }
  };

  const handleNavigateToActivity = (subTab) => {
    sessionStorage.setItem('activityTab', 'favorit');
    sessionStorage.setItem('activityFavoriteSubTab', subTab);
    navigate('/activity');
  };

  const openEditProfile = () => {
    setEditProfileForm({ name: profile.name, phone: profile.phone || '' });
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editProfileForm.name.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }
    
    try {
      setIsSavingProfile(true);
      const { error } = await supabase
        .from('customers')
        .update({ name: editProfileForm.name, phone: editProfileForm.phone })
        .eq('auth_id', profile.auth_id);
      
      if (error) throw error;
      
      setProfile(prev => ({ ...prev, name: editProfileForm.name, phone: editProfileForm.phone }));
      toast.success('Profil berhasil diperbarui!');
      setShowEditProfileModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memperbarui profil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!securityForm.newPassword) {
      toast.error('Kata sandi tidak boleh kosong');
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok!');
      return;
    }
    if (securityForm.newPassword.length < 6) {
      toast.error('Kata sandi minimal 6 karakter!');
      return;
    }
    try {
      setIsSavingSecurity(true);
      const { error } = await supabase.auth.updateUser({
        password: securityForm.newPassword
      });
      if (error) throw error;
      toast.success('Kata sandi berhasil diperbarui!');
      setShowSecurityModal(false);
      setSecurityForm({ newPassword: '', confirmPassword: '' });
    } catch(e) {
      console.error(e);
      toast.error('Gagal memperbarui kata sandi.');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleRequestDeleteAccount = () => {
    const text = `Halo Admin, saya ingin mengajukan penghapusan akun Tutahtitah saya.%0A%0ANama: ${profile.name}%0AEmail: ${profile.email}%0A%0AMohon bantuannya untuk memproses penghapusan akun ini. Terima kasih.`;
    window.open(`https://wa.me/6287842344481?text=${text}`, '_blank');
    setShowDeleteAccountModal(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 pb-24 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-br from-blue-400 to-blue-500 px-6 pt-12 pb-28 rounded-b-[40px] shadow-sm relative flex justify-center overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl"></div>
          
          <div className="h-6 w-32 bg-white/40 rounded-full relative z-10"></div>
        </div>

        {/* Card Skeleton */}
        <div className="px-6 -mt-16">
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 flex flex-col items-center">
            <div className="w-28 h-28 rounded-full bg-gray-200 border-4 border-white mb-4 shadow-sm"></div>
            <div className="h-5 w-40 bg-gray-200 rounded-full mb-2"></div>
            <div className="h-3 w-32 bg-gray-100 rounded-full mb-3"></div>
            <div className="h-7 w-28 bg-blue-50 rounded-full mt-1"></div>
          </div>

          {/* Menus Skeleton */}
          <div className="mt-6 space-y-6">
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded-full mb-3 ml-2"></div>
              <div className="h-32 bg-white rounded-3xl shadow-sm border border-gray-100"></div>
            </div>
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded-full mb-3 ml-2"></div>
              <div className="h-48 bg-white rounded-3xl shadow-sm border border-gray-100"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header Profil - Premium Native UI */}
      <div className="bg-gradient-to-br from-[#0F4C81] via-primary to-[#1E3A8A] px-6 pt-14 pb-28 rounded-b-[40px] shadow-lg relative flex justify-center overflow-hidden">
        
        {/* Dekorasi Abstract/Aurora effect */}
        <div className="absolute -top-20 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-16 w-56 h-56 bg-blue-400/20 rounded-full blur-3xl"></div>
        
        {/* Ornamen garis halus (Glassmorphism subtle borders) */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <h1 className="text-xl font-bold text-white relative z-10 tracking-wide drop-shadow-md">Profil Saya</h1>
      </div>

      {/* Konten Kartu Profil */}
      <div className="px-6 -mt-20 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 flex flex-col items-center">
          
          {/* Avatar Section */}
          <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-full border-4 border-white shadow-md bg-gray-100 overflow-hidden flex items-center justify-center relative">
              {uploading ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-white" size={32} />
                </div>
              ) : null}

              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <UserIcon size={48} className="text-gray-400" />
              )}
            </div>

            {/* Ikon Kamera (Ganti Foto) */}
            <div className="absolute bottom-0 right-0 bg-accent p-2 rounded-full shadow-lg border-2 border-white transform transition-transform group-hover:scale-110 active:scale-95">
              <Camera size={18} className="text-gray-800" />
            </div>
            
            {/* Hidden Input File */}
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden" 
            />
          </div>

          {/* Info User */}
          <div className="flex flex-col items-center relative w-full mt-4">
            <h2 className="text-xl font-bold text-gray-800 text-center">{profile.name}</h2>
            <p className="text-sm text-gray-500 text-center mt-0.5">{profile.phone || 'Nomor HP belum diatur'}</p>
            <p className="text-[11px] text-gray-400 text-center mt-1 bg-gray-50 px-2 py-0.5 rounded">{profile.email || profile.auth_id?.substring(0,8)}</p>
            <button 
              onClick={() => {
                if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                openEditProfile();
              }}
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 active:scale-95 transition-all select-none"
            >
              <Edit3 size={14} />
              Ubah Profil
            </button>
          </div>
        </div>

        {/* Promo / Voucher */}
        <div 
          onClick={() => {
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
            setShowVoucherModal(true);
          }}
          className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform select-none"
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium text-orange-100 mb-1">Promo & Diskon</span>
            <span className="font-bold text-lg flex items-center gap-2">
              <Ticket size={20} />
              Voucher Saya (0)
            </span>
          </div>
          <ChevronRight size={20} className="text-orange-100" />
        </div>

        {/* Menu Groups */}
        <div className="mt-6 space-y-6">
          
          {/* Akun & Keamanan */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 ml-2">Akun & Keamanan</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <MenuItem 
                icon={<MapPin size={20} className="text-blue-500"/>} 
                title="Daftar Alamat" 
                subtitle="Atur alamat pengiriman belanjaan" 
                onClick={() => setShowAddressModal(true)} 
              />
              <div className="h-px bg-gray-50 mx-4"></div>
              <MenuItem 
                icon={<Lock size={20} className="text-gray-500"/>} 
                title="Keamanan Akun" 
                subtitle="Ubah kata sandi" 
                onClick={() => {
                  setSecurityForm({ newPassword: '', confirmPassword: '' });
                  setShowSecurityModal(true);
                }}
              />
            </div>
          </div>

          {/* Aktivitas & Favorit */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 ml-2">Aktivitas & Favorit</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <MenuItem 
                icon={<Store size={20} className="text-green-500"/>} 
                title="Toko Favorit" 
                subtitle="Daftar toko yang kamu ikuti" 
                onClick={() => handleNavigateToActivity('toko')}
              />
              <div className="h-px bg-gray-50 mx-4"></div>
              <MenuItem 
                icon={<Heart size={20} className="text-red-500"/>} 
                title="Produk Disukai" 
                subtitle="Barang yang kamu simpan" 
                onClick={() => handleNavigateToActivity('produk')}
              />
            </div>
          </div>

          {/* Bantuan & Info */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 ml-2">Bantuan & Info</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <MenuItem 
                icon={<HeadphonesIcon size={20} className="text-purple-500"/>} 
                title="Pusat Bantuan" 
                subtitle="Hubungi Customer Service" 
                onClick={handleContactCS}
              />
              <div className="h-px bg-gray-50 mx-4"></div>
              <MenuItem 
                icon={<FileText size={20} className="text-gray-500"/>} 
                title="Syarat & Ketentuan" 
                onClick={() => navigate('/terms')}
              />
              <div className="h-px bg-gray-50 mx-4"></div>
              <MenuItem 
                icon={<Shield size={20} className="text-gray-500"/>} 
                title="Kebijakan Privasi" 
                onClick={() => navigate('/privacy')}
              />
            </div>
          </div>
          
          {/* Keluar Akun */}
          <button 
            onClick={() => {
              if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
              handleSignOut();
            }}
            className="w-full bg-white text-red-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-between px-5 shadow-sm border border-red-100 active:bg-red-50 active:scale-[0.98] mt-4 select-none"
          >
            <div className="flex items-center gap-3">
              <LogOut size={20} />
              <span>Keluar Akun</span>
            </div>
          </button>
          
          {/* Hapus Akun */}
          <div className="text-center mt-6 mb-4">
            <button 
              onClick={() => {
                if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                setShowDeleteAccountModal(true);
              }}
              className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors active:scale-95 px-4 py-2 select-none"
            >
              Pengajuan Hapus Akun
            </button>
            <p className="text-[10px] text-gray-300 mt-4 font-medium">TutahTitah App v1.0.0 (Build 24)</p>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl h-[85vh] sm:h-[600px] flex flex-col animate-slideUp">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg text-gray-800">Daftar Alamat</h2>
              <button 
                onClick={() => {
                  setShowAddressModal(false);
                  setIsEditingAddress(false);
                  setTempAddress(profile.address);
                }} 
                className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col relative">
              {isEditingAddress ? (
                <AddressForm 
                  onCancel={() => {
                    setIsEditingAddress(false);
                    setEditingAddressData(null);
                  }}
                  onSave={handleSaveAddress}
                  isSaving={isSavingAddress}
                  initialData={editingAddressData}
                />
              ) : (
                <div className="p-4 flex-1 flex flex-col">
                  {addresses.length > 0 ? (
                    <div className="space-y-4">
                      {addresses.map(addr => (
                        <div key={addr.id} className={`bg-white rounded-2xl p-4 shadow-sm border relative overflow-hidden ${addr.is_default ? 'border-blue-200' : 'border-gray-100'}`}>
                          {addr.is_default && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-0"></div>}
                          <div className="relative z-10 flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-2">
                              {getAddressIcon(addr.label, addr.is_default)}
                              <span className="font-bold text-sm text-gray-800">{addr.label}</span>
                              {addr.is_default && <span className="bg-blue-100 text-primary text-[10px] font-bold px-2 py-0.5 rounded ml-1">Utama</span>}
                            </div>
                            <div className="flex gap-2">
                              {!addr.is_default && (
                                <button 
                                  onClick={() => handleSetDefault(addr.id)}
                                  className="text-[11px] font-bold text-primary bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                  Jadikan Utama
                                </button>
                              )}
                              <button 
                                onClick={() => handleEditClick(addr)}
                                className="text-gray-500 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">
                            {addr.full_address.replace(/^\[.*?\]\n/, '')}
                          </p>
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => {
                          setEditingAddressData(null);
                          setIsEditingAddress(true);
                        }}
                        className="w-full bg-white text-primary border border-primary font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-95 transition-transform mt-2"
                      >
                        <Plus size={18} />
                        Tambah Alamat Baru
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
                        <MapPin size={32} />
                      </div>
                      <h3 className="font-bold text-gray-800 mb-2">Belum Ada Alamat</h3>
                      <p className="text-sm text-gray-500 mb-6">Kamu belum menambahkan alamat pengiriman.</p>
                      <button 
                        onClick={() => {
                          setEditingAddressData(null);
                          setIsEditingAddress(true);
                        }}
                        className="bg-white text-primary border border-primary font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-50 active:scale-95 transition-transform shadow-sm"
                      >
                        <Plus size={18} />
                        Tambah Alamat Baru
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Voucher Modal (Placeholder) */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl h-[85vh] sm:h-[600px] flex flex-col animate-slideUp">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg text-gray-800">Voucher Saya</h2>
              <button onClick={() => setShowVoucherModal(false)} className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4 text-orange-500">
                <Ticket size={32} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Belum Ada Voucher</h3>
              <p className="text-sm text-gray-500">Kamu belum memiliki voucher saat ini. Terus bertransaksi untuk mendapatkan voucher menarik!</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl flex flex-col overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-800">Ubah Profil</h2>
              <button onClick={() => setShowEditProfileModal(false)} className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm({...editProfileForm, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Nomor HP</label>
                <input 
                  type="tel" 
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm({...editProfileForm, phone: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Contoh: 08123456789"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Email (Hanya Baca)</label>
                <input 
                  type="email" 
                  value={profile.email}
                  disabled
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="p-5 pt-2 border-t border-gray-100">
              <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isSavingProfile ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keamanan Akun Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl flex flex-col overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-800">Ubah Kata Sandi</h2>
              <button onClick={() => setShowSecurityModal(false)} className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Kata Sandi Baru</label>
                <input 
                  type="password" 
                  value={securityForm.newPassword}
                  onChange={(e) => setSecurityForm({...securityForm, newPassword: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Konfirmasi Kata Sandi</label>
                <input 
                  type="password" 
                  value={securityForm.confirmPassword}
                  onChange={(e) => setSecurityForm({...securityForm, confirmPassword: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Ketik ulang kata sandi baru"
                />
              </div>
            </div>
            <div className="p-5 pt-2 border-t border-gray-100">
              <button 
                onClick={handleUpdatePassword}
                disabled={isSavingSecurity}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isSavingSecurity ? <Loader2 size={18} className="animate-spin" /> : 'Perbarui Kata Sandi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hapus Akun Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl flex flex-col overflow-hidden animate-scaleIn">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="font-bold text-lg text-gray-800 mb-2">Pengajuan Hapus Akun</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Apakah Anda yakin ingin menghapus akun ini? Tindakan ini akan menghapus semua riwayat transaksi dan data Anda secara permanen. Pengajuan akan diproses oleh Admin dalam 1x24 jam.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRequestDeleteAccount}
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all"
                >
                  Ya, Ajukan Hapus Akun
                </button>
                <button 
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="w-full py-3.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

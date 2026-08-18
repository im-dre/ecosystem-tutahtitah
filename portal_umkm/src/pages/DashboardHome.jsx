import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const DEFAULT_HOURS = [
  {day: 'Senin', is_open: true, open: '08:00', close: '20:00'},
  {day: 'Selasa', is_open: true, open: '08:00', close: '20:00'},
  {day: 'Rabu', is_open: true, open: '08:00', close: '20:00'},
  {day: 'Kamis', is_open: true, open: '08:00', close: '20:00'},
  {day: 'Jumat', is_open: true, open: '08:00', close: '20:00'},
  {day: 'Sabtu', is_open: true, open: '08:00', close: '20:00'},
  {day: 'Minggu', is_open: true, open: '08:00', close: '20:00'}
];

export default function DashboardHome() {
  const { merchant, refreshMerchant } = useAuth();
  const navigate = useNavigate();
  const status = merchant?.status || 'DRAFT';
  const isPending = merchant?.status === 'PENDING';

  const [productCount, setProductCount] = useState(0);

  // Profile Form States
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    operating_hours: []
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState(null); // 'name', 'description', 'address'

  useEffect(() => {
    if (merchant) {
      const fetchCount = async () => {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id);
        setProductCount(count || 0);
      };
      fetchCount();

      setCurrentLogoUrl(merchant.logo_url || '');
      const savedHours = merchant.operating_hours || [];
      let finalHours = savedHours;

      if (savedHours.length !== 7) {
        finalHours = DEFAULT_HOURS;
      }

      setFormData({
        name: merchant.name || '',
        description: merchant.description || '',
        address: merchant.address || '',
        operating_hours: finalHours
      });
    }
  }, [merchant]);

  const getTodayOperatingHours = (hours) => {
    if (!hours) return 'Jam Operasional Belum Diatur';
    if (typeof hours === 'string') return hours;
    if (Array.isArray(hours)) {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const today = days[new Date().getDay()];
      const todaySchedule = hours.find(h => h.day === today);
      if (todaySchedule) {
        if (!todaySchedule.is_open) return 'Tutup Hari Ini';
        return `Buka ${todaySchedule.open} - ${todaySchedule.close}`;
      }
      return 'Jadwal Aktif';
    }
    return 'Jadwal Aktif';
  };

  const handleScheduleChange = (dayName, field, value) => {
    setFormData(prev => {
      const currentHours = Array.isArray(prev.operating_hours) ? prev.operating_hours : [];
      const newHours = currentHours.map(item => {
        if (item.day === dayName) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return { ...prev, operating_hours: newHours };
    });
  };

  const uploadLogoToCloudinary = async (file) => {
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', 'mitra_umkm_tutahtitah');

    const res = await fetch('https://api.cloudinary.com/v1_1/bvxkjuf5/image/upload', {
      method: 'POST',
      body: uploadData,
    });
    
    if (!res.ok) {
      throw new Error('Gagal mengunggah logo ke Cloudinary');
    }
    
    const data = await res.json();
    return data.secure_url;
  };

  const saveProfile = async (customFile = null) => {
    if (isPending) return;
    
    setSaving(true);
    try {
      let finalLogoUrl = currentLogoUrl;
      const fileToUpload = customFile || logoFile;

      if (fileToUpload) {
        toast.loading('Mengunggah logo...', { id: 'upload' });
        finalLogoUrl = await uploadLogoToCloudinary(fileToUpload);
        toast.dismiss('upload');
      }

      const updates = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        logo_url: finalLogoUrl,
        operating_hours: formData.operating_hours
      };

      const { data, error } = await supabase
        .from('merchants')
        .update(updates)
        .eq('id', merchant.id)
        .select();

      if (error) {
        toast.error("Gagal menyimpan profil: " + error.message);
        return;
      }
      
      toast.success("Profil berhasil diperbarui!");
      await refreshMerchant();
      if (customFile) {
        setLogoFile(null);
        setCurrentLogoUrl(finalLogoUrl);
      }
      setEditingField(null);
    } catch (error) {
      toast.dismiss('upload');
      toast.error(error.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (file) => {
    if (!file) return;
    setLogoFile(file);
    await saveProfile(file);
  };

  return (
    <div className="w-full pb-24 md:pb-8 animate-fade-in">
      {/* 
        ========================================
        HEADER PROFILE CARD
        ========================================
      */}
      <div className="bg-white relative overflow-hidden flex flex-col border-b border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">

        {/* Banner area */}
        <div className="h-48 md:h-64 w-full relative overflow-hidden group">
          <div
            className="absolute inset-0 z-0 bg-brand-100 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage: currentLogoUrl ? `url(${currentLogoUrl})` : 'url(/frontstore-icon.png)'
            }}
          ></div>
        </div>

        {/* Content area that overlaps the banner */}
        <div className="relative z-20 flex flex-col px-4 md:px-10 pb-10 -mt-16 md:-mt-24 gap-3 md:gap-5">
          
          {/* Logo & Name Row */}
          <div className="flex flex-row items-start gap-4 md:gap-8">
            <div className="shrink-0 relative group transition-transform duration-500 hover:-translate-y-2 self-start">
              <img
                src={logoFile ? URL.createObjectURL(logoFile) : (currentLogoUrl || '/frontstore-icon.png')}
                alt="Logo Toko"
                className="w-24 h-24 md:w-40 md:h-40 rounded-[1.5rem] md:rounded-[2rem] object-cover border-4 md:border-[6px] border-white shadow-[0_12px_24px_rgb(0,0,0,0.1)] bg-white relative z-10"
              />
              {status === 'VERIFIED' && (
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full shadow-sm z-20" title="Terverifikasi">
                  <img src="/lencana-icon.webp" alt="Verified" className="w-8 h-8 md:w-12 md:h-12 object-contain drop-shadow-sm" />
                </div>
              )}
              
              {!isPending && (
                <label className="absolute inset-0 bg-black/50 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer z-30">
                  <i className="ph-fill ph-camera text-white text-2xl md:text-3xl"></i>
                  <span className="text-white text-[10px] md:text-xs font-bold mt-1">Ubah</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoChange(e.target.files[0])} />
                </label>
              )}
            </div>

            <div className="flex-1 mt-16 md:mt-24">
              {/* Inline Edit for Name */}
              {editingField === 'name' ? (
                <div className="flex items-center justify-start gap-2 mb-1">
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="text-2xl md:text-4xl font-black text-gray-900 border-b-2 border-brand-500 bg-transparent outline-none py-1 w-full max-w-md"
                    autoFocus
                    placeholder="Nama Toko"
                  />
                  <button onClick={() => saveProfile()} disabled={saving} className="p-2 text-green-600 hover:bg-green-50 rounded-full shrink-0">
                    <i className={`ph-fill ${saving ? 'ph-spinner-gap animate-spin' : 'ph-check-circle'} text-3xl`}></i>
                  </button>
                  <button onClick={() => setEditingField(null)} disabled={saving} className="p-2 text-red-500 hover:bg-red-50 rounded-full shrink-0">
                    <i className="ph-fill ph-x-circle text-3xl"></i>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-start gap-3 group/name">
                  <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
                    {formData.name || 'Toko Anda'}
                  </h1>
                  {!isPending && (
                    <button onClick={() => setEditingField('name')} className="opacity-100 md:opacity-0 md:group-hover/name:opacity-100 transition-opacity text-brand-600 p-2 bg-brand-50 rounded-full shrink-0">
                      <i className="ph-fill ph-pencil-simple text-lg md:text-base"></i>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-left w-full flex flex-col gap-1.5 md:gap-2.5">
            {/* Inline Edit for Description */}
            {editingField === 'description' ? (
              <div className="flex flex-col items-start gap-2 mb-1 w-full max-w-2xl">
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="text-base text-gray-900 border-2 border-brand-200 focus:border-brand-500 rounded-xl bg-white outline-none p-3 w-full shadow-sm"
                  rows="3"
                  autoFocus
                  placeholder="Ceritakan tentang toko Anda..."
                />
                <div className="flex gap-2">
                  <button onClick={() => saveProfile()} disabled={saving} className="flex items-center gap-1 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-green-200">
                    <i className={`ph-fill ${saving ? 'ph-spinner-gap animate-spin' : 'ph-check-circle'}`}></i> Simpan
                  </button>
                  <button onClick={() => setEditingField(null)} disabled={saving} className="flex items-center gap-1 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-200">
                    <i className="ph-fill ph-x-circle"></i> Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-start gap-3 group/desc relative w-full max-w-2xl">
                <p className="text-gray-900 text-base leading-relaxed">
                  {formData.description || 'Deskripsi toko belum ditambahkan. Klik ikon pensil untuk mengatur.'}
                </p>
                {!isPending && (
                  <button onClick={() => setEditingField('description')} className="opacity-100 md:opacity-0 md:group-hover/desc:opacity-100 transition-opacity text-brand-600 p-2 bg-brand-50 rounded-full shrink-0 mt-[-4px]">
                    <i className="ph-fill ph-pencil-simple text-lg md:text-base"></i>
                  </button>
                )}
              </div>
            )}
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-sm font-medium text-gray-900 mt-2">
               {/* Inline Edit for Address */}
               {editingField === 'address' ? (
                 <div className="flex items-center bg-white px-3 py-2 rounded-xl border-2 border-brand-500 w-full md:w-auto shadow-sm">
                   <input 
                     type="text" 
                     value={formData.address}
                     onChange={e => setFormData({...formData, address: e.target.value})}
                     className="bg-transparent outline-none w-full md:w-64 text-gray-900"
                     autoFocus
                     placeholder="Alamat Toko"
                   />
                   <button onClick={() => saveProfile()} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-full shrink-0">
                     <i className={`ph-fill ${saving ? 'ph-spinner-gap animate-spin' : 'ph-check-circle'} text-xl`}></i>
                   </button>
                   <button onClick={() => setEditingField(null)} disabled={saving} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full shrink-0">
                     <i className="ph-fill ph-x-circle text-xl"></i>
                   </button>
                 </div>
               ) : (
                 <div className="flex items-center gap-2 group/addr relative">
                   <i className="ph-fill ph-map-pin text-brand-500 text-xl shrink-0"></i>
                   <span>{formData.address || 'Alamat Belum Diatur'}</span>
                   {!isPending && (
                     <button onClick={() => setEditingField('address')} className="opacity-100 md:opacity-0 md:group-hover/addr:opacity-100 transition-opacity text-brand-600 p-2 bg-brand-50 rounded-full shrink-0">
                       <i className="ph-fill ph-pencil-simple text-sm md:text-xs"></i>
                     </button>
                   )}
                 </div>
               )}
               
               <div className="flex items-center gap-2">
                 <img src="/clock-icon.webp" alt="Jam Operasional" className="w-5 h-5 object-contain" />
                 <span>{getTodayOperatingHours(formData.operating_hours)}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* JAM OPERASIONAL INLINE FORM */}
      <div className="px-4 md:px-10 mt-6">
        <div className="mb-5 flex gap-3 items-start bg-brand-50/50 border border-brand-100 p-4 md:px-5 md:py-4 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <i className="ph-fill ph-info text-brand-500 text-xl shrink-0 mt-0.5"></i>
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong className="text-gray-900 font-black">Informasi Penting:</strong> Pengaturan jam operasional ini akan menentukan status keaktifan toko Anda di aplikasi <i>customer</i>. Toko akan otomatis berstatus <strong>Buka/Tutup</strong> mengikuti jadwal yang Anda tentukan di bawah ini.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
          <div className="bg-accent-50 p-5 border-b border-accent-100 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3">
               <div className="mb-0 relative z-10">
                 <img src="/clock-icon.webp" alt="Jam Operasional" className="w-10 h-10 object-contain drop-shadow-sm" />
               </div>
               <h3 className="text-gray-900 font-black text-lg tracking-tight">Jam Operasional</h3>
             </div>
             {!isPending && (
                <button 
                  onClick={() => saveProfile()}
                  disabled={saving}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <><i className="ph-bold ph-spinner-gap animate-spin"></i> Menyimpan</>
                  ) : (
                    <><i className="ph-bold ph-floppy-disk"></i> Simpan Jadwal</>
                  )}
                </button>
             )}
          </div>
          
          <div className="p-3 md:p-6 divide-y divide-gray-100">
            {(Array.isArray(formData?.operating_hours) ? formData.operating_hours : DEFAULT_HOURS).map((item, index) => (
              <div key={item.day || index} className="flex flex-row items-center justify-between p-3 gap-2 hover:bg-gray-50 rounded-2xl transition-colors">
                <div className="w-20 md:w-28 shrink-0">
                  <span className="font-black text-gray-800 text-sm">{item.day}</span>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    disabled={isPending}
                    checked={!!item.is_open} 
                    onChange={(e) => handleScheduleChange(item.day, 'is_open', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500 shadow-[inset_0_2px_4px_rgb(0,0,0,0.05)]"></div>
                </label>

                <div className={`flex items-center gap-1 md:gap-3 transition-opacity duration-300 ${item.is_open ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <input 
                    type="time" 
                    disabled={isPending}
                    className="bg-white text-xs md:text-sm font-bold text-gray-700 outline-none w-[75px] md:w-[90px] p-2 md:p-2.5 border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl shadow-sm text-center transition-all"
                    value={item.open || '08:00'} 
                    onChange={(e) => handleScheduleChange(item.day, 'open', e.target.value)}
                  />
                  <span className="text-gray-300 font-bold">-</span>
                  <input 
                    type="time" 
                    disabled={isPending}
                    className="bg-white text-xs md:text-sm font-bold text-gray-700 outline-none w-[75px] md:w-[90px] p-2 md:p-2.5 border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl shadow-sm text-center transition-all"
                    value={item.close || '20:00'} 
                    onChange={(e) => handleScheduleChange(item.day, 'close', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}

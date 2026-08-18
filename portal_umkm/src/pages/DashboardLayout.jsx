import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function DashboardLayout() {
  const { user, merchant, signOut, refreshMerchant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [productCount, setProductCount] = useState(0);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (merchant && (merchant.status === 'DRAFT' || merchant.status === 'REJECTED')) {
      const fetchCount = async () => {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id);
        setProductCount(count || 0);
      };
      fetchCount();
    }
  }, [merchant, location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleVerifyRequest = async () => {
    setVerifying(true);
    const { error } = await supabase
      .from('merchants')
      .update({ status: 'PENDING' })
      .eq('id', merchant.id);

    if (error) {
      toast.error('Gagal mengajukan verifikasi');
    } else {
      toast.success('Berhasil diajukan! Menunggu verifikasi admin.');
      await refreshMerchant();
    }
    setVerifying(false);
  };

  const status = merchant?.status || 'DRAFT';
  const isVerified = status === 'VERIFIED';

  const isProfileComplete = Boolean(merchant?.description && merchant?.logo_url);
  const canVerify = productCount >= 1 && isProfileComplete;

  const navLinks = [
    { name: 'Dashboard', path: '/', image: '/home-icon.webp', exact: true, show: true },
    { name: 'Produk', path: '/products', image: '/produk-icon.webp', show: true },
    { name: 'Pesanan', path: '/orders', image: '/file-icon.webp', show: isVerified },
    { name: 'Laporan', path: '#', image: '/chart-icon.webp', show: true, isAlert: true },
    { name: 'Pengaturan', path: '/settings', image: '/setting-icon.webp', show: true },
  ];

  return (
    <div className="flex h-screen bg-gray-50/50 font-sans text-gray-800 overflow-hidden">

      {/* 
        ========================================
        DESKTOP SIDEBAR (Floating Style)
        ========================================
      */}
      <aside className="hidden md:flex w-[260px] flex-col bg-white border-r border-gray-100 z-20">
        {/* Clean Spacer for Sidebar Top */}
        <div className="pt-6"></div>

        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scroll">
          <ul className="space-y-1.5">
            {navLinks.filter(l => l.show).map((link) => {
              const isActive = link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);
              return (
                <li key={link.name}>
                  {link.isAlert ? (
                    <button
                      onClick={(e) => { e.preventDefault(); alert("Fitur Laporan akan segera hadir!"); }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium`}
                    >
                      <img src={link.image} alt={link.name} className={`w-6 h-6 object-contain transition-all duration-300 opacity-70 grayscale`} />
                      {link.name}
                    </button>
                  ) : (
                    <Link
                      to={link.path}
                      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive
                          ? 'bg-brand-50 text-brand-600 font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
                        }`}
                    >
                      <img src={link.image} alt={link.name} className={`w-6 h-6 object-contain transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : 'opacity-70 grayscale'}`} />
                      {link.name}
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500"></div>}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-5 border-t border-gray-50">
          <div className="bg-gray-50/80 backdrop-blur p-4 rounded-2xl border border-gray-100/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold shadow-sm shrink-0">
                {merchant?.name ? merchant.name.charAt(0).toUpperCase() : <i className="ph-fill ph-storefront text-lg"></i>}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-gray-800 truncate">
                  {merchant?.name || user?.email}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${status === 'VERIFIED' ? 'bg-green-500' : status === 'PENDING' ? 'bg-yellow-500' : status === 'REJECTED' || status === 'SUSPENDED' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 
        ========================================
        MAIN CONTENT AREA
        ========================================
      */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative pb-[calc(env(safe-area-inset-bottom)+70px)] md:pb-0">



        {/* BANNERS */}
        <div className="shrink-0 z-20">
          {status === 'REJECTED' && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex gap-4 items-start mb-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <i className="ph-fill ph-x-circle text-red-500 text-xl"></i>
              </div>
              <div className="pt-0.5">
                <p className="text-gray-900 font-bold text-sm">Verifikasi Ditolak</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{merchant?.rejection_reason}</p>
              </div>
            </div>
          )}

          {status === 'SUSPENDED' && (
            <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(239,68,68,0.1)] border border-red-100 flex flex-col gap-4 mb-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="flex gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-warning-circle text-2xl"></i>
                </div>
                <div className="pt-1">
                  <p className="text-gray-900 font-black text-sm uppercase tracking-wide">Toko Dibekukan</p>
                  <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{merchant?.rejection_reason}</p>
                </div>
              </div>
              <a
                href={`https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20ingin%20mengajukan%20banding%20untuk%20toko%20${merchant?.name}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full text-center bg-red-500 text-white px-4 py-3.5 rounded-xl font-bold hover:bg-red-600 text-sm shadow-[0_4px_12px_rgb(239,68,68,0.3)] transition-all flex items-center justify-center gap-2 relative z-10"
              >
                <i className="ph-fill ph-whatsapp-logo text-lg"></i>
                Ajukan Banding via WhatsApp
              </a>
            </div>
          )}

          {status === 'PENDING' && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-yellow-100 flex gap-4 items-center mb-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400"></div>
              <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
                <i className="ph-fill ph-hourglass-high text-yellow-500 text-xl"></i>
              </div>
              <p className="text-gray-600 text-xs font-medium leading-relaxed">Menunggu verifikasi Admin. Anda belum dapat mengedit produk.</p>
            </div>
          )}

          {(status === 'DRAFT' || status === 'REJECTED') && (
            <div className="bg-white p-5 rounded-3xl shadow-[0_8px_20px_rgb(0,0,0,0.03)] border border-brand-100 flex flex-col md:flex-row md:items-center gap-5 relative overflow-hidden mb-4 group">
              <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <i className="ph-fill ph-rocket-launch text-9xl text-brand-500"></i>
              </div>
              <div className="flex-1 relative z-10">
                <p className="text-gray-900 font-black text-sm">Lengkapi Profil & Produk 🚀</p>
                <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                  {!isProfileComplete
                    ? "Lengkapi deskripsi & logo toko, lalu miliki minimal 1 produk."
                    : productCount === 0
                      ? "Tambahkan minimal 1 produk untuk verifikasi."
                      : status === 'REJECTED'
                        ? "Perbaiki profil/produk sesuai saran, lalu ajukan ulang."
                        : "Profil dan produk sudah lengkap! Silakan ajukan verifikasi sekarang."}
                </p>
              </div>
              <button
                onClick={handleVerifyRequest}
                disabled={!canVerify || verifying}
                className="w-full md:w-auto bg-gradient-to-r from-brand-600 to-brand-500 text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:from-brand-700 hover:to-brand-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-[0_4px_12px_rgb(0,74,173,0.2)] hover:shadow-[0_6px_16px_rgb(0,74,173,0.3)] disabled:shadow-none transition-all shrink-0 relative z-10"
              >
                {verifying ? (
                  <span className="flex items-center gap-2 justify-center"><i className="ph ph-spinner-gap animate-spin"></i> Mengajukan...</span>
                ) : (status === 'REJECTED' ? 'Ajukan Ulang' : 'Ajukan Verifikasi')}
              </button>
            </div>
          )}
        </div>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          <div className="min-h-full pb-8">
            <Outlet />
          </div>
        </div>
      </div>

      {/* 
        ========================================
        MOBILE BOTTOM NAVIGATION (Native iOS Style)
        ========================================
      */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.08)]">
        <ul className="flex justify-around items-center px-2 py-2">
          {navLinks.filter(l => l.show).map((link) => {
            const isActive = link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);
            return (
              <li key={link.name} className="flex-1">
                {link.isAlert ? (
                  <button
                    onClick={(e) => { e.preventDefault(); alert("Fitur Laporan akan segera hadir!"); }}
                    className={`w-full flex flex-col items-center justify-center py-2 px-1 gap-1 transition-all duration-300 ${isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-brand-50 rounded-2xl px-5 py-1.5' : 'py-1.5'}`}>
                      <img src={link.image} alt={link.name} className={`w-6 h-6 object-contain transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : 'opacity-60 grayscale'}`} />
                    </div>
                    <span className={`text-[10px] mt-0.5 transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>{link.name}</span>
                  </button>
                ) : (
                  <Link
                    to={link.path}
                    className={`flex flex-col items-center justify-center py-2 px-1 gap-1 transition-all duration-300 ${isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-brand-50 rounded-2xl px-5 py-1.5' : 'py-1.5'}`}>
                      <img src={link.image} alt={link.name} className={`w-6 h-6 object-contain transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : 'opacity-60 grayscale'}`} />
                    </div>
                    <span className={`text-[10px] mt-0.5 transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>{link.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

    </div>
  );
}

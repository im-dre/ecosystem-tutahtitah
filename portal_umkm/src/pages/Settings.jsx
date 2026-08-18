import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Password tidak cocok!');
      return;
    }
    // Implement password change logic with Supabase here
    setSavingPassword(true);
    setTimeout(() => {
      toast.success('Fitur ganti password akan segera hadir!');
      setSavingPassword(false);
      setPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  return (
    <div className="w-full pb-24 md:pb-8 animate-fade-in bg-gray-50 min-h-screen">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md p-6 md:p-8 border-b border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pengaturan</h2>
        <p className="text-sm text-gray-500 mt-1">Kelola akun dan sistem keamanan Anda.</p>
      </div>

      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
        
        {/* Akun Login Card */}
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <div className="bg-brand-50 p-4 border-b border-brand-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center">
               <i className="ph-fill ph-user-circle"></i>
             </div>
             <h3 className="text-brand-900 font-bold">Akun Pengguna</h3>
          </div>
          
          <div className="p-5 md:p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email Login</label>
              <input 
                type="email" 
                disabled 
                value={user?.email || ''} 
                className="block w-full border border-gray-200 rounded-xl shadow-sm p-3 bg-gray-50 text-gray-500 outline-none font-medium" 
              />
              <p className="mt-2 text-xs text-gray-400">Email ini digunakan untuk masuk ke Portal UMKM.</p>
            </div>
          </div>
        </div>

        {/* Ganti Password Card */}
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center">
               <i className="ph-fill ph-lock-key"></i>
             </div>
             <h3 className="text-gray-900 font-bold">Ubah Password</h3>
          </div>
          
          <form onSubmit={handlePasswordChange} className="p-5 md:p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password Baru</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full border border-gray-200 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all" 
                placeholder="Masukkan password baru"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Konfirmasi Password Baru</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full border border-gray-200 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all" 
                placeholder="Ketik ulang password baru"
              />
            </div>
            <button 
              type="submit" 
              disabled={savingPassword || !password || !confirmPassword}
              className="w-full bg-gray-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
            >
              {savingPassword ? 'Menyimpan...' : 'Perbarui Password'}
            </button>
          </form>
        </div>

        {/* Rekening Bank / E-Wallet (Coming Soon) */}
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden relative">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
             <div className="bg-white px-6 py-3 rounded-2xl shadow-xl shadow-blue-500/10 border border-gray-100 flex items-center gap-2">
               <i className="ph-fill ph-rocket text-accent-500 text-2xl"></i>
               <span className="font-bold text-gray-800">Segera Hadir</span>
             </div>
          </div>
          <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
               <i className="ph-fill ph-wallet"></i>
             </div>
             <h3 className="text-blue-900 font-bold">Rekening Bank / E-Wallet</h3>
          </div>
          <div className="p-5 md:p-6 space-y-5 opacity-40 pointer-events-none">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nama Bank</label>
              <input type="text" disabled className="block w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value="Bank Central Asia (BCA)" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nomor Rekening</label>
              <input type="text" disabled className="block w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value="1234567890" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Atas Nama</label>
              <input type="text" disabled className="block w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value="UMKM Tutahtitah" />
            </div>
          </div>
        </div>

        {/* Logout Section */}
        <div className="pt-4">
          <button 
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 border border-red-100 px-6 py-4 rounded-2xl font-bold text-lg hover:bg-red-500 hover:text-white transition-all flex justify-center items-center gap-2"
          >
            <i className="ph-fill ph-sign-out text-2xl"></i> Keluar dari Akun
          </button>
        </div>

      </div>
    </div>
  );
}

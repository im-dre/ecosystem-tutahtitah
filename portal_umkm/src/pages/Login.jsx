import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Check if user came from a password reset email
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      handleSetNewPassword();
    }
  }, []);

  const handleSetNewPassword = async () => {
    const { value: formValues } = await Swal.fire({
      title: '🔑 Buat Password Baru',
      html: `
        <input id="swal-input1" type="password" class="swal2-input" placeholder="Password Baru (min 6 karakter)">
        <input id="swal-input2" type="password" class="swal2-input" placeholder="Konfirmasi Password Baru">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#004aad',
      preConfirm: () => {
        const p1 = document.getElementById('swal-input1').value;
        const p2 = document.getElementById('swal-input2').value;
        if (!p1 || p1.length < 6) {
          Swal.showValidationMessage('Password minimal 6 karakter!');
          return false;
        }
        if (p1 !== p2) {
          Swal.showValidationMessage('Konfirmasi password tidak cocok!');
          return false;
        }
        return p1;
      }
    });

    if (formValues) {
      const toastId = toast.loading('Menyimpan password baru...');
      const { error } = await supabase.auth.updateUser({ password: formValues });
      
      if (error) {
        toast.error(`Gagal mereset password: ${error.message}`, { id: toastId });
      } else {
        toast.success('Password berhasil diubah! Silakan login.', { id: toastId });
        navigate('/login');
      }
    }
    // Clean up hash
    window.location.hash = '';
  };

  const handleForgotPassword = async () => {
    const { value: emailInput } = await Swal.fire({
      title: '🔑 Lupa Password?',
      text: 'Masukkan email Anda. Link reset password akan dikirim ke email tersebut:',
      input: 'email',
      inputPlaceholder: 'email@contoh.com',
      showCancelButton: true,
      confirmButtonText: 'Kirim Link',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#004aad'
    });

    if (!emailInput) return;

    const toastId = toast.loading('Mengirim link reset password...');
    const currentUrl = window.location.origin + '/login?app=umkm';

    const { error } = await supabase.auth.resetPasswordForEmail(emailInput.trim(), {
      redirectTo: currentUrl
    });

    if (error) {
      toast.error(`Gagal mengirim link: ${error.message}`, { id: toastId });
    } else {
      toast.success('Link reset password telah dikirim ke email Anda!', { id: toastId });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await signIn({ email, password });
    
    if (error) {
      setError('Login gagal. Periksa kembali email dan password Anda.');
    } else {
      navigate('/');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-500 flex flex-col md:flex-row relative overflow-hidden font-sans">
      {/* 
        ========================================
        LEFT SIDE (BRANDING) / TOP (MOBILE)
        ========================================
      */}
      <div className="w-full h-64 md:h-screen md:w-1/2 lg:w-[55%] relative flex flex-col justify-center items-center p-6 shrink-0 z-0">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 opacity-90 z-0"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 z-0"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500 opacity-10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 z-0"></div>
        
        {/* Branding Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto md:-mt-10">
          <div className="mb-4 bg-white/10 backdrop-blur-md p-4 rounded-3xl shadow-lg border border-white/20 inline-flex items-center justify-center">
            <i className="ph-fill ph-storefront text-5xl md:text-7xl text-accent-500 drop-shadow-md"></i>
          </div>
          <h2 className="text-sm md:text-lg font-bold text-brand-100 tracking-[0.2em] uppercase mb-2">
            Portal Mitra UMKM
          </h2>
          <div className="flex font-sans font-black italic text-4xl md:text-6xl tracking-tighter leading-none shadow-sm mb-4">
            <span className="text-accent-500 drop-shadow-lg">TUTAH</span>
            <span className="text-white drop-shadow-lg">TITAH</span>
          </div>
          <p className="text-brand-50 text-xs md:text-sm font-medium leading-relaxed max-w-xs hidden md:block opacity-80">
            Kelola toko Anda dengan mudah, pantau pesanan, dan tingkatkan penjualan dalam satu platform terpadu.
          </p>
        </div>
      </div>

      {/* 
        ========================================
        RIGHT SIDE (FORM) / BOTTOM SHEET (MOBILE)
        ========================================
      */}
      <div className="flex-1 w-full md:w-1/2 lg:w-[45%] bg-white rounded-t-[40px] md:rounded-none md:rounded-l-[40px] flex flex-col justify-center px-6 py-10 md:px-12 lg:px-20 relative z-10 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.1)] -mt-10 md:mt-0 pb-12 overflow-y-auto custom-scroll">
        
        {/* Pull Indicator (Mobile Only) */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 md:hidden"></div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 tracking-tight">Selamat Datang 👋</h3>
            <p className="text-sm text-gray-500 font-medium">Masuk untuk mengelola toko Anda hari ini.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border-l-4 border-red-500 p-4 rounded-xl flex gap-3 items-start animate-fade-in shadow-sm">
                <i className="ph-fill ph-warning-circle text-red-500 text-lg mt-0.5"></i>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 ml-1">Email Anda</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                  <i className="ph-fill ph-envelope-simple text-xl"></i>
                </div>
                <input 
                  type="email" 
                  required 
                  className="block w-full pl-11 pr-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-gray-50 focus:bg-white text-gray-900 transition-all outline-none font-medium placeholder:text-gray-400 placeholder:font-normal" 
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-sm font-bold text-gray-700">Password</label>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors focus:outline-none focus:underline"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                  <i className="ph-fill ph-lock-key text-xl"></i>
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  className="block w-full pl-11 pr-12 py-3.5 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-gray-50 focus:bg-white text-gray-900 transition-all outline-none font-medium placeholder:text-gray-400 placeholder:font-normal" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-500 transition-colors focus:outline-none"
                >
                  <i className={`ph-fill ${showPassword ? 'ph-eye-slash' : 'ph-eye'} text-xl`}></i>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-[0_8px_16px_-6px_rgba(0,74,173,0.4)] hover:shadow-[0_12px_20px_-6px_rgba(0,74,173,0.5)] text-sm font-black text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/30 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                {loading ? <i className="ph ph-spinner-gap animate-spin text-2xl"></i> : 'Masuk Sekarang'}
              </button>
            </div>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm font-medium text-gray-500">
              Belum punya akun mitra?{' '}
              <Link to="/register" className="font-black text-brand-600 hover:text-brand-800 focus:outline-none focus:underline underline-offset-4 transition-colors">
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

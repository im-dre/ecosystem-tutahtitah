import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          // Cek apakah user sudah punya profil customer
          const { data: custData } = await supabase
            .from('customers')
            .select('id')
            .eq('auth_id', data.user.id)
            .maybeSingle();

          if (!custData) {
            // Jika belum ada, buatkan profil customer otomatis
            await supabase
              .from('customers')
              .insert([
                {
                  auth_id: data.user.id,
                  name: email.split('@')[0],
                  email: email.trim(),
                  phone: '-',
                  saved_addresses: []
                }
              ]);
          }

          navigate('/');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          // insert profile to customers table
          const { error: insertError } = await supabase
            .from('customers')
            .insert([
              {
                auth_id: data.user.id,
                name: name,
                email: email.trim(),
                phone: phone,
                saved_addresses: []
              }
            ]);

          if (insertError) throw insertError;

          // Registration and profile insertion complete
          navigate('/');
        }
      }
    } catch (error) {
      setErrorMsg(error.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  if (isLogin) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-xl sm:border-x sm:border-gray-100 overflow-hidden">
        {/* Top Illustration Section */}
        <div className="w-full pt-4 pb-2 flex justify-center bg-white">
          <div className="w-10/12 max-w-[280px] rounded-[32px] overflow-hidden shadow-lg border-4 border-gray-50/50">
            <img
              src="/gambar-form-login.webp"
              alt="Login Illustration"
              className="w-full h-auto block"
            />
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 px-8 pt-6 pb-10 flex flex-col">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-[#0a1930] mb-1 tracking-tight">Selamat Datang!</h1>
            <p className="text-gray-400 text-sm font-medium">
              Masuk untuk menikmati layanan terbaik dari{' '}
              <span className="inline-block bg-[#004aad] px-1.5 py-0.5 rounded-sm tracking-tight shadow-sm transform -translate-y-px" style={{ fontFamily: "'Anton', sans-serif", WebkitTextStroke: '0.4px currentColor' }}>
                <span className="text-[#ffde59]">TUTAH</span>
                <span className="text-[#ffffff]">TITAH</span>
              </span>
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm text-red-600 text-center font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Mail size={18} strokeWidth={2.5} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-4 focus:ring-[#2f6bf3]/20 focus:border-[#2f6bf3] outline-none transition-all font-medium"
                placeholder="Email"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} strokeWidth={2.5} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-4 focus:ring-[#2f6bf3]/20 focus:border-[#2f6bf3] outline-none transition-all font-medium"
                placeholder="Password"
              />
            </div>

            <div className="flex justify-center mt-3 mb-4">
              <button type="button" className="text-xs font-semibold text-gray-400 hover:text-gray-600 border-b border-gray-300 pb-0.5 transition-colors">
                Lupa Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f3d87] hover:bg-[#0f3d87]/90 text-white font-bold py-4 rounded-full shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Masuk Sekarang</span>}
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="w-full bg-[#ffcc00] hover:bg-yellow-400 text-[#0f3d87] font-extrabold py-4 rounded-full shadow-lg transition-all mt-2"
            >
              Buat Akun Baru
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Register View
  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-xl sm:border-x sm:border-gray-100 relative overflow-hidden">
      {/* Decorative Elements matching the reference */}
      {/* Top Left/Center Yellow Blob */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#ffcc00] rounded-full opacity-90 blur-[1px]"></div>
      {/* Top Right Blue Circle */}
      <div className="absolute top-12 right-12 w-16 h-16 bg-[#2f6bf3] rounded-full"></div>

      {/* Bottom Right Navy Blob - Resized to not overlap text */}
      <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-[#0a1930] rounded-full"></div>
      {/* Bottom Center Yellow Circle */}
      <div className="absolute bottom-24 right-28 w-10 h-10 bg-[#ffcc00] rounded-full"></div>

      <div className="flex-1 px-10 pt-32 pb-12 flex flex-col relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-[#0a1930] mb-2 tracking-tight">Buat Akun Baru</h1>
          <p className="text-gray-400 text-sm font-medium">
            Daftar sekarang dan mulai kemudahan bersama{' '}
            <span className="inline-block bg-[#004aad] px-1.5 py-0.5 rounded-sm tracking-tight shadow-sm transform -translate-y-px" style={{ fontFamily: "'Anton', sans-serif", WebkitTextStroke: '0.4px currentColor' }}>
              <span className="text-[#ffde59]">TUTAH</span>
              <span className="text-[#ffffff]">TITAH</span>
            </span>
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm text-red-600 text-center font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6 flex-1">
          <div className="relative">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full py-2 bg-transparent border-b-2 border-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:border-[#2f6bf3] outline-none transition-colors font-medium"
              placeholder="Nama Lengkap"
            />
          </div>
          <div className="relative">
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full py-2 bg-transparent border-b-2 border-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:border-[#2f6bf3] outline-none transition-colors font-medium"
              placeholder="Nomor WhatsApp / HP"
            />
          </div>
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full py-2 bg-transparent border-b-2 border-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:border-[#2f6bf3] outline-none transition-colors font-medium"
              placeholder="Email"
            />
          </div>
          <div className="relative">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full py-2 bg-transparent border-b-2 border-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:border-[#2f6bf3] outline-none transition-colors font-medium"
              placeholder="Password"
            />
          </div>

          <div className="pt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ffcc00] hover:bg-yellow-400 text-[#0f3d87] font-extrabold py-4 rounded-full shadow-lg shadow-yellow-200 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Daftar Akun</span>}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center pb-2">
          <p className="text-xs text-gray-400 font-medium bg-white/80 inline-block px-3 py-1 rounded-full">
            Sudah punya akun?{' '}
            <button type="button" onClick={() => setIsLogin(true)} className="font-bold text-[#0a1930] hover:text-black">
              Masuk di sini
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

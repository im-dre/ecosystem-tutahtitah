import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, ArrowRight, Loader2 } from 'lucide-react';

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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col sm:border-x sm:border-gray-200 shadow-xl">
      <div className="flex-1 flex flex-col justify-center px-8 pb-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-3xl font-bold text-accent">T</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {isLogin ? 'Selamat Datang!' : 'Buat Akun Baru'}
          </h1>
          <p className="text-gray-500 mt-2">
            {isLogin ? 'Masuk untuk menikmati layanan terbaik kami.' : 'Daftar sekarang dan mulai kemudahan bersama kami.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-sm text-red-600 text-center font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Nama Lengkap</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Nomor WhatsApp / HP</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  placeholder="08123456789"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="johndoe@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {isLogin && (
            <div className="flex justify-end mt-2">
              <button type="button" className="text-sm font-semibold text-primary hover:text-blue-800 transition-colors">
                Lupa Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-primary hover:bg-blue-800 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-200/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span>{isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold text-primary hover:text-blue-800 transition-colors"
            >
              {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

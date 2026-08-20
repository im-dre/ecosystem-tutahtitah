import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email tidak boleh kosong');
      return;
    }

    setLoading(true);

    try {
      // Panggil Edge Function 'send-recovery-email' via supabase
      const { data, error } = await supabase.functions.invoke('send-recovery-email', {
        body: {
          email: email.trim(),
          role: 'customer', // Karena ini aplikasi customer
          origin: window.location.origin
        }
      });

      if (error) {
        throw new Error(error.message || 'Gagal mengirim email reset password');
      }

      if (data && data.success === false) {
        throw new Error(data.error || 'Terjadi kesalahan pada server');
      }

      setIsSuccess(true);
      toast.success('Tautan reset sandi telah dikirim ke email Anda!');
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error.message || 'Gagal mengirim tautan reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-xl sm:border-x sm:border-gray-100 overflow-hidden font-sans relative">
      {/* Header with Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => navigate('/auth')}
          className="w-10 h-10 bg-white/80 backdrop-blur-md border border-gray-100 rounded-full flex items-center justify-center text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Top Illustration Section */}
      <div className="w-full pt-16 pb-6 flex justify-center bg-blue-50/50">
        <div className="w-9/12 max-w-[240px] rounded-3xl overflow-hidden shadow-sm border border-blue-100 bg-white p-4">
          <img
            src="/gambar-form-login.webp" // Menggunakan ilustrasi yang sama dengan Auth
            alt="Forgot Password Illustration"
            className="w-full h-auto block"
            onError={(e) => {
              // Fallback icon jika gambar tidak ditemukan
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none' }} className="w-full aspect-square bg-blue-50 items-center justify-center rounded-2xl">
            <Mail size={64} className="text-primary opacity-50" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-8 bg-white relative z-10 rounded-t-[32px] -mt-6 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)]">
        <div className="text-center pt-8 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-wide">
            LUPA PASSWORD?
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Tenang, masukkan email akun kamu dan kami akan mengirimkan tautan untuk mengatur ulang password.
          </p>
        </div>

        {isSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Cek Email Kamu!</h3>
            <p className="text-sm text-gray-600 font-medium mb-6">
              Kami telah mengirimkan tautan pemulihan ke <span className="font-bold text-gray-900">{email}</span>. Silakan cek folder Inbox atau Spam.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3.5 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 active:scale-95 transition-all"
            >
              Kembali ke Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Email Akun</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent text-gray-900 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder:font-normal placeholder:text-gray-400"
                  placeholder="contoh@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3.5 mt-2 bg-primary text-white font-bold rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-[0_8px_20px_-8px_rgba(0,74,173,0.5)] hover:shadow-[0_12px_24px_-8px_rgba(0,74,173,0.6)] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Tautan Reset'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

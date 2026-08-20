import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Memastikan user memiliki session (via access_token dari URL)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !location.hash) {
        toast.error('Tautan tidak valid atau sudah kedaluwarsa.');
        navigate('/auth');
      }
    };
    checkSession();
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Password tidak cocok!');
      return;
    }
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast.success('Password berhasil diperbarui!');
    } catch (error) {
      console.error('Update password error:', error);
      toast.error(error.message || 'Gagal memperbarui password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-xl sm:border-x sm:border-gray-100 overflow-hidden font-sans relative">
      {/* Top Illustration Section */}
      <div className="w-full pt-16 pb-6 flex justify-center bg-blue-50/50">
        <div className="w-9/12 max-w-[240px] rounded-3xl overflow-hidden shadow-sm border border-blue-100 bg-white p-4">
          <img
            src="/gambar-form-login.webp"
            alt="Update Password Illustration"
            className="w-full h-auto block"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none' }} className="w-full aspect-square bg-blue-50 items-center justify-center rounded-2xl">
            <Lock size={64} className="text-primary opacity-50" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-8 bg-white relative z-10 rounded-t-[32px] -mt-6 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)]">
        <div className="text-center pt-8 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-wide">
            BUAT PASSWORD BARU
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Silakan masukkan password baru untuk akun kamu.
          </p>
        </div>

        {isSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Berhasil!</h3>
            <p className="text-sm text-gray-600 font-medium mb-6">
              Password kamu berhasil diperbarui. Silakan login kembali dengan password baru.
            </p>
            <button
              onClick={() => {
                supabase.auth.signOut();
                navigate('/auth');
              }}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-[0_8px_20px_-8px_rgba(0,74,173,0.5)]"
            >
              Login Sekarang
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Password Baru</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border-2 border-transparent text-gray-900 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder:font-normal placeholder:text-gray-400"
                  placeholder="Minimal 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Konfirmasi Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border-2 border-transparent text-gray-900 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder:font-normal placeholder:text-gray-400"
                  placeholder="Ulangi password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3.5 mt-2 bg-primary text-white font-bold rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-[0_8px_20px_-8px_rgba(0,74,173,0.5)] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Password Baru'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

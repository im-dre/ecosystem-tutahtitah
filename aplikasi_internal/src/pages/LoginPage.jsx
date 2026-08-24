// ==========================================================================
// LOGINPAGE.JSX — Halaman Login + First Time Setup (Bos Admin Pertama)
// Di-extract dari App.jsx (blok if (!user) return ...). State tetap di App.jsx,
// semua di-passing via props (props-drilling pattern).
// ==========================================================================
import React from "react";
import { Toaster } from "react-hot-toast";
import NotifToast from "../components/ui/NotifToast";

export default function LoginPage({
    notif,
    needsInitialSetup, isSetupMode, setIsSetupMode,
    hrForm, setHrForm, isSubmittingHr, submitRegisterEmployee,
    isKurirApp,
    handleLogin, handleForgotPassword,
    emailInput, setEmailInput, pinInput, setPinInput, isLoggingIn,
}) {
    return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4 font-sans relative">
            {/* PANGGUNG TOASTER UNTUK HALAMAN LOGIN */}
            <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff', borderRadius: '10px' } }} />

            <NotifToast notif={notif} />

            {needsInitialSetup && !isSetupMode && (
                <div className="absolute top-4 w-full flex justify-center z-40">
                    <button onClick={() => setIsSetupMode(true)} className="bg-red-500 animate-pulse text-white px-6 py-2 rounded-full font-bold shadow-lg">
                        ⚠️ Sistem Kosong! Klik di sini untuk membuat Akun Bos Admin Pertama
                    </button>
                </div>
            )}

            {isSetupMode ? (
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-red-200 text-left relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Setup Bos Admin</h2>
                    <p className="text-xs text-gray-500 mb-6 font-medium">Ini hanya dilakukan 1x. Setelah Bos Admin dibuat, pendaftaran karyawan lain dilakukan di dalam Dashboard.</p>
                    <form onSubmit={(e) => { e.preventDefault(); submitRegisterEmployee(true); }} className="space-y-4">
                        <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nama Lengkap</label><input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500" value={hrForm.full_name} onChange={e => setHrForm({ ...hrForm, full_name: e.target.value })} /></div>
                        <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Alamat Email (Untuk Login)</label><input type="email" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500" value={hrForm.email} onChange={e => setHrForm({ ...hrForm, email: e.target.value })} /></div>
                        <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">PIN Rahasia (Minimal 6 Angka/Huruf)</label><input type="password" required minLength="6" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500" value={hrForm.pin} onChange={e => setHrForm({ ...hrForm, pin: e.target.value })} /></div>
                        <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nomor WhatsApp Aktif</label><input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500" value={hrForm.phone} onChange={e => setHrForm({ ...hrForm, phone: e.target.value })} /></div>
                        <button type="submit" disabled={isSubmittingHr} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl shadow-md transition disabled:opacity-50 mt-4">
                            {isSubmittingHr ? 'Menyimpan ke Server...' : 'Buat Akun Bos Admin'}
                        </button>
                        <button type="button" onClick={() => setIsSetupMode(false)} className="w-full text-xs font-bold text-gray-500 mt-2 hover:text-gray-800">Batal</button>
                    </form>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-gray-100 text-center relative overflow-hidden">
                    <div className="w-28 h-28 mx-auto mb-6 bg-[#004aad] rounded-full flex items-center justify-center shadow-lg border-4 border-blue-50 overflow-hidden p-2">
                        {/* <img src="/logo-tutahtitah-biru.webp" alt="Tutah Titah Logo" className="w-full h-full object-contain" /> */}
                        <img
                            src={isKurirApp ? "/kurir-tutahtitah.webp" : "/admin-tutahtitah.webp"}
                            alt={isKurirApp ? "Logo Kurir Tutah" : "Logo Admin Tutah"}
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="email" placeholder="Alamat Email" required className="w-full text-center text-sm font-bold px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#004aad] transition" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={isLoggingIn} />
                        <input type="password" placeholder="PIN" required className="w-full text-center text-2xl tracking-[0.5em] font-bold px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#004aad] transition shadow-inner" value={pinInput} onChange={(e) => setPinInput(e.target.value)} disabled={isLoggingIn} />
                        <button type="submit" disabled={isLoggingIn} className="w-full bg-[#004aad] hover:bg-[#003b8a] text-white font-bold py-3.5 rounded-xl shadow-md transition transform hover:-translate-y-1 mt-2">{isLoggingIn ? 'Otentikasi...' : 'Login'}</button>
                    </form>

                    <button type="button" onClick={handleForgotPassword} className="w-full text-xs font-bold text-[#004aad] hover:underline mt-4 mb-4 text-center transition">
                        🔑 Lupa PIN Login?
                    </button>

                    <h4 className="text-xs text-gray-500 mb-6 font-medium">Secured by Supabase Auth 🔒</h4>
                </div>
            )}
        </div>
    );
}

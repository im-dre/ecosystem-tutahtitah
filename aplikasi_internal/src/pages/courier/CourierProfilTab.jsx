// ==========================================================================
// COURIERPROFILTAB.JSX — Tab Profil Kurir (di-extract dari App.jsx)
// State lokal (edit mode, form profil, show PIN, saving) hidup di sini.
// State global (user, courierProfile) + aksi (onSave, handleLogout) via props.
// ==========================================================================
import { useState } from "react";

export default function CourierProfilTab({ user, courierProfile, onSave, handleLogout }) {
    // STATE LOKAL — eksklusif tab profil
    const [isEditingCourierProfile, setIsEditingCourierProfile] = useState(false);
    const [courierProfileForm, setCourierProfileForm] = useState({});
    const [showCourierPin, setShowCourierPin] = useState(false);
    const [isSavingCourierProfile, setIsSavingCourierProfile] = useState(false);

    const buildFormFromProfile = () => ({
        full_name: courierProfile?.full_name || '',
        email: courierProfile?.email || '',
        phone: courierProfile?.phone || '',
        bank_name: courierProfile?.bank_name || '',
        account_number: courierProfile?.account_number || '',
        bank_name_2: courierProfile?.bank_name_2 || '',
        account_number_2: courierProfile?.account_number_2 || '',
        pin: courierProfile?.pin || ''
    });

    const handleEditCourierProfile = () => {
        setCourierProfileForm(buildFormFromProfile());
        setIsEditingCourierProfile(true);
    };

    const handleSaveCourierProfile = async () => {
        setIsSavingCourierProfile(true);
        const success = await onSave(courierProfileForm);
        setIsSavingCourierProfile(false);
        if (success) setIsEditingCourierProfile(false);
    };

    return (
        <div className="pb-4">

            {/* ── PROFILE HEADER (compact, branded) ── */}
            <div className="relative md:hidden bg-[#004aad] px-4 pt-4 pb-0 overflow-hidden">
                {/* Subtle decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-[#ffde59]/10 translate-y-1/2 pointer-events-none"></div>

                <div className="relative z-10 flex items-center gap-3 mb-3">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-[#ffde59] shrink-0 overflow-hidden p-1.5">
                        <img src="/kurir-tutahtitah.webp" alt="Avatar" className="w-full h-full object-contain" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-white leading-tight truncate">{user?.name}</h2>
                        <p className="text-[10px] text-blue-200 font-medium truncate">{user?.email}</p>
                        <span className="inline-block mt-1 bg-[#ffde59] text-[#004aad] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Mitra Kurir</span>
                    </div>
                    {/* Edit button */}
                    {courierProfile && !isEditingCourierProfile && (
                        <button onClick={handleEditCourierProfile} className="shrink-0 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                            ✏️ Edit
                        </button>
                    )}
                </div>

                {/* Bottom tab bar shadow separator */}
                <div className="h-3 bg-[#eef3fb] rounded-t-2xl -mx-4 relative z-10"></div>
            </div>

            {courierProfile ? (
                <div className="px-4 space-y-2 mt-1 md:mt-4 md:px-6">

                    {/* ── DESKTOP PROFILE HEADER ── */}
                    <div className="hidden md:flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Pengaturan Profil</h2>
                            <p className="text-xs text-gray-500">Kelola informasi pribadi dan rekening</p>
                        </div>
                        {courierProfile && !isEditingCourierProfile && (
                            <button onClick={handleEditCourierProfile} className="bg-blue-50 text-[#004aad] text-xs font-bold px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition flex items-center gap-2">
                                ✏️ Edit Profil
                            </button>
                        )}
                    </div>
                    {/* ── SECTION: INFO PRIBADI ── */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-50">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#004aad]">Informasi Pribadi</span>
                        </div>

                        {isEditingCourierProfile ? (
                            <div className="px-4 py-3 space-y-2.5">
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Nama Lengkap</label>
                                    <input type="text" className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-[#004aad] focus:bg-white transition" value={courierProfileForm.full_name} onChange={e => setCourierProfileForm({ ...courierProfileForm, full_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Email Login</label>
                                    <input type="email" className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-[#004aad] focus:bg-white transition" value={courierProfileForm.email} onChange={e => setCourierProfileForm({ ...courierProfileForm, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Nomor WhatsApp</label>
                                    <input type="text" className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-[#004aad] focus:bg-white transition" value={courierProfileForm.phone} onChange={e => setCourierProfileForm({ ...courierProfileForm, phone: e.target.value })} />
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                <div className="flex justify-between items-center px-4 py-2.5">
                                    <span className="text-xs text-gray-400 font-medium w-24 shrink-0">Nama</span>
                                    <span className="text-xs font-bold text-gray-900 text-right truncate">{courierProfile.full_name || user?.name || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-2.5">
                                    <span className="text-xs text-gray-400 font-medium w-24 shrink-0">Email</span>
                                    <span className="text-xs font-bold text-gray-900 text-right truncate">{courierProfile.email || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-2.5">
                                    <span className="text-xs text-gray-400 font-medium w-24 shrink-0">WhatsApp</span>
                                    <span className="text-xs font-bold text-gray-900 text-right">{courierProfile.phone || '-'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* ── SECTION: REKENING / E-WALLET ── */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-50">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#004aad]">Rekening & E-Wallet</span>
                        </div>

                        {isEditingCourierProfile ? (
                            <div className="px-4 py-3 space-y-2.5">
                                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">Rekening Utama</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] text-gray-400">Nama Bank / Dompet</label>
                                        <input type="text" className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 mt-1 outline-none focus:border-[#004aad] focus:bg-white transition" value={courierProfileForm.bank_name} onChange={e => setCourierProfileForm({ ...courierProfileForm, bank_name: e.target.value })} placeholder="Contoh: BCA" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-gray-400">Nomor</label>
                                        <input type="text" className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 mt-1 outline-none focus:border-[#004aad] focus:bg-white transition" value={courierProfileForm.account_number} onChange={e => setCourierProfileForm({ ...courierProfileForm, account_number: e.target.value })} placeholder="0812345678" />
                                    </div>
                                </div>
                                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mt-2 mb-1">Rekening Alternatif (Opsional)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] text-gray-400">Nama Bank / Dompet</label>
                                        <input type="text" className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 mt-1 outline-none focus:border-[#004aad] focus:bg-white transition" value={courierProfileForm.bank_name_2} onChange={e => setCourierProfileForm({ ...courierProfileForm, bank_name_2: e.target.value })} placeholder="Contoh: OVO" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-gray-400">Nomor</label>
                                        <input type="text" className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 mt-1 outline-none focus:border-[#004aad] focus:bg-white transition" value={courierProfileForm.account_number_2} onChange={e => setCourierProfileForm({ ...courierProfileForm, account_number_2: e.target.value })} placeholder="0812345678" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {/* Rekening Utama */}
                                <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                                    <div className="shrink-0">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Utama</p>
                                    </div>
                                    {(courierProfile.bank_name || courierProfile.account_number) ? (
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-[#004aad] notranslate">{courierProfile.bank_name || '-'}</p>
                                            <p className="text-[10px] font-mono text-gray-600 notranslate">{courierProfile.account_number || '-'}</p>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-300 italic">Belum diisi</span>
                                    )}
                                </div>
                                {/* Rekening Alternatif */}
                                <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                                    <div className="shrink-0">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Alternatif</p>
                                    </div>
                                    {(courierProfile.bank_name_2 || courierProfile.account_number_2) ? (
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-[#004aad] notranslate">{courierProfile.bank_name_2 || '-'}</p>
                                            <p className="text-[10px] font-mono text-gray-600 notranslate">{courierProfile.account_number_2 || '-'}</p>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-300 italic">Belum diisi</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* ── SECTION: KEAMANAN / PIN ── */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-50">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#004aad]">Keamanan</span>
                        </div>

                        {isEditingCourierProfile ? (
                            <div className="px-4 py-3">
                                <label className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">PIN Login Baru</label>
                                <input type="text" className="w-full text-sm font-mono font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-red-400 focus:bg-white transition tracking-widest" value={courierProfileForm.pin} onChange={e => setCourierProfileForm({ ...courierProfileForm, pin: e.target.value })} placeholder="Min. 6 karakter" />
                            </div>
                        ) : (
                            <div className="px-4 py-2.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">PIN Login</p>
                                    <p className="text-sm font-mono font-bold text-gray-900 tracking-[0.3em] mt-0.5">{showCourierPin ? courierProfile.pin : '••••••'}</p>
                                </div>
                                <button onClick={() => setShowCourierPin(!showCourierPin)} className="text-[10px] font-bold text-[#004aad] bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-100 transition">
                                    {showCourierPin ? '🙈 Sembunyikan' : '👁️ Lihat'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── EDIT MODE ACTION BUTTONS ── */}
                    {isEditingCourierProfile && (
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => {
                                setIsEditingCourierProfile(false);
                                setCourierProfileForm(buildFormFromProfile());
                            }} className="flex-[0.8] bg-white text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50 transition border border-gray-200 shadow-sm">
                                Batal
                            </button>
                            <button onClick={handleSaveCourierProfile} disabled={isSavingCourierProfile} className="flex-[1.2] bg-[#004aad] text-white font-bold py-3 rounded-xl shadow-md text-sm hover:bg-blue-800 transition disabled:opacity-60">
                                {isSavingCourierProfile ? 'Menyimpan...' : '✓  Simpan Perubahan'}
                            </button>
                        </div>
                    )}

                    {/* ── LOGOUT ── */}
                    {!isEditingCourierProfile && (
                        <div className="pt-1">
                            <button onClick={handleLogout} className="w-full bg-white hover:bg-red-50 text-red-500 font-bold py-3 px-4 rounded-2xl border border-gray-100 shadow-sm transition flex items-center justify-between group">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-base">🚪</span>
                                    <span className="text-sm">Keluar Akun</span>
                                </div>
                                <span className="text-red-200 group-hover:text-red-400 transition text-xs font-bold">❯</span>
                            </button>
                        </div>
                    )}

                </div>
            ) : (
                <div className="flex items-center justify-center p-10 text-gray-400 text-sm">Memuat profil...</div>
            )}

        </div>
    );
}

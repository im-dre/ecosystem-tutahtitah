import { useEffect, useMemo, useState } from "react";
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { GAS_API_URL } from "../../lib/firebase";
import MerchantActivityModal from '../../components/modals/MerchantActivityModal';

// ✅ [LEVEL 3 #11] Tab Manajemen Publik (Portal UMKM & Testimoni) — di-extract dari App.jsx
// Props:
// - supabase: Supabase client (dari lib/supabase, di-passing dari App.jsx)
// - portalTab, setPortalTab: sub-tab aktif portal (state global di App.jsx)
// - searchVerifiedToko, setSearchVerifiedToko: pencarian toko terverifikasi
// - isPortalLoading: flag loading data portal
// - portalUmkmData, setPortalUmkmData: data merchant UMKM (state global di App.jsx)
// - portalTestimoniData, setPortalTestimoniData: data testimoni dari Google Sheets
// - isLoadingTestimoni, setIsLoadingTestimoni: flag loading testimoni
// - expandedStores, toggleStoreProducts: accordion produk toko terverifikasi

export default function AdminPortalTab({
    supabase,
    portalTab, setPortalTab,
    searchVerifiedToko, setSearchVerifiedToko,
    isPortalLoading,
    portalUmkmData, setPortalUmkmData,
    portalTestimoniData, setPortalTestimoniData,
    isLoadingTestimoni, setIsLoadingTestimoni,
    expandedStores, toggleStoreProducts
}) {
    const [activityMerchant, setActivityMerchant] = useState(null);
    const fetchPortalData = async () => {
        try {
            console.log("🚀 [MULAI DETEKTIF] Menarik data Portal Publik...");

            // ==========================================
            // 1. TARIK DATA DARI SUPABASE (merchants & products)
            // ==========================================
            const { data: merchantsData, error: sbError } = await supabase
                .from('merchants')
                .select('id, name, description, address, logo_url, operating_hours, status, rejection_reason, suspension_reason, resubmission_note, products(id, name, price, image_url, category, is_available)')
                .in('status', ['pending_review', 'approved', 'suspended'])
                .limit(1000);

            if (sbError) {
                console.error("Gagal menarik data dari Supabase:", sbError);
                throw sbError;
            }

            const finalMergedData = (merchantsData || [])
                .map(m => {
                    let hoursStr = "Belum diatur";
                    if (Array.isArray(m.operating_hours)) {
                        const openDays = m.operating_hours.filter(h => h.is_open);
                        if (openDays.length > 0) {
                            hoursStr = openDays.length === 7 ? "Buka Setiap Hari" : `${openDays.length} Hari Buka`;
                            hoursStr += ` (${openDays[0].open} - ${openDays[0].close})`;
                        } else if (m.operating_hours.length > 0) {
                            hoursStr = "Tutup Sementara";
                        }
                    } else if (typeof m.operating_hours === 'string') {
                        hoursStr = m.operating_hours;
                    }

                    return {
                        id: m.id,
                        nama_toko: m.name,
                        deskripsi: m.description || "",
                        alamat: m.address || "",
                        logoUrl: m.logo_url || "",
                        jam_operasional: hoursStr,
                        status: m.status.toLowerCase(),
                        rejection_reason: m.rejection_reason || '',
                        suspension_reason: m.suspension_reason || '',
                        resubmission_note: m.resubmission_note || '',
                        produk: (m.products || []).map(p => ({
                            id_produk: p.id,
                            nama_produk: p.name,
                            deskripsi: p.description || "",
                            harga: p.price || 0,
                            foto_url: p.image_url || "",
                            kategori_produk: p.category || "",
                            is_available: p.is_available !== false
                        })),
                        alasan_suspend: m.suspension_reason || null,
                        alasan_penolakan: m.rejection_reason || null
                    };
                });

            console.log("✅ [HASIL MERGE SUPABASE] Data akhir yang siap dirender:", finalMergedData);
            setPortalUmkmData(finalMergedData);

            // ==========================================
            // 3. TARIK DATA TESTIMONI DARI GOOGLE SHEETS
            // ==========================================
            // Sebelum mulai nge-fetch GAS
            setIsLoadingTestimoni(true);

            try {
                const gasResponse = await fetch(`${GAS_API_URL}?action=getPendingReviews`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const gasResult = await gasResponse.json();

                // Deteksi struktur kembalian GAS berdasarkan screenshot terbaru lo
                if (gasResult && gasResult.testimoni) {
                    // Langsung ambil properti testimoni dari dalam objek
                    setPortalTestimoniData(gasResult.testimoni);
                } else if (Array.isArray(gasResult)) {
                    setPortalTestimoniData(gasResult);
                } else if (gasResult.status === 'success') {
                    setPortalTestimoniData(gasResult.data || []);
                } else {
                    console.error("Gagal menarik testimoni, format tidak dikenali:", gasResult);
                }
            } catch (gasErr) {
                console.error("Error saat fetch API GAS:", gasErr);
            } finally {
                setIsLoadingTestimoni(false);
            }

        } catch (error) {
            console.error("🚨 Error Utama di fetchPortalData:", error);
        }
    };

    // Counter untuk Toko dan Produk yang sudah Live/Terverifikasi
    const totalTokoLive = useMemo(() => {
        return portalUmkmData.filter(item => item.status === 'approved').length;
    }, [portalUmkmData]);

    const totalProdukLive = useMemo(() => {
        let count = 0;
        portalUmkmData.forEach(item => {
            if (item.status === 'approved' && item.produk) {
                count += item.produk.length;
            }
        });
        return count;
    }, [portalUmkmData]);

    const handleReviewAction = async (reviewId, actionType) => {
        // 1. Munculin notif loading (muter-muter)
        const toastId = toast.loading('Memproses data ke Google Sheets...');

        try {
            const payload = {
                action: 'updateReviewStatus',
                review_id: reviewId,
                status: actionType
            };

            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'success') {
                // 2. Kalau sukses, ubah toast loading jadi centang ijo
                toast.success(`Berhasil! Ulasan telah di-${actionType.toLowerCase()}.`, { id: toastId });
                fetchPortalData();
            } else {
                // 3. Kalau gagal dari server
                toast.error(`Gagal: ${result.message}`, { id: toastId });
            }
        } catch (error) {
            console.error("Error jaringan saat update testimoni:", error);
            // 4. Kalau error jaringan (misal wifi putus)
            toast.error("Terjadi kesalahan jaringan.", { id: toastId });
        }
    };

    const handleApproveUMKM = async (umkm) => {
        const toastId = toast.loading(`Memproses persetujuan ${umkm.nama_toko}...`);
        try {
            const { error } = await supabase.rpc('admin_approve_merchant', {
                p_merchant_id: umkm.id
            });
            if (error) throw error;
            toast.success('Toko berhasil disetujui.', { id: toastId });
            fetchPortalData();
        } catch (error) {
            console.error("Error verifikasi UMKM:", error);
            toast.error("Terjadi kesalahan jaringan.", { id: toastId });
        }
    };

    const handleRejectUMKM = async (umkm) => {
        // 1. Ganti prompt() purba dengan SweetAlert2 Input Modal yang Estetik
        const { value: alasan, isConfirmed } = await Swal.fire({
            title: 'Tolak Pengajuan Toko',
            text: `Berikan alasan penolakan untuk ${umkm.nama_toko}:`,
            input: 'textarea',
            inputPlaceholder: 'Cth: Foto produk blur atau alamat kurang spesifik...',
            inputValue: 'Data profil/produk belum lengkap atau foto tidak jelas.',
            showCancelButton: true,
            confirmButtonText: 'Ya, Tolak Toko',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#ef4444', // Warna merah eksekusi
            cancelButtonColor: '#6b7280',  // Warna abu-abu batal
            inputValidator: (value) => {
                if (!value.trim()) {
                    return 'Alasan penolakan tidak boleh kosong, bro!';
                }
            }
        });

        // Jika admin klik 'Batal' atau nutup modal, hentikan fungsi
        if (!isConfirmed) return;

        // 2. Jalankan Toast Loading seperti biasa
        const toastId = toast.loading(`Menolak pengajuan ${umkm.nama_toko}...`);

        try {
            const { error } = await supabase.rpc('admin_reject_merchant', {
                p_merchant_id: umkm.id,
                p_reason: alasan.trim()
            });
            if (error) throw error;

            toast.success("Pengajuan UMKM berhasil ditolak.", { id: toastId });
            fetchPortalData(); // Refresh antrean di dashboard admin
        } catch (error) {
            console.error("Gagal menolak UMKM:", error);
            toast.error("Terjadi kesalahan jaringan.", { id: toastId });
        }
    };

    const handleSuspendUMKM = async (umkm) => {
        const { value: alasan, isConfirmed } = await Swal.fire({
            title: '⚠️ Suspend Toko (Bekukan)',
            text: `Masukkan alasan kenapa toko ${umkm.nama_toko} di-suspend:`,
            input: 'textarea',
            inputPlaceholder: 'Cth: Foto produk fulgar, alamat fiktif...',
            showCancelButton: true,
            confirmButtonText: 'Ya, Suspend Toko',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            inputValidator: (value) => {
                if (!value.trim()) return 'Alasan suspend wajib diisi, bro!';
            }
        });

        if (!isConfirmed) return;

        const toastId = toast.loading(`Mensupend ${umkm.nama_toko}...`);

        try {
            const { error } = await supabase.rpc('admin_suspend_merchant', {
                p_merchant_id: umkm.id,
                p_reason: alasan.trim()
            });
            if (error) throw error;

            toast.success(`Toko ${umkm.nama_toko} resmi dinonaktifkan.`, { id: toastId });
            fetchPortalData();
        } catch {
            toast.error("Gagal memproses suspend.", { id: toastId });
        }
    };

    const handleUnsuspendUMKM = async (umkm) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Pulihkan Toko?',
            text: `Apakah Anda yakin ingin membuka suspend dan mengaktifkan kembali toko ${umkm.nama_toko}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Pulihkan Toko',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280'
        });

        if (!isConfirmed) return;

        const toastId = toast.loading(`Membuka suspend ${umkm.nama_toko}...`);

        try {
            const { error } = await supabase.rpc('admin_approve_merchant', {
                p_merchant_id: umkm.id
            });
            if (error) throw error;

            toast.success(`Toko ${umkm.nama_toko} berhasil dipulihkan & live kembali!`, { id: toastId });
            fetchPortalData();
        } catch {
            toast.error("Gagal memproses pemulihan toko.", { id: toastId });
        }
    };

    // Auto-refresh data portal setiap tab ini dibuka (dependency array kosong = 1x per mount, anti infinite-loop)
    useEffect(() => {
        fetchPortalData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
                                <div className="space-y-6">

                                    {/* 🌟 FIX UI: Sub-Tab dibikin Scrollable (Bisa digeser) di layar HP 🌟 */}
                                    <div className="flex gap-2 p-1.5 bg-gray-200 rounded-xl w-full overflow-x-auto hide-scrollbar mb-6">

                                        <button onClick={fetchPortalData} className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-[11px] sm:text-sm text-[#004aad] bg-blue-50 hover:bg-blue-100 transition border border-blue-200 ml-1">
                                            🔄 Refresh
                                        </button>

                                        {/* 1. Toko Terverifikasi */}
                                        <button onClick={() => setPortalTab('terverifikasi')} className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-[11px] sm:text-sm transition ${portalTab === 'terverifikasi' ? 'bg-blue-200 text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                            ✅ Toko Terverifikasi ({totalTokoLive})
                                        </button>

                                        {/* 2. Verifikasi UMKM Baru */}
                                        <button onClick={() => setPortalTab('umkm')} className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-[11px] sm:text-sm transition ${portalTab === 'umkm' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                            🏪 Verifikasi UMKM ({portalUmkmData.filter(x => x.status === 'pending_review').length})
                                        </button>

                                        {/* 3. BARU: TOKO DI-SUSPEND */}
                                        <button onClick={() => setPortalTab('suspended')} className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-[11px] sm:text-sm transition ${portalTab === 'suspended' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                            🚫 Toko Di-Suspend ({portalUmkmData.filter(x => x.status && x.status.toLowerCase() === 'suspended').length})
                                        </button>

                                                                                                                        {/* 4. Testimoni */}
                                        <button onClick={() => setPortalTab('testimoni')} className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-[11px] sm:text-sm transition ${portalTab === 'testimoni' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                            💬 Verifikasi Testimoni ({portalTestimoniData.length})
                                        </button>

                                        {/* 5. Pengaduan */}
                                        <button onClick={() => setPortalTab('pengaduan')} className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-[11px] sm:text-sm transition ${portalTab === 'pengaduan' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                            🚩 Pusat Pengaduan
                                        </button>

                                    </div>

                                    {isPortalLoading ? (
                                        <div className="p-10 text-center text-gray-500 font-bold animate-pulse">Memuat data publik...</div>
                                    ) : (
                                        <>
                                            {/* ========================================== */}
                                            {/* SUB-TAB: DAFTAR TOKO YANG SUDAH LIVE       */}
                                            {/* ========================================== */}
                                            {portalTab === 'terverifikasi' && (
                                                <div className="space-y-6 animate-fadeIn">

                                                    {/* Ringkasan Statistik */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4">
                                                            <div className="p-3 bg-blue-500 text-white rounded-lg text-2xl">🏪</div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 font-medium">Total Toko Live</p>
                                                                <h4 className="text-2xl font-bold text-gray-800">{totalTokoLive} Toko</h4>
                                                            </div>
                                                        </div>
                                                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-4">
                                                            <div className="p-3 bg-green-500 text-white rounded-lg text-2xl">📦</div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 font-medium">Total Produk Katalog</p>
                                                                <h4 className="text-2xl font-bold text-gray-800">{totalProdukLive} Produk</h4>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* List Toko Aktif */}
                                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                            <h3 className="font-bold text-gray-800 text-sm sm:text-base">Daftar Mitra UMKM & Katalog Produk Aktif</h3>

                                                            {/* 🌟 INPUT SEARCH NAMA TOKO 🌟 */}
                                                            <div className="relative w-full sm:w-64">
                                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Cari Nama Toko..."
                                                                    className="w-full bg-white border border-gray-200 text-gray-800 text-xs rounded-xl pl-8 pr-3 py-2 font-medium outline-none focus:border-[#004aad] shadow-sm transition"
                                                                    value={searchVerifiedToko}
                                                                    onChange={(e) => setSearchVerifiedToko(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="divide-y divide-gray-200">
                                                            {portalUmkmData
                                                                .filter(item => item.status === 'approved')
                                                                .filter(item => (item.nama_toko || '').toLowerCase().includes(searchVerifiedToko.toLowerCase()))
                                                                .length === 0 ? (
                                                                <div className="p-8 text-center text-gray-400 font-medium text-xs sm:text-sm">
                                                                    {searchVerifiedToko ? `Toko dengan kata kunci "${searchVerifiedToko}" tidak ditemukan.` : 'Belum ada toko yang terverifikasi bro.'}
                                                                </div>
                                                            ) : (
                                                                portalUmkmData
                                                                    .filter(item => item.status === 'approved')
                                                                    .filter(item => (item.nama_toko || '').toLowerCase().includes(searchVerifiedToko.toLowerCase()))
                                                                    .map((umkm) => (
                                                                        <div key={umkm.id} className="p-4 sm:p-6 hover:bg-gray-50/50 transition">

                                                                            {/* Info Utama Toko */}
                                                                            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pb-4 border-b border-dashed border-gray-200">
                                                                                <div className="flex items-start gap-3 sm:gap-4">
                                                                                    <img src={umkm.logoUrl || 'https://placehold.co/100'} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border shadow-sm shrink-0" alt="Logo Toko" />
                                                                                    <div>
                                                                                        <h4 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{umkm.nama_toko}</h4>
                                                                                        <span className="inline-block px-2.5 py-0.5 bg-green-100 text-green-800 text-[10px] sm:text-xs font-semibold rounded-full mb-1">🟢 Live di Google Sheets</span>
                                                                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">📍 Alamat: {umkm.alamat || '-'} | 🕒 Jam Ops: {umkm.jam_operasional || '-'}</p>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Tombol Suspend Toko */}
                                                                                <button
                                                                                    onClick={() => handleSuspendUMKM(umkm)}
                                                                                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 transition-colors flex items-center gap-1.5 self-start lg:self-center shrink-0 shadow-sm"
                                                                                >
                                                                                    🚫 Suspend Toko
                                                                                </button>
                                                                            </div>

                                                                            {/* LIST PRODUK (ACCORDION) */}
                                                                            <div className="mt-3 sm:mt-4">
                                                                                <button
                                                                                    onClick={() => toggleStoreProducts(umkm.id)}
                                                                                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-blue-50 p-2.5 sm:p-3 rounded-xl border border-gray-200 transition-colors focus:outline-none"
                                                                                >
                                                                                    <p className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                                                        📦 Produk Toko ({umkm.produk ? umkm.produk.length : 0})
                                                                                    </p>
                                                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${expandedStores[umkm.id] ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                                                                        {expandedStores[umkm.id] ? '▲ Sembunyikan' : '▼ Tampilkan'}
                                                                                    </span>
                                                                                </button>

                                                                                {expandedStores[umkm.id] && (
                                                                                    <div className="mt-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 animate-fadeIn">
                                                                                        {umkm.produk && umkm.produk.length > 0 ? (
                                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                                                {umkm.produk.map((prod, idx) => (
                                                                                                    <div key={idx} className="flex gap-3 bg-white border border-gray-200 p-2 rounded-lg items-center shadow-sm hover:border-blue-300 transition">
                                                                                                        <img src={prod.foto_url || 'https://placehold.co/80'} className="w-12 h-12 rounded-md object-cover border shrink-0" alt="Produk" />
                                                                                                        <div className="min-w-0 flex-1">
                                                                                                            <h5 className="text-xs sm:text-sm font-bold text-gray-800 truncate">{prod.nama_produk}</h5>
                                                                                                            <p className="text-xs text-[#004aad] font-semibold notranslate">Rp {Number(prod.harga).toLocaleString('id-ID')}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <p className="text-xs text-gray-400 italic text-center py-4">Toko ini belum menambahkan produk.</p>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                        </div>
                                                                    ))
                                                            )}
                                                        </div>
                                                    </div>

                                                </div>
                                            )}

                                            {/* ========================================== */}
                                            {/* SUB-TAB: DAFTAR TOKO YANG DI-SUSPEND       */}
                                            {/* ========================================== */}
                                            {portalTab === 'suspended' && (
                                                <div className="mt-6 animate-fadeIn">
                                                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                        🚫 Daftar Toko Yang Sedang Di-Suspend
                                                    </h2>

                                                    {portalUmkmData.filter(umkm => umkm.status === 'suspended').length === 0 ? (
                                                        <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                            <span className="text-4xl block mb-2">🎉</span>
                                                            <h3 className="text-lg font-bold text-gray-700">Tidak ada toko yang di-suspend</h3>
                                                            <p className="text-gray-500 text-sm mt-1">Semua mitra UMKM berjalan normal dan tertib.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {portalUmkmData
                                                                .filter(umkm => umkm.status === 'suspended')
                                                                .map((umkm) => (
                                                                    <div key={umkm.id} className="p-5 border border-red-200 rounded-xl shadow-sm bg-red-50/20 flex flex-col justify-between">
                                                                        <div>
                                                                            <div className="flex items-start gap-4 mb-3">
                                                                                <img src={umkm.logoUrl || 'https://placehold.co/100'} className="w-14 h-14 rounded-xl object-cover border shadow-sm shrink-0" alt="Logo Toko" />
                                                                                <div>
                                                                                    <h4 className="text-lg font-bold text-gray-900">{umkm.nama_toko}</h4>
                                                                                    <p className="text-xs text-gray-500">{umkm.nama_pemilik} • {umkm.alamat || 'Alamat -'}</p>
                                                                                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">
                                                                                        🚫 Status: Di-Suspend
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Alasan Suspend */}
                                                                            <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-3 text-xs shadow-inner">
                                                                                <p className="font-bold text-red-900 mb-0.5">⚠️ Alasan Suspend dari Admin:</p>
                                                                                <p className="text-red-800 italic">"{umkm.suspension_reason || 'Tidak dicantumkan'}"</p>
                                                                            </div>

                                                                            {/* Blok Jika Penjual Mengajukan Banding */}
                                                                            {umkm.alasan_banding && (
                                                                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3 text-xs shadow-inner">
                                                                                    <p className="font-bold text-blue-900 mb-0.5">📩 Pengajuan Banding dari Penjual:</p>
                                                                                    <p className="text-blue-800 italic">"{umkm.alasan_banding}"</p>

                                                                                    {/* ======================================= */}
                                                                                    {/* 🌟 ENGINE PENDETEKSI PERUBAHAN DATA 🌟 */}
                                                                                    {/* ======================================= */}
                                                                                    {umkm.snapshot_suspend && (
                                                                                        <div className="mt-4 pt-3 border-t border-blue-200">
                                                                                            <p className="font-bold text-gray-800 mb-2 flex items-center gap-1">🔄 Hasil Revisi Data:</p>
                                                                                            <div className="space-y-2">
                                                                                                {(() => {
                                                                                                    const snap = umkm.snapshot_suspend;
                                                                                                    const changes = [];

                                                                                                    // 1. Cek Data Toko
                                                                                                    if (snap.nama_toko !== umkm.nama_toko) changes.push({ type: 'text', label: 'Nama Toko', old: snap.nama_toko, new: umkm.nama_toko });
                                                                                                    if (snap.deskripsi !== umkm.deskripsi) changes.push({ type: 'text', label: 'Deskripsi Toko', old: snap.deskripsi, new: umkm.deskripsi });
                                                                                                    if (snap.logoUrl !== umkm.logoUrl) changes.push({ type: 'image', label: 'Logo Toko', old: snap.logoUrl, new: umkm.logoUrl });

                                                                                                    // 2. Cek Data Produk
                                                                                                    umkm.produk?.forEach(newProd => {
                                                                                                        const oldProd = snap.produk?.find(p => p.id_produk === newProd.id_produk);
                                                                                                        if (!oldProd) {
                                                                                                            changes.push({ type: 'text', label: `[PRODUK BARU] ${newProd.nama_produk}`, old: '-', new: 'Ditambahkan' });
                                                                                                        } else {
                                                                                                            if (oldProd.foto_url !== newProd.foto_url) changes.push({ type: 'image', label: `Foto Produk: ${newProd.nama_produk}`, old: oldProd.foto_url, new: newProd.foto_url });
                                                                                                            if (oldProd.nama_produk !== newProd.nama_produk) changes.push({ type: 'text', label: `Nama Produk`, old: oldProd.nama_produk, new: newProd.nama_produk });
                                                                                                            if (oldProd.deskripsi !== newProd.deskripsi) changes.push({ type: 'text', label: `Deskripsi: ${newProd.nama_produk}`, old: oldProd.deskripsi, new: newProd.deskripsi });
                                                                                                        }
                                                                                                    });

                                                                                                    if (changes.length === 0) return <p className="text-[10px] text-gray-500 bg-white p-2 rounded border border-gray-100 italic">Tidak ada perubahan data yang terdeteksi.</p>;

                                                                                                    return changes.map((c, i) => (
                                                                                                        <div key={i} className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-[10px]">
                                                                                                            <span className="font-bold text-gray-700 block mb-1.5">{c.label}</span>
                                                                                                            {c.type === 'text' ? (
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    <span className="text-red-500 line-through truncate w-1/2 p-1.5 bg-red-50 rounded border border-red-100">{c.old || '-'}</span>
                                                                                                                    <span>➡</span>
                                                                                                                    <span className="text-green-700 font-bold truncate w-1/2 p-1.5 bg-green-50 rounded border border-green-200 shadow-sm">{c.new || '-'}</span>
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                <div className="flex items-center gap-3">
                                                                                                                    <div className="relative">
                                                                                                                        <span className="absolute -top-2 -left-2 bg-red-100 text-red-600 text-[8px] font-bold px-1 rounded shadow-sm">LAMA</span>
                                                                                                                        <img src={c.old || 'https://placehold.co/50'} className="w-12 h-12 object-cover rounded-lg border-2 border-red-200 opacity-60" />
                                                                                                                    </div>
                                                                                                                    <span className="text-lg">➡</span>
                                                                                                                    <div className="relative">
                                                                                                                        <span className="absolute -top-2 -right-2 bg-green-100 text-green-700 text-[8px] font-bold px-1 rounded shadow-sm z-10">BARU</span>
                                                                                                                        <img src={c.new || 'https://placehold.co/50'} className="w-16 h-16 object-cover rounded-xl border-2 border-green-400 shadow-md" />
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ));
                                                                                                })()}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Tombol Pulihkan Toko */}
                                                                        <button
                                                                            onClick={() => handleUnsuspendUMKM(umkm)}
                                                                            className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
                                                                        >
                                                                            ✅ Pulihkan Toko (Buka Suspend & Live Kembali)
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* ========================================== */}
                                            {/* SUB-TAB UMKM (VERIFIKASI PENDAFTARAN TOKO) */}
                                            {/* ========================================== */}
                                            {portalTab === 'umkm' && (
                                                <div className="mt-6">
                                                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                        🏪 Daftar Antrean Verifikasi UMKM Baru
                                                    </h2>

                                                    {/* 1. FILTER KHUSUS STATUS PENDING UNTUK CEK KOSONG */}
                                                    {portalUmkmData.filter(umkm => umkm.status === 'pending_review').length === 0 ? (

                                                        // TAMPILAN JIKA TIDAK ADA UMKM PENDING
                                                        <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                            <span className="text-4xl block mb-2">🎉</span>
                                                            <h3 className="text-lg font-bold text-gray-700">Tidak ada pengajuan UMKM baru</h3>
                                                            <p className="text-gray-500 text-sm mt-1">Semua pendaftaran mitra UMKM sudah diverifikasi.</p>
                                                        </div>

                                                    ) : (

                                                        // TAMPILAN CARD UMKM (FILTER KHUSUS STATUS PENDING SAJA)
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                            {portalUmkmData
                                                                    .filter(umkm => umkm.status === 'pending_review')
                                                                .map((umkm, index) => (
                                                                    <div key={umkm.id || index} className="p-5 border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col h-full">

                                                                        {/* Header Toko: Logo & Info Utama */}
                                                                        <div className="flex gap-4 items-start mb-4">
                                                                            <div className="w-16 h-16 rounded-lg bg-gray-100 border overflow-hidden flex-shrink-0">
                                                                                {umkm.logoUrl ? (
                                                                                    <img src={umkm.logoUrl} alt="Logo Toko" className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <span className="flex items-center justify-center w-full h-full text-2xl">🏪</span>
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <h3 className="font-bold text-xl text-gray-800 leading-tight">{umkm.nama_toko}</h3>
                                                                                <p className="text-sm text-gray-500 font-medium">{umkm.nama_pemilik} • {Array.isArray(umkm.kategori) ? umkm.kategori.join(', ') : (umkm.kategori || 'Kategori tidak ada')}</p>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                                                        Status: {umkm.status}
                                                                                    </span>
                                                                                </div>
                                                                                {umkm.resubmission_note && (
                                                                                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                                                                        <span className="font-bold">Catatan Perbaikan dari UMKM:</span> {umkm.resubmission_note}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Detail Toko */}
                                                                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4">
                                                                            <p className="text-sm text-gray-700 mb-1 flex items-start gap-2">
                                                                                <span>📍</span> <span>{umkm.alamat || <span className="italic text-red-400">Belum diisi</span>}</span>
                                                                            </p>
                                                                            <p className="text-sm text-gray-700 mb-1 flex items-start gap-2">
                                                                                <span>🕒</span> <span>{umkm.jam_operasional || '-'}</span>
                                                                            </p>
                                                                            <p className="text-sm text-gray-600 italic mt-2 border-t pt-2 border-blue-100">
                                                                                "{umkm.deskripsi || <span className="text-red-400">Deskripsi kosong</span>}"
                                                                            </p>
                                                                        </div>

                                                                        {/* SEKSI ETALASE PRODUK */}
                                                                        <div className="mb-6 flex-1">
                                                                            <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
                                                                                📦 Etalase Produk ({umkm.produk ? umkm.produk.length : 0})
                                                                            </h4>

                                                                            {umkm.produk && umkm.produk.length > 0 ? (
                                                                                <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                                                    {umkm.produk.map((prod, pIdx) => (
                                                                                        <div key={prod.id_produk || pIdx} className="flex gap-3 bg-white border rounded-lg p-2 hover:bg-gray-50 transition">
                                                                                            <div className="w-16 h-16 rounded-md bg-gray-200 overflow-hidden flex-shrink-0">
                                                                                                {prod.foto_url ? (
                                                                                                    <img src={prod.foto_url} alt={prod.nama_produk} className="w-full h-full object-cover" />
                                                                                                ) : (
                                                                                                    <span className="flex items-center justify-center w-full h-full text-gray-400 text-xs">No Pic</span>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="flex-1">
                                                                                                <div className="flex justify-between items-start">
                                                                                                    <p className="font-bold text-sm text-gray-800 line-clamp-1">{prod.nama_produk}</p>
                                                                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded notranslate">
                                                                                                        Rp {parseInt(prod.harga).toLocaleString('id-ID')}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{prod.deskripsi}</p>
                                                                                                <div className="flex gap-2 mt-1.5">
                                                                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                                                                        {prod.kategori_produk || 'Umum'}
                                                                                                    </span>
                                                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${prod.is_available !== false ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                                                                                        {prod.is_available !== false ? 'Tersedia' : 'Habis'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg border border-red-100 text-center">
                                                                                    Mitra ini belum menambahkan satupun produk ke etalase.
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Tombol Aksi */}
                                                                        <button
                                                                            onClick={() => setActivityMerchant(umkm)}
                                                                            className="w-full mb-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-4 rounded-lg text-sm transition-colors border border-blue-200"
                                                                        >
                                                                            🕘 Lihat Riwayat Aktivitas
                                                                        </button>
                                                                        <div className="flex gap-3 mt-auto pt-4 border-t">
                                                                            <button
                                                                                onClick={() => handleApproveUMKM(umkm)}
                                                                                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
                                                                            >
                                                                                ✅ Setujui & Publish
                                                                            </button>

                                                                            <button
                                                                                onClick={() => handleRejectUMKM(umkm)}
                                                                                className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
                                                                            >
                                                                                🗑️ Tolak
                                                                            </button>
                                                                        </div>

                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* ========================================== */}
                                            {/* SUB-TAB TESTIMONI (VERIFIKASI ULASAN)        */}
                                            {/* ========================================== */}
                                            {portalTab === 'testimoni' && (
                                                <div className="mt-6">
                                                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                        💬 Daftar Antrean Verifikasi Testimoni
                                                    </h2>

                                                    {/* LOGIKA CONDITIONAL RENDERING MULAI DI SINI */}
                                                    {isLoadingTestimoni ? (

                                                        // 1. TAMPILAN SAAT LOADING (NUNGGU BALASAN GOOGLE SHEETS)
                                                        <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                            <svg
                                                                className="w-10 h-10 text-blue-600 animate-spin"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <circle
                                                                    className="opacity-25"
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="10"
                                                                    stroke="currentColor"
                                                                    strokeWidth="4"
                                                                ></circle>
                                                                <path
                                                                    className="opacity-75"
                                                                    fill="currentColor"
                                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                ></path>
                                                            </svg>
                                                            <p className="text-gray-500 font-medium animate-pulse">
                                                                Mengambil data ulasan dari Google Sheets...
                                                            </p>
                                                        </div>

                                                    ) : portalTestimoniData.length === 0 ? (

                                                        // 2. TAMPILAN JIKA LOADING SELESAI TAPI DATA KOSONG
                                                        <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                            <span className="text-4xl block mb-2">🎉</span>
                                                            <h3 className="text-lg font-bold text-gray-700">Tidak ada pengajuan testimoni baru</h3>
                                                            <p className="text-gray-500 text-sm mt-1">Semua ulasan sudah diverifikasi atau belum ada yang masuk.</p>
                                                        </div>

                                                    ) : (

                                                        // 3. TAMPILAN JIKA DATA BERHASIL DITARIK (MUNCULIN CARD TESTIMONI)
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {portalTestimoniData.map((rev, index) => (
                                                                <div key={rev.ID_Ulasan || index} className="p-5 border border-gray-200 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">

                                                                    {/* Header Card: Nama & Bintang */}
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <div>
                                                                            <h3 className="font-bold text-lg text-gray-800">{rev.Nama}</h3>
                                                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                                📍 {rev.Alamat || 'Tidak ada alamat'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                                                                            ⭐ {rev.Bintang}/5
                                                                        </div>
                                                                    </div>

                                                                    {/* Isi Pesan Testimoni */}
                                                                    <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm text-gray-700 italic border-l-4 border-blue-400">
                                                                        "{rev.Pesan}"
                                                                    </div>

                                                                    {/* Tombol Aksi */}
                                                                    <div className="flex gap-3 mt-auto">
                                                                        <button
                                                                            onClick={() => handleReviewAction(rev.ID_Ulasan, 'Published')}
                                                                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
                                                                        >
                                                                            ✅ Setujui & Publish
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleReviewAction(rev.ID_Ulasan, 'Rejected')}
                                                                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
                                                                        >
                                                                            🗑️ Tolak (Hapus)
                                                                        </button>
                                                                    </div>

                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {activityMerchant && <MerchantActivityModal supabase={supabase} merchant={activityMerchant} onClose={() => setActivityMerchant(null)} />}
                                </div>
    );
}

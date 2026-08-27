import React, { useState, useEffect, useMemo } from "react";
// ✅ [TUGAS 1] Import Supabase dari npm (menggantikan CDN jsdelivr)
import { supabase, createTempSupabaseClient } from "./lib/supabase";
// ✅ [TUGAS 1] Import Firebase dari lib (menggantikan hardcoded config)
import { db, GAS_API_URL } from "./lib/firebase";
import { collection, getDoc, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import toast, { Toaster } from 'react-hot-toast';
import Swal from 'sweetalert2';
// ✅ [TUGAS 1] Import helper functions dari utils
import {
    formatDateTime, calculateDuration, getDurationMins, formatDurLabel,
    isWithinPeriod, getWaLink,
    parseJastipItems, parseJastipNote, parseJastipItemsObjects,
    parseOjekDetails, parseKirimDetails
} from "./utils/helpers";
// ✅ [LEVEL 2 #6] Generator struk canvas dipindahkan ke utils
import { generateReceiptBlob } from "./utils/receiptGenerator";
// ✅ [TUGAS 1] Import komponen UI dari components/
import ServiceBadge from "./components/ui/ServiceBadge";
import CustomCourierSelect from "./components/ui/CustomCourierSelect";
import NotifToast from "./components/ui/NotifToast";
import ImageLightbox from "./components/ui/ImageLightbox";
import EditOrderModal from "./components/modals/EditOrderModal";
import ReportAttachmentModal from "./components/modals/ReportAttachmentModal";
import HrModal from "./components/modals/HrModal";
import ManualOrderModal from "./components/modals/ManualOrderModal";
import KendalaModal from "./components/modals/KendalaModal";
import CourierSettingsModal from "./components/modals/CourierSettingsModal";
import ResetPinModal from "./components/modals/ResetPinModal";
import EditOngkirModal from "./components/modals/EditOngkirModal";
import AdminNav from "./components/admin/AdminNav";
import CourierNav from "./components/courier/CourierNav";
import InternalChatList from "./components/chat/InternalChatList";
import InternalChatRoom from "./components/chat/InternalChatRoom";
import useLiveChat from "./hooks/useLiveChat";
// ✅ [LEVEL 2 #7] Halaman Login di-extract ke pages/
import LoginPage from "./pages/LoginPage";
// ✅ [LEVEL 2 #8] Tab Profil Kurir di-extract ke pages/courier/
import CourierProfilTab from "./pages/courier/CourierProfilTab";
// Tab Pelanggaran Kurir telah dipindah ke dalam CourierAnalitikTab
// [LEVEL 3 #14] Tab Riwayat dan Analitik Kurir di-extract ke pages/courier/
import CourierRiwayatTab from "./pages/courier/CourierRiwayatTab";
import CourierAnalitikTab from "./pages/courier/CourierAnalitikTab";
// [LEVEL 4 #16] Tab Tugas Aktif Kurir di-extract ke pages/courier/
import CourierTugasAktifTab from "./pages/courier/CourierTugasAktifTab";
// ✅ [LEVEL 2 #10] Tab Manajemen Tim/HRD Admin di-extract ke pages/admin/
import AdminTimTab from "./pages/admin/AdminTimTab";
// [LEVEL 3 #11] Tab Manajemen Publik (Portal UMKM & Testimoni) di-extract ke pages/admin/
import AdminPortalTab from "./pages/admin/AdminPortalTab";
// [LEVEL 3 #12] Tab Riwayat Admin di-extract ke pages/admin/
import AdminRiwayatTab from "./pages/admin/AdminRiwayatTab";
// [LEVEL 3 #13] Tab Laporan & Analitik Admin di-extract ke pages/admin/
import AdminLaporanTab from "./pages/admin/AdminLaporanTab";
// [LEVEL 4 #15] Tab Operasional Admin di-extract ke pages/admin/
import AdminOperasionalTab from "./pages/admin/AdminOperasionalTab";

const NOTIF_SOUND_URL = import.meta.env.VITE_NOTIF_SOUND_URL || "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function App() {
    const [user, setUser] = useState(null);

    const [courierProfile, setCourierProfile] = useState(null);
    // [isEditingCourierProfile, courierProfileForm, showCourierPin, isSavingCourierProfile
    //  dipindahkan sebagai state lokal ke src/pages/courier/CourierProfilTab.jsx]


    // 1. Taruh detektor ini di bagian atas komponen sebelum return
    const currentHost = window.location.hostname;
    const isKurirApp = currentHost.includes('kurir');

    // STATE LOGIN
    const [emailInput, setEmailInput] = useState("");
    const [pinInput, setPinInput] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // STATE UNTUK FIRST TIME SETUP (BOS ADMIN PERTAMA)
    const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
    const [isSetupMode, setIsSetupMode] = useState(false);

    const [notif, setNotif] = useState({ message: "", type: "" });
    const [loading, setLoading] = useState(false);

    const [allOrders, setAllOrders] = useState([]);
    const [adminHistoricalOrders, setAdminHistoricalOrders] = useState([]);
    const [courierHistoricalOrders, setCourierHistoricalOrders] = useState([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [couriersList, setCouriersList] = useState([]);
    const [customersList, setCustomersList] = useState([]);
    const [courierRatingStats, setCourierRatingStats] = useState({});
    const [orderRatings, setOrderRatings] = useState({});

    const [adminProfitShare, setAdminProfitShare] = useState(10);
    const [kasShare, setKasShare] = useState(10);

    // === STATE TOGGLE BUKA/TUTUP CUSTOM ORDER ===
    const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(true);
    const [isTogglingCustomOrder, setIsTogglingCustomOrder] = useState(false);
    const [customOrderMerchantId, setCustomOrderMerchantId] = useState(null);

    const [adminMainTab, setAdminMainTab] = useState('operasional');
    const [adminOperasionalTab, setAdminOperasionalTab] = useState('pending');
    const [adminOperasionalSubTab, setAdminOperasionalSubTab] = useState('Semua');
    const [courierTugasSubTab, setCourierTugasSubTab] = useState('Semua');
    const [adminFilterPeriod, setAdminFilterPeriod] = useState('month');
    const [adminFilterStartDate, setAdminFilterStartDate] = useState('');
    const [adminFilterEndDate, setAdminFilterEndDate] = useState('');
    const [adminChartGrouping, setAdminChartGrouping] = useState('daily');

    const [adminHistorySearch, setAdminHistorySearch] = useState('');
    const [adminHistoryLimit, setAdminHistoryLimit] = useState(10);
    const [courierHistoryLimit, setCourierHistoryLimit] = useState(10);

    const [adminAnalyticsOrders, setAdminAnalyticsOrders] = useState([]);
    const [courierAnalyticsOrders, setCourierAnalyticsOrders] = useState([]);

    // === STATE PENGADUAN (LAPORAN CUSTOMER) ===
    const [reportsData, setReportsData] = useState([]);
    const [isFetchingReports, setIsFetchingReports] = useState(false);
    const [pengaduanFilterTab, setPengaduanFilterTab] = useState('all');


    // === STATE & FUNGSI MANAJEMEN PUBLIK (PORTAL UMKM & TESTIMONI) ===
    const [portalTab, setPortalTab] = useState('umkm');
    const [searchVerifiedToko, setSearchVerifiedToko] = useState('');
    const [isPortalLoading, setIsPortalLoading] = useState(false);
    const [portalUmkmData, setPortalUmkmData] = useState([]);
    const [portalTestimoniData, setPortalTestimoniData] = useState([]); // Tambahin sekalian kalau belum ada
    const [isLoadingTestimoni, setIsLoadingTestimoni] = useState(false);

    // STATE UNTUK BUKA/TUTUP LIST PRODUK DI TAB TERVERIFIKASI
    const [expandedStores, setExpandedStores] = useState({});

    const toggleStoreProducts = (storeId) => {
        setExpandedStores(prev => ({
            ...prev,
            [storeId]: !prev[storeId]
        }));
    };

    // === FUNGSI LOAD & TOGGLE STATUS CUSTOM ORDER ===
    const loadCustomOrderStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('merchants')
                .select('id, operating_hours')
                .eq('is_custom_order', true)
                .maybeSingle();
            if (error || !data) return;
            setCustomOrderMerchantId(data.id);
            // Cek apakah ada hari yang is_open = true di operating_hours
            if (Array.isArray(data.operating_hours)) {
                const anyOpen = data.operating_hours.some(h => h.is_open === true || h.is_open === 'true' || h.is_open === 'on');
                setIsCustomOrderOpen(anyOpen);
            } else {
                setIsCustomOrderOpen(true); // Default buka jika belum diatur
            }
        } catch (e) {
            console.error('Error loading custom order status:', e);
        }
    };

    const handleToggleCustomOrder = async () => {
        if (!customOrderMerchantId || isTogglingCustomOrder) return;
        setIsTogglingCustomOrder(true);
        const newStatus = !isCustomOrderOpen;
        try {
            const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const newOperatingHours = days.map(day => ({
                day,
                is_open: newStatus,
                open: '08:00',
                close: '21:00'
            }));
            const { error } = await supabase
                .from('merchants')
                .update({ operating_hours: newOperatingHours })
                .eq('id', customOrderMerchantId);
            if (error) throw error;
            setIsCustomOrderOpen(newStatus);
            toast.success(newStatus ? '✅ Layanan Custom Order DIBUKA!' : '🔒 Layanan Custom Order DITUTUP!');
        } catch (e) {
            console.error('Error toggling custom order:', e);
            toast.error('Gagal mengubah status layanan.');
        } finally {
            setIsTogglingCustomOrder(false);
        }
    };

    const handleTeruskanPengaduan = async (report) => {
        const { value: notes } = await Swal.fire({
            title: 'Teruskan Laporan',
            input: 'textarea',
            inputLabel: 'Catatan untuk Terlapor (Kurir/Toko)',
            inputPlaceholder: 'Masukkan pesan teguran/peringatan yang akan dilihat oleh pihak terlapor...',
            showCancelButton: true,
            confirmButtonText: 'Kirim',
            cancelButtonText: 'Batal',
            inputValidator: (value) => {
                if (!value) {
                    return 'Catatan tidak boleh kosong!'
                }
            }
        });

        if (notes) {
            const toastId = toast.loading("Meneruskan laporan...");
            try {
                const { error } = await supabase
                    .from('reports')
                    .update({
                        status: 'forwarded',
                        admin_notes: notes,
                        forwarded_at: new Date().toISOString()
                    })
                    .eq('id', report.id);

                if (error) throw error;
                toast.success("Laporan berhasil diteruskan", { id: toastId });
                fetchReportsData();
            } catch (error) {
                console.error("Error forwarding report:", error);
                toast.error("Gagal meneruskan laporan", { id: toastId });
            }
        }
    };

    const handleResolution = async (report, action) => {
        const actionLabel = action === 'suspend' ? 'Suspend Akun' : 'Jadikan Peringatan';
        const result = await Swal.fire({
            title: `${actionLabel}?`,
            text: action === 'suspend'
                ? `Apakah Anda yakin ingin MENSUSPEND ${report.target_type === 'merchant' ? 'toko/mitra' : 'kurir'} ini? Akun mereka akan dibekukan.`
                : `Apakah Anda yakin ingin memberikan PERINGATAN kepada ${report.target_type === 'merchant' ? 'toko/mitra' : 'kurir'} ini?`,
            icon: action === 'suspend' ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: action === 'suspend' ? '#d33' : '#eab308',
            cancelButtonColor: '#3085d6',
            confirmButtonText: `Ya, ${actionLabel}`,
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            const toastId = toast.loading("Memproses keputusan...");
            try {
                // Update tabel reports
                const { error: reportError } = await supabase
                    .from('reports')
                    .update({ status: 'resolved', resolution_action: action })
                    .eq('id', report.id);

                if (reportError) throw reportError;

                // Terapkan aksi ke target
                if (report.target_type === 'courier') {
                    if (action === 'suspend') {
                        // Suspend kurir (tambah BANNED_ ke pin)
                        const { data: empData } = await supabase.from('employees').select('pin').eq('id', report.target_id).single();
                        if (empData && !empData.pin.startsWith('BANNED_')) {
                            const newPin = "BANNED_" + empData.pin;
                            await supabase.from('employees').update({ pin: newPin }).eq('id', report.target_id);
                        }
                    } else if (action === 'warning') {
                        // Tambah warning_points kurir
                        const { data: empData } = await supabase.from('employees').select('warning_points').eq('id', report.target_id).single();
                        const currentPoints = empData?.warning_points || 0;
                        await supabase.from('employees').update({ warning_points: currentPoints + 1 }).eq('id', report.target_id);
                    }
                } else if (report.target_type === 'merchant') {
                    if (action === 'suspend') {
                        // Suspend toko
                        await supabase.from('merchants').update({
                            status: 'suspended',
                            alasan_suspend: 'Dilaporkan oleh customer atas pelanggaran pelayanan.'
                        }).eq('id', report.target_id);
                    } else if (action === 'warning') {
                        // Tambah warning_points toko
                        const { data: umkmData } = await supabase.from('merchants').select('warning_points').eq('id', report.target_id).single();
                        const currentPoints = umkmData?.warning_points || 0;
                        await supabase.from('merchants').update({ warning_points: currentPoints + 1 }).eq('id', report.target_id);
                    }
                }

                toast.success(`Keputusan berhasil: ${actionLabel}`, { id: toastId });
                fetchReportsData();
                // [LEVEL 3 #11] fetchPortalData() pindah ke AdminPortalTab (auto-refetch saat tab portal dibuka)
                fetchData();
            } catch (error) {
                console.error("Error resolving report:", error);
                toast.error("Gagal memproses keputusan", { id: toastId });
            }
        }
    };


    const fetchReportsData = async () => {
        setIsFetchingReports(true);
        try {
            const { data, error } = await supabase
                .from('reports')
                .select(`
                    *,
                    orders ( id, raw_order_text, status, kendala_info, is_deleted, inputted_by )
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setReportsData(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Gagal mengambil data pengaduan');
        } finally {
            setIsFetchingReports(false);
        }
    };

    const fetchCourierReportsData = async () => {
        if (!user || user.role !== 'courier') return;
        try {
            const { data, error } = await supabase
                .from('reports')
                .select(`
                    *,
                    orders ( id, raw_order_text, status, kendala_info, is_deleted, inputted_by )
                `)
                .eq('target_id', user.id)
                .eq('target_type', 'courier')
                .in('status', ['forwarded', 'resolved'])
                .order('created_at', { ascending: false });
            if (!error && data) setCourierReports(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmitFeedback = async (reportId, feedbackText) => {
        if (!feedbackText.trim()) return toast.error("Feedback tidak boleh kosong");
        const toastId = toast.loading("Mengirim tanggapan...");
        try {
            const { error } = await supabase
                .from('reports')
                .update({
                    target_feedback: feedbackText,
                    feedback_at: new Date().toISOString()
                })
                .eq('id', reportId);

            if (error) throw error;
            toast.success("Tanggapan berhasil dikirim", { id: toastId });
            fetchCourierReportsData();
        } catch (error) {
            console.error(error);
            toast.error("Gagal mengirim tanggapan", { id: toastId });
        }
    };

    const [adminFilterService, setAdminFilterService] = useState('all');
    const [adminFilterStatus, setAdminFilterStatus] = useState('all');
    const [adminFilterCourier, setAdminFilterCourier] = useState('all');

    const [dispatchInputs, setDispatchInputs] = useState({});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editOngkirModal, setEditOngkirModal] = useState({ isOpen: false, order: null, newOngkir: '' });
    const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
    const [attachmentOrder, setAttachmentOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);

    // STATE BARU UNTUK BARIS DINAMIS EDITOR & FIELD CATATAN KHUSUS
    const [editLines, setEditLines] = useState([]);
    const [editNote, setEditNote] = useState("");

    // Auto-pecah teks, buang header format, dan amankan note ke field terpisah
    useEffect(() => {
        if (isEditModalOpen && editingOrder) {
            const rawText = editingOrder.text || "";

            // 1. Tangkap Note secara cerdas (pisahkan dari teks utama)
            const noteMatch = rawText.match(/note:\s*([\s\S]*)/i);
            const extractedNote = noteMatch ? noteMatch[1].trim() : "";
            setEditNote(extractedNote);

            // 2. Ambil bagian belanjaan saja (bersihkan teks sebelum 'note:')
            let listPart = rawText.split(/note:/i)[0];

            // 3. Bersihkan kata-kata template bawaan agar tidak masuk baris tabel
            listPart = listPart.replace(/format belanja\/jastip:/ig, '');
            listPart = listPart.replace(/list belanjaan secara spesifik:/ig, '');

            // 4. Pecah per baris dan buang baris kosong
            const filteredLines = listPart.split('\n')
                .map(line => line.trim())
                .filter(line => {
                    if (line.length === 0) return false;
                    if (/^\d+\.?$/.test(line)) return false; // Abaikan jika cuma angka urutan
                    return true;
                });

            setEditLines(filteredLines);
        }
    }, [isEditModalOpen, editingOrder]);

    // FUNGSI KENDALI BARIS
    const handleEditLineChange = (idx, val) => {
        const newLines = [...editLines];
        newLines[idx] = val;
        setEditLines(newLines);
    };
    const handleAddEditLine = () => setEditLines([...editLines, '']);
    const handleRemoveEditLine = (idx) => {
        const newLines = [...editLines];
        newLines.splice(idx, 1);
        setEditLines(newLines);
    };

    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualForm, setManualForm] = useState({ name: '', wa: '', address: '', text: '', type: 'Belanja', fee: '', courier: '' });
    const [manualImages, setManualImages] = useState([]); // BERUBAH JADI ARRAY
    const [isUploadingManual, setIsUploadingManual] = useState(false);
    const [showCustSuggestions, setShowCustSuggestions] = useState(false);

    // HACK: Lightbox Slider Data
    const [lightboxData, setLightboxData] = useState({ urls: [], index: 0 });
    const setLightboxImg = (urlStr) => {
        if (!urlStr) setLightboxData({ urls: [], index: 0 });
        else setLightboxData({ urls: urlStr.split(','), index: 0 });
    };

    const [courierMainTab, setCourierMainTab] = useState('tugas');
    const [courierFilterPeriod, setCourierFilterPeriod] = useState('month');
    const [courierChartPeriod, setCourierChartPeriod] = useState('daily');
    const [courierReports, setCourierReports] = useState([]);
    const [courierFilterStartDate, setCourierFilterStartDate] = useState('');
    const [courierFilterEndDate, setCourierFilterEndDate] = useState('');
    const [courierFilterService, setCourierFilterService] = useState('all');
    const [courierFilterStatus, setCourierFilterStatus] = useState('all');
    const [courierHistorySearch, setCourierHistorySearch] = useState('');

    // STATE MANAJEMEN TIM (HRD)
    const [allEmployees, setAllEmployees] = useState([]);
    const [isHrModalOpen, setIsHrModalOpen] = useState(false);
    const [hrForm, setHrForm] = useState({ id: null, role: 'courier', full_name: '', email: '', phone: '', pin: '', bank_name: '', account_number: '', bank_name_2: '', account_number_2: '' });
    const [isSubmittingHr, setIsSubmittingHr] = useState(false);
    const [hrSearch, setHrSearch] = useState(''); // STATE BARU: Wadah ketikan pencarian admin

    // ========================================================
    // STATE & FUNGSI: PENGATURAN AKUN KURIR & LUPA PIN
    // ========================================================
    const [isCourierSettingsOpen, setIsCourierSettingsOpen] = useState(false);
    const [courierSettingsForm, setCourierSettingsForm] = useState({
        phone: '', bank_name: '', account_number: '', bank_name_2: '', account_number_2: '',
        current_pin: '', new_pin: '', confirm_pin: ''
    });
    const [isSubmittingCourierSettings, setIsSubmittingCourierSettings] = useState(false);

    // STATE UNTUK MODAL SETEL PIN BARU (DARI EMAIL RESET)
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [resetPinForm, setResetPinForm] = useState({ new_pin: '', confirm_pin: '' });
    const [isSubmittingResetPin, setIsSubmittingResetPin] = useState(false);

    // Auto-deteksi jika user datang dari Link Reset Email Supabase
    useEffect(() => {
        // 1. Cek dari hash URL
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            setIsResetPasswordModalOpen(true);
        }

        // 2. Cek dari listener Auth Supabase
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsResetPasswordModalOpen(true);
            }
        });

        return () => {
            authListener?.subscription?.unsubscribe();
        };
    }, []);

    // Submit Perubahan PIN Baru dari Link Email
    const handleSaveNewResetPin = async (e) => {
        e.preventDefault();
        if (resetPinForm.new_pin.length < 6) return showNotif("PIN minimal 6 karakter/angka!", "error");
        if (resetPinForm.new_pin !== resetPinForm.confirm_pin) return showNotif("Konfirmasi PIN tidak cocok!", "error");

        setIsSubmittingResetPin(true);
        const toastId = toast.loading("Memperbarui PIN kamu...");

        try {
            // 1. Update password di Supabase Auth
            const { data: authData, error: authErr } = await supabase.auth.updateUser({
                password: resetPinForm.new_pin
            });
            if (authErr) throw authErr;

            // 2. Update PIN di tabel employees
            if (authData?.user) {
                await supabase
                    .from('employees')
                    .update({ pin: resetPinForm.new_pin })
                    .eq('auth_id', authData.user.id);
            }

            toast.success("PIN berhasil diubah! Silakan login dengan PIN baru.", { id: toastId });
            setIsResetPasswordModalOpen(false);

            // Bersihkan Hash dari URL & Logout biar login ulang pakai PIN baru
            window.history.replaceState(null, null, window.location.pathname);
            await supabase.auth.signOut();
            setUser(null);
        } catch (err) {
            toast.error(`Gagal reset PIN: ${err.message}`, { id: toastId });
        } finally {
            setIsSubmittingResetPin(false);
        }
    };


    // Terima form dari CourierProfilTab, return true kalau sukses (untuk nutup edit mode di tab)
    const saveCourierProfile = async (f) => {
        const toastId = toast.loading("Menyimpan profil...");
        try {
            if (f.pin && f.pin.length < 6) { showNotif("PIN minimal 6 karakter/angka!", "error"); toast.dismiss(toastId); return false; }

            if (f.pin !== courierProfile.pin) {
                const { error: authUpdateError } = await supabase.rpc('update_employee_password', { user_id: courierProfile.auth_id, new_password: f.pin });
                if (authUpdateError) throw new Error(`Gagal update PIN di sistem: ${authUpdateError.message}`);
            }
            if (f.email.trim() !== courierProfile.email) {
                const { error: authEmailError } = await supabase.rpc('update_employee_email', { user_id: courierProfile.auth_id, new_email: f.email.trim() });
                if (authEmailError) throw new Error(`Gagal update email: ${authEmailError.message}`);
            }

            const { error: updateError } = await supabase.from('employees').update({
                full_name: f.full_name,
                email: f.email.trim(),
                phone: f.phone,
                pin: f.pin,
                bank_name: f.bank_name || null,
                account_number: f.account_number || null,
                bank_name_2: f.bank_name_2 || null,
                account_number_2: f.account_number_2 || null
            }).eq('id', user.id);

            if (updateError) throw updateError;

            // Perbarui local state
            setUser(prev => ({ ...prev, name: f.full_name }));
            setCourierProfile(prev => ({ ...prev, ...f, email: f.email.trim() }));
            toast.success("Profil berhasil diperbarui!", { id: toastId });
            fetchData();
            return true;
        } catch (err) {
            toast.error(`Gagal menyimpan: ${err.message}`, { id: toastId });
            return false;
        }
    };


    const openCourierSettings = async () => {
        try {
            const { data, error } = await supabase.from('employees').select('*').eq('id', user.id).maybeSingle();
            if (data && !error) {
                setCourierSettingsForm({
                    phone: data.phone || '', bank_name: data.bank_name || '', account_number: data.account_number || '',
                    bank_name_2: data.bank_name_2 || '', account_number_2: data.account_number_2 || '',
                    current_pin: '', new_pin: '', confirm_pin: ''
                });
                setIsCourierSettingsOpen(true);
            }
        } catch (err) { console.error(err); }
    };


    const toggleCourierOnlineStatus = async (currentStatus) => {
        if (!user || user.role !== 'courier') return;

        const newStatus = !currentStatus;

        if (newStatus === false) {
            const activeOrders = allOrders.filter(o => (o.status === 'processing' || o.status === 'hold' || o.status === 'delivering') && o.assigned_courier_id === user.id);
            if (activeOrders.length > 0) {
                return showNotif("Selesaikan dulu semua orderan yang masih jalan sebelum Offline!", "error");
            }
        }

        setCouriersList(prev => prev.map(c => c.id === user.id ? { ...c, is_online: newStatus } : c));

        try {
            const { error } = await supabase.from('employees').update({ is_online: newStatus }).eq('id', user.id);
            if (error) throw error;
            showNotif(`Status berhasil diubah menjadi ${newStatus ? 'ONLINE' : 'OFFLINE'}`, "success");
        } catch (err) {
            console.error("Gagal update status online:", err);
            setCouriersList(prev => prev.map(c => c.id === user.id ? { ...c, is_online: currentStatus } : c));
            showNotif("Gagal merubah status", "error");
        }
    };

    const submitCourierSettings = async (e) => {
        e.preventDefault();
        const f = courierSettingsForm;
        if (f.new_pin || f.confirm_pin) {
            if (f.new_pin.length < 6) return showNotif("PIN baru minimal 6 karakter/angka!", "error");
            if (f.new_pin !== f.confirm_pin) return showNotif("Konfirmasi PIN baru tidak cocok!", "error");
        }
        setIsSubmittingCourierSettings(true);
        const toastId = toast.loading("Memperbarui data profil...");
        try {
            const { data: empData, error: fetchErr } = await supabase.from('employees').select('auth_id, pin').eq('id', user.id).maybeSingle();
            if (fetchErr) throw fetchErr;

            const finalPin = f.new_pin ? f.new_pin : empData.pin;
            if (f.new_pin) {
                const { error: authUpdateError } = await supabase.rpc('update_employee_password', { user_id: empData.auth_id, new_password: f.new_pin });
                if (authUpdateError) throw new Error(`Gagal update Auth: ${authUpdateError.message}`);
            }
            const { error: updateError } = await supabase.from('employees').update({
                phone: f.phone, pin: finalPin, bank_name: f.bank_name || null, account_number: f.account_number || null,
                bank_name_2: f.bank_name_2 || null, account_number_2: f.account_number_2 || null
            }).eq('id', user.id);

            if (updateError) throw updateError;
            toast.success("Profil & PIN berhasil diperbarui!", { id: toastId });
            setIsCourierSettingsOpen(false); fetchData();
        } catch (err) { toast.error(`Gagal menyimpan: ${err.message}`, { id: toastId }); } finally { setIsSubmittingCourierSettings(false); }
    };

    const handleForgotPassword = async () => {
        // 1. Munculin pop-up minta email
        const { value: email } = await Swal.fire({
            title: '🔑 Lupa PIN Login?',
            text: 'Masukkan email terdaftar kamu. Link reset password akan dikirim ke email:',
            input: 'email',
            inputPlaceholder: 'email@tutahtitah.id',
            showCancelButton: true,
            confirmButtonText: 'Kirim Link Reset',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#004aad'
        });

        // Kalau user klik batal atau form kosong, berhentiin proses
        if (!email) return;

        const toastId = toast.loading("Sending reset link...");

        try {
            // 2. Ambil root domain saat ini secara dinamis (https://admin... atau https://kurir...)
            const currentUrl = window.location.origin;

            // 3. Tembak ke Supabase dengan redirectTo yang bener
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: currentUrl // <--- Ini yang bikin HP gak nyasar ke localhost lagi!
            });

            if (error) throw error;

            toast.success("Link reset PIN dikirim! Cek folder Inbox/Spam email kamu.", { id: toastId });
        } catch (err) {
            toast.error(`Gagal: ${err.message}`, { id: toastId });
        }
    };
    // ========================================================

    const [jastipPrices, setJastipPrices] = useState(() => {
        try { return JSON.parse(localStorage.getItem('tutahJastipPrices')) || {}; } catch (e) { return {}; }
    });
    const [jastipChecked, setJastipChecked] = useState(() => {
        try { return JSON.parse(localStorage.getItem('tutahJastipChecked')) || {}; } catch (e) { return {}; }
    });

    const [isKendalaModalOpen, setIsKendalaModalOpen] = useState(false);
    const [kendalaForm, setKendalaForm] = useState({ id: null, type: '', text: '', jastipItems: [] });

    const updateJastipPrice = (orderId, idx, value) => {
        const newPrices = { ...jastipPrices, [`${orderId}_${idx}`]: value };
        setJastipPrices(newPrices);
        localStorage.setItem('tutahJastipPrices', JSON.stringify(newPrices));
    };
    const updateJastipChecked = (orderId, idx, isChecked) => {
        const newChecked = { ...jastipChecked, [`${orderId}_${idx}`]: isChecked };
        setJastipChecked(newChecked);
        localStorage.setItem('tutahJastipChecked', JSON.stringify(newChecked));
    };


    // [Helper functions dipindahkan ke src/utils/helpers.js]


    const showNotif = (message, type) => { setNotif({ message, type }); setTimeout(() => setNotif({ message: "", type: "" }), 3000); };
    const requestNotificationPermission = () => { if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission(); };
    const playAlertSound = () => { try { new Audio(NOTIF_SOUND_URL).play().catch(() => { }); } catch (e) { } };
    const showPushNotification = (title, body) => { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "/logo-tutahtitah-biru.webp" }); };

    // =======================================================================
    // SUPABASE AUTH & SESSION MANAGEMENT
    // =======================================================================

    // Cek apakah belum ada Admin sama sekali di database (Untuk First Time Setup)
    const checkInitialSetup = async () => {
        try {
            const { count, error } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('role', 'admin');
            if (!error && count === 0) {
                setNeedsInitialSetup(true);
            } else {
                setNeedsInitialSetup(false);
                setIsSetupMode(false);
            }
        } catch (err) { console.error("Error checking setup:", err); }
    };

    const fetchUserProfile = async (authId) => {
        try {
            const { data, error } = await supabase.from('employees').select('*').eq('auth_id', authId).maybeSingle();
            if (data && !error) {
                setUser({ role: data.role, name: data.full_name, id: data.id, auth_id: authId, is_super_admin: data.is_super_admin });
                requestNotificationPermission();
            } else {
                handleLogout();
            }
        } catch (err) { console.error("Error fetching profile:", err); }
    };

    useEffect(() => {
        checkInitialSetup();
        loadCustomOrderStatus(); // Load status buka/tutup custom order

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchUserProfile(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchUserProfile(session.user.id);
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!emailInput || !pinInput) return showNotif("Email dan PIN wajib diisi!", "error");
        setIsLoggingIn(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailInput.trim(),
                password: pinInput
            });

            if (error) {
                showNotif("Email atau PIN Salah!", "error");
                setIsLoggingIn(false);
                return;
            }

            // SINKRONISASI PIN: Jika user mereset password via email (Supabase Auth), 
            // pin di tabel 'employees' mungkin masih yang lama. Kita update otomatis agar sinkron.
            if (data?.user) {
                const { data: empData } = await supabase.from('employees').select('pin').eq('auth_id', data.user.id).maybeSingle();
                if (empData && empData.pin !== pinInput) {
                    await supabase.from('employees').update({ pin: pinInput }).eq('auth_id', data.user.id);
                }
            }

            showNotif(`Login berhasil! Memuat sistem...`, "success");
            setEmailInput("");
            setPinInput("");
        } catch (error) {
            showNotif(`Sistem Error`, "error");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setAllOrders([]);
    };

    // FORCE DEFAULT TAB KE TUGAS KETIKA USER LOGIN
    useEffect(() => {
        if (user && user.role === 'courier') {
            setCourierMainTab('tugas');
        }
    }, [user]);

    const openEditEmployee = (emp) => {
        setHrForm({
            id: emp.id, role: emp.role, full_name: emp.full_name, email: emp.email || '',
            phone: emp.phone || '', pin: emp.pin, bank_name: emp.bank_name || '',
            account_number: emp.account_number || '', bank_name_2: emp.bank_name_2 || '', account_number_2: emp.account_number_2 || ''
        });
        setIsHrModalOpen(true);
    };

    const handleDeleteEmployee = async (empId, empName) => {
        const confirmDelete = window.confirm(`Yakin mau MENCABUT AKSES login untuk ${empName}?\n\n(Catatan: Data riwayat ordernya tetap aman, tapi dia tidak bisa login lagi)`);
        if (!confirmDelete) return;

        try {
            const randomPin = "BANNED_" + Math.random().toString(36).substring(7);
            const { error } = await supabase.from('employees').update({ pin: randomPin }).eq('id', empId);
            if (error) throw error;
            showNotif(`Akses ${empName} berhasil dicabut!`, "success");
            fetchData();
        } catch (err) { showNotif(`Gagal hapus: ${err.message}`, "error"); }
    };

    const handleRestoreEmployee = async (empId, empName) => {
        const newPin = window.prompt(`Masukkan PIN baru (min 6 angka) untuk MENGAKTIFKAN KEMBALI ${empName}:`);
        if (!newPin || newPin.length < 6) {
            if (newPin !== null) showNotif("Gagal: PIN minimal 6 angka/huruf!", "error");
            return;
        }

        try {
            const { error } = await supabase.from('employees').update({ pin: newPin }).eq('id', empId);
            if (error) throw error;
            showNotif(`Akses ${empName} berhasil diaktifkan kembali!`, "success");
            fetchData();
        } catch (err) { showNotif(`Gagal mengaktifkan: ${err.message}`, "error"); }
    };

    const submitRegisterEmployee = async (isInitialSetup = false) => {
        const f = hrForm;

        if (!f.email || !f.pin || !f.full_name || !f.phone) {
            return showNotif("Nama, Email, PIN, dan No WA Wajib Diisi!", "error");
        }
        if (f.pin.length < 6) return showNotif("PIN minimal 6 karakter/angka!", "error");

        setIsSubmittingHr(true);
        const toastId = toast.loading("Memproses data karyawan...");

        try {
            if (f.id) {
                // ==========================================================
                // 🌟 LOGIKA EDIT DATA & REAL ganti password (FIXED!) 🌟
                // ==========================================================

                // 1. Ambil data auth_id, pin, dan email lama milik karyawan ini
                const { data: empData, error: fetchErr } = await supabase
                    .from('employees')
                    .select('auth_id, pin, email')
                    .eq('id', f.id)
                    .single();

                if (fetchErr) throw fetchErr;

                // 2. Jika PIN dirubah dari PIN lama, panggil fungsi SQL RPC PIN
                if (empData.pin !== f.pin) {
                    const { error: authUpdateError } = await supabase.rpc('update_employee_password', {
                        user_id: empData.auth_id,
                        new_password: f.pin
                    });
                    if (authUpdateError) throw new Error(`Gagal update password di Auth: ${authUpdateError.message}`);
                }

                // 🌟 INTEGRASI BARU: Jika EMAIL dirubah, panggil fungsi SQL RPC Email
                if (empData.email !== f.email.trim()) {
                    const { error: authEmailError } = await supabase.rpc('update_employee_email', {
                        user_id: empData.auth_id,
                        new_email: f.email.trim()
                    });
                    if (authEmailError) throw new Error(`Gagal update email di Auth: ${authEmailError.message}`);
                }

                // 3. Update data profile di tabel publik employees
                const { error: updateError } = await supabase.from('employees').update({
                    email: f.email.trim(), // <--- SEKARANG EMAILUDAH MASUK!
                    full_name: f.full_name,
                    pin: f.pin,
                    phone: f.phone,
                    role: f.role,
                    bank_name: f.bank_name || null,
                    account_number: f.account_number || null,
                    bank_name_2: f.bank_name_2 || null,
                    account_number_2: f.account_number_2 || null
                }).eq('id', f.id);

                if (updateError) throw updateError;
                toast.success("Data & PIN Karyawan berhasil diperbarui!", { id: toastId });

            } else {
                // ==========================================================
                // LOGIKA BIKIN KARYAWAN BARU (INSERT)
                // ==========================================================
                const tempSupabase = createTempSupabaseClient();
                const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email: f.email.trim(), password: f.pin });
                if (authError) throw authError;
                if (!authData.user) throw new Error("Gagal membuat user auth.");

                const finalRole = isInitialSetup ? 'admin' : f.role;
                const { error: dbError } = await supabase.from('employees').insert([{
                    auth_id: authData.user.id, email: f.email.trim(), full_name: f.full_name, pin: f.pin, phone: f.phone, role: finalRole,
                    bank_name: f.bank_name || null, account_number: f.account_number || null, bank_name_2: f.bank_name_2 || null, account_number_2: f.account_number_2 || null
                }]);
                if (dbError) throw dbError;
                toast.success(isInitialSetup ? "Bos Admin dibuat! Silakan Login." : "Karyawan baru berhasil didaftarkan!", { id: toastId });
            }

            if (isInitialSetup) {
                setNeedsInitialSetup(false);
                setIsSetupMode(false);
            } else {
                setIsHrModalOpen(false);
                fetchData();
            }

            setHrForm({ id: null, role: 'courier', full_name: '', email: '', phone: '', pin: '', bank_name: '', account_number: '', bank_name_2: '', account_number_2: '' });
        } catch (err) {
            console.error(err);
            toast.error(`Gagal menyimpan: ${err.message}`, { id: toastId });
        } finally {
            setIsSubmittingHr(false);
        }
    };

    const fetchAllHistoricalOrders = async () => {
        setLoading(true);
        try {
            const { data: ordersData } = await supabase.from("orders").select("id, status, total_price, customer_name, customer_address, created_at, delivery_fee, is_deleted, customer_wa, raw_order_text, assigned_courier_id, bill_details, kendala_info, image_url, tipe_layanan, bill_sent, completed_at, dispatched_at, failed_couriers, inputted_by").eq("is_deleted", false).order("created_at", { ascending: false });
            if (ordersData) setAllOrders(ordersData);
            toast.success("Berhasil memuat seluruh riwayat pesanan");
        } catch (error) {
            console.error("Error fetching historical orders:", error);
            toast.error("Gagal memuat riwayat pesanan");
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const { data: activeOrders } = await supabase.from("orders").select("id, status, total_price, customer_name, customer_address, created_at, delivery_fee, is_deleted, customer_wa, raw_order_text, assigned_courier_id, bill_details, kendala_info, image_url, tipe_layanan, bill_sent, completed_at, dispatched_at, failed_couriers, inputted_by").in("status", ["pending", "processing", "hold", "waiting_customer", "searching_courier", "courier_found", "on_delivery", "picking_up", "item_ready", "delivering"]).eq("is_deleted", false).order("created_at", { ascending: false });
            const ordersData = [...(activeOrders || [])];
            const { data: couriersData } = await supabase.from("employees").select("id, full_name, pin, role, warning_points, bank_name, account_number, bank_name_2, account_number_2, is_super_admin, is_online").eq("role", "courier");
            const { data: allEmpData } = await supabase.from("employees").select("id, full_name, role, email, phone, pin, bank_name, account_number, bank_name_2, account_number_2, warning_points, is_online, auth_id").order("role", { ascending: true });
            
            let customersData = [];
            if (user && (user.role === 'admin' || user.role === 'superadmin')) {
                const { data } = await supabase.from("customers").select("id, name, phone, address, auth_id, created_at").order("created_at", { ascending: false }).limit(3000);
                if (data) customersData = data;
            }

            const { data: rawRatingsData } = await supabase.from("ratings").select("id, order_id, target_id, target_type, rating, review").eq("target_type", "courier").order("created_at", { ascending: false }).limit(100);

            // Filter out ratings from soft-deleted AND hard-deleted orders manually
            let validOrderIds = new Set();
            if (rawRatingsData && rawRatingsData.length > 0) {
                const orderIds = [...new Set(rawRatingsData.map(r => r.order_id).filter(id => id != null))];
                if (orderIds.length > 0) {
                    const { data: existingOrders } = await supabase.from("orders").select("id, is_deleted").in("id", orderIds);
                    if (existingOrders) {
                        validOrderIds = new Set(existingOrders.filter(o => o.is_deleted !== true).map(o => o.id));
                    }
                }
            }
            const ratingsData = rawRatingsData ? rawRatingsData.filter(r => validOrderIds.has(r.order_id)) : null;

            if (user && user.role === 'courier') {
                const { data: myProfile } = await supabase.from('employees').select('*').eq('id', user.id).maybeSingle();
                if (myProfile) {
                    setCourierProfile(myProfile);
                }
            }

            // ✅ KODE BARU
            const { data: settingsData } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();

            if (ordersData) setAllOrders(ordersData);
            if (couriersData) setCouriersList(couriersData);
            if (allEmpData) setAllEmployees(allEmpData);
            if (customersData) setCustomersList(customersData);
            if (ratingsData) {
                const stats = {};
                const ordRatings = {};
                ratingsData.forEach(r => {
                    if (r.order_id) ordRatings[r.order_id] = r;
                    if (r.target_id) {
                        if (!stats[r.target_id]) stats[r.target_id] = { sum: 0, count: 0 };
                        stats[r.target_id].sum += r.rating;
                        stats[r.target_id].count += 1;
                    }
                });
                const finalStats = {};
                for (const [id, data] of Object.entries(stats)) {
                    finalStats[id] = { average: (data.sum / data.count).toFixed(1), count: data.count };
                }
                setCourierRatingStats(finalStats);
                setOrderRatings(ordRatings);
            }
            if (settingsData) {
                setAdminProfitShare(settingsData.profit_share !== undefined ? settingsData.profit_share : 10);
                setKasShare(settingsData.kas_share !== undefined ? settingsData.kas_share : 10);
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };


    // ==========================================
    // LAZY LOAD HISTORY LOGIC
    // ==========================================
    const getPeriodDateRange = (period, customStart, customEnd) => {
        const now = new Date();
        if (period === 'today') {
            const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            const end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
            return { start, end };
        }
        if (period === 'week') {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            return { start: start.toISOString(), end: null };
        }
        if (period === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
            return { start, end };
        }
        if (period === 'year') {
            const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).toISOString();
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString();
            return { start, end };
        }
        if (period === 'custom' && customStart && customEnd) {
            const start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            return { start: start.toISOString(), end: end.toISOString() };
        }
        if (period === 'all') {
            return { start: null, end: null };
        }
        return { start: null, end: null };
    };

    const fetchAnalyticsData = async (role, period, customStart, customEnd) => {
        if (period === 'custom' && (!customStart || !customEnd)) return;
        try {
            const { start, end } = getPeriodDateRange(period, customStart, customEnd);
            let query = supabase.from("orders").select("id, status, total_price, delivery_fee, tipe_layanan, created_at, completed_at, dispatched_at, assigned_courier_id, failed_couriers").in("status", ["completed", "cancelled", "unreachable"]).eq("is_deleted", false).order("created_at", { ascending: false });

            if (start) query = query.gte("created_at", start);
            if (end) query = query.lte("created_at", end);
            // No limit for analytics to ensure 100% accuracy

            const { data, error } = await query;
            if (error) throw error;

            if (role === 'admin') {
                setAdminAnalyticsOrders(data || []);
            } else {
                setCourierAnalyticsOrders(data || []);
            }
        } catch (err) {
            console.error("Error lazy loading analytics:", err);
            toast.error("Gagal menarik data analitik.");
        }
    };

    const fetchHistoricalData = async (role, period, customStart, customEnd) => {
        if (period === 'custom' && (!customStart || !customEnd)) return;
        setIsFetchingHistory(true);
        try {
            const { start, end } = getPeriodDateRange(period, customStart, customEnd);
            let query = supabase.from("orders").select("id, status, total_price, customer_name, customer_address, created_at, delivery_fee, is_deleted, customer_wa, raw_order_text, assigned_courier_id, bill_details, kendala_info, image_url, tipe_layanan, bill_sent, completed_at, dispatched_at, failed_couriers, inputted_by").in("status", ["completed", "cancelled", "unreachable"]).eq("is_deleted", false).order("created_at", { ascending: false });

            if (start) query = query.gte("created_at", start);
            if (end) query = query.lte("created_at", end);

            // Fetch specific courier orders directly in database for precise pagination
            if (role === 'courier' && user?.id) {
                query = query.or(`assigned_courier_id.eq.${user.id},failed_couriers.cs.[{"id":"${user.id}"}]`);
            }

            // Dynamic limit
            const limit = role === 'admin' ? adminHistoryLimit : courierHistoryLimit;
            query = query.limit(limit);

            const { data, error } = await query;
            if (error) throw error;

            if (role === 'admin') {
                setAdminHistoricalOrders(data || []);
            } else {
                setCourierHistoricalOrders(data || []);
            }
        } catch (err) {
            console.error("Error lazy loading history:", err);
            toast.error("Gagal menarik data riwayat.");
        } finally {
            setIsFetchingHistory(false);
        }
    };

    // Admin Lazy Load - Riwayat
    useEffect(() => {
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return;
        if (adminMainTab === 'riwayat') {
            fetchHistoricalData('admin', adminFilterPeriod, adminFilterStartDate, adminFilterEndDate);
        }
    }, [adminMainTab, adminFilterPeriod, adminFilterStartDate, adminFilterEndDate, user, adminHistoryLimit]);

    // Admin Lazy Load - Analitik
    useEffect(() => {
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return;
        if (adminMainTab === 'laporan') {
            fetchAnalyticsData('admin', adminFilterPeriod, adminFilterStartDate, adminFilterEndDate);
        }
    }, [adminMainTab, adminFilterPeriod, adminFilterStartDate, adminFilterEndDate, user]);

    // Courier Lazy Load - Riwayat
    useEffect(() => {
        if (!user || user.role !== 'courier') return;
        if (courierMainTab === 'riwayat') {
            fetchHistoricalData('courier', courierFilterPeriod, courierFilterStartDate, courierFilterEndDate);
        }
    }, [courierMainTab, courierFilterPeriod, courierFilterStartDate, courierFilterEndDate, user, courierHistoryLimit]);
    
    // Courier Lazy Load - Analitik
    useEffect(() => {
        if (!user || user.role !== 'courier') return;
        if (courierMainTab === 'analitik') {
            fetchAnalyticsData('courier', courierFilterPeriod, courierFilterStartDate, courierFilterEndDate);
        }
    }, [courierMainTab, courierFilterPeriod, courierFilterStartDate, courierFilterEndDate, user]);
    // ==========================================

    const updateGlobalSettings = async (field, newVal) => {
        const val = parseInt(newVal) || 0;
        if (field === 'admin') setAdminProfitShare(val); else setKasShare(val);
        try {
            await supabase.from("app_settings").update({ [field === 'admin' ? 'profit_share' : 'kas_share']: val }).eq("id", 1);
            showNotif("Pengaturan terupdate Real-time!", "success");
        } catch (err) { console.error(err); }
    };

    // [handleEditCourierProfile dipindahkan ke src/pages/courier/CourierProfilTab.jsx]

    useEffect(() => {
        if (!user) return;
        fetchData(); requestNotificationPermission();
        if (user.role === 'admin') fetchReportsData();
        if (user.role === 'courier') fetchCourierReportsData();

        const channel = supabase.channel('realtime_all_tables')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => {
                setAllOrders(prev => [p.new, ...prev]);
                // 1. ADMIN cuma dapet alarm kalau orderannya masuk dari Bot WA (status pending)
                if (user.role === 'admin' && p.new.status === 'pending') {
                    playAlertSound();
                    showPushNotification("🛍️ Order Baru Masuk!", `Ada orderan dari: ${p.new.customer_name || p.new.customer_wa.split('-')[0]}`);
                }
                // 2. KURIR dapet alarm kalau Admin input order manual & langsung di-dispatch ke kurir tsb
                if (user.role === 'courier' && p.new.assigned_courier_id === user.id && p.new.status === 'processing') {
                    playAlertSound();
                    showPushNotification("🚀 Tugas Baru Masuk!", "Admin memberi tugas baru. Cek aplikasi sekarang!");
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) => {
                if (p.new.is_deleted === true) {
                    setAllOrders(prev => prev.filter(o => o.id !== p.new.id));
                    setAdminHistoricalOrders(prev => prev.filter(o => o.id !== p.new.id));
                    setCourierHistoricalOrders(prev => prev.filter(o => o.id !== p.new.id));
                    return;
                }
                setAllOrders(prev => prev.map(o => o.id === p.new.id ? p.new : o));
                const oldStatus = p.old?.status;
                const newStatus = p.new?.status;

                // --- REALTIME UPDATE UNTUK RIWAYAT / ANALITIK ---
                if (['completed', 'cancelled', 'unreachable'].includes(newStatus)) {
                    const updateHist = (prev) => {
                        if (!prev.find(o => o.id === p.new.id)) return [p.new, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        return prev.map(o => o.id === p.new.id ? p.new : o);
                    };
                    if (user.role === 'admin' || user.role === 'superadmin') setAdminHistoricalOrders(updateHist);
                    else if (user.role === 'courier') setCourierHistoricalOrders(updateHist);
                }


                // --- ALARM UNTUK KURIR ---
                if (user.role === 'courier' && p.new.assigned_courier_id === user.id) {
                    // Admin nge-dispatch tugas (dari pending/waiting ke processing)
                    if (newStatus === 'processing' && oldStatus !== 'processing') {
                        playAlertSound();
                        showPushNotification("🚀 Tugas Baru Diterima!", "Cek layar Tugas Aktif sekarang!");
                    }
                    // Admin ngebatalin orderan yang lagi dipegang kurir
                    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
                        playAlertSound();
                        showPushNotification("❌ Order Dibatalkan", "Admin telah membatalkan orderan ini.");
                    }
                }

                // --- ALARM UNTUK ADMIN (Balasan dari Lapangan) ---
                if (user.role === 'admin' && newStatus !== oldStatus) {
                    if (newStatus === 'hold') {
                        playAlertSound();
                        showPushNotification("⚠️ Kurir Lapor Kendala!", `Cek Order #${p.new.id}, kurir sedang negosiasi di lapangan.`);
                    } else if (newStatus === 'waiting_customer') {
                        playAlertSound();
                        showPushNotification("🚩 Kurir Nyerah!", `Kurir membatalkan Order #${p.new.id}. Segera hubungi customer!`);
                    } else if (newStatus === 'delivering' && p.new.tipe_layanan === 'Belanja') {
                        playAlertSound();
                        showPushNotification("🧾 Tagihan Jastip Siap", `Order #${p.new.id} siap dikirim struknya ke customer.`);
                    }
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (p) => {
                setAllOrders(prev => prev.filter(o => o.id !== p.old.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (p) => {
                if (p.eventType === 'INSERT') {
                    setAllEmployees(prev => [p.new, ...prev]);
                    if (p.new.role === 'courier') setCouriersList(prev => [p.new, ...prev]);
                } else if (p.eventType === 'UPDATE') {
                    setAllEmployees(prev => prev.map(e => e.id === p.new.id ? p.new : e));
                    if (p.new.role === 'courier') setCouriersList(prev => prev.map(e => e.id === p.new.id ? p.new : e));
                } else if (p.eventType === 'DELETE') {
                    setAllEmployees(prev => prev.filter(e => e.id !== p.old.id));
                    setCouriersList(prev => prev.filter(e => e.id !== p.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (p) => {
                if (p.eventType === 'INSERT') {
                    setCustomersList(prev => [p.new, ...prev]);
                } else if (p.eventType === 'UPDATE') {
                    setCustomersList(prev => prev.map(c => c.id === p.new.id ? p.new : c));
                } else if (p.eventType === 'DELETE') {
                    setCustomersList(prev => prev.filter(c => c.id !== p.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (p) => {
                if (p.new) {
                    if (p.new.profit_share !== undefined) setAdminProfitShare(p.new.profit_share);
                    if (p.new.kas_share !== undefined) setKasShare(p.new.kas_share);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const adminPendingOrders = allOrders.filter(o => o.status === 'pending');
    const adminProcessingOrders = allOrders.filter(o => o.status === 'processing' || o.status === 'hold' || o.status === 'waiting_customer' || o.status === 'delivering');
    const courierActiveOrders = allOrders.filter(o => (o.status === 'processing' || o.status === 'hold' || o.status === 'delivering') && o.assigned_courier_id === user?.id);
    const courierHistoryOrders = courierHistoricalOrders.filter(o => {
        return ((o.status === 'completed' || o.status === 'cancelled') && o.assigned_courier_id === user?.id) || (o.failed_couriers && Array.isArray(o.failed_couriers) && o.failed_couriers.some(fc => fc.id === user?.id));
    });

    const getCourierStatusIndicator = (order, courierId) => {
        if (order.failed_couriers && Array.isArray(order.failed_couriers) && order.failed_couriers.some(fc => fc.id === courierId)) return { label: 'Gagal (Nyerah)', color: 'bg-red-100 text-red-700' };
        if (order.status === 'completed') return { label: 'Sukses', color: 'bg-emerald-100 text-emerald-700' };
        if (order.status === 'cancelled') return { label: 'Batal / Cancel', color: 'bg-gray-100 text-gray-700' };
        return { label: 'Diproses', color: 'bg-blue-100 text-blue-700' };
    };

    const adminAnalytics = useMemo(() => {
        try {
            const periodOrders = adminAnalyticsOrders.filter(o => isWithinPeriod(o.created_at, adminFilterPeriod, adminFilterStartDate, adminFilterEndDate));
            const analitikSelesai = periodOrders.filter(o => o.status === 'completed');

            const totalOngkirPeriode = analitikSelesai.reduce((sum, o) => sum + (parseFloat(o.delivery_fee) || 0), 0);
            const hakAdminPure = totalOngkirPeriode * (adminProfitShare / 100);
            const kasDasar = totalOngkirPeriode * (kasShare / 100);

            const totalOrdersPeriod = periodOrders.length;
            const suksesOrders = periodOrders.filter(o => o.status === 'completed').length;
            const batalOrders = periodOrders.filter(o => o.status === 'cancelled' && (!o.failed_couriers || o.failed_couriers.length === 0)).length;
            const gagalOrders = periodOrders.filter(o => o.failed_couriers && o.failed_couriers.length > 0).length;

            const persenSukses = totalOrdersPeriod > 0 ? ((suksesOrders / totalOrdersPeriod) * 100).toFixed(1) : 0;
            const persenBatal = totalOrdersPeriod > 0 ? ((batalOrders / totalOrdersPeriod) * 100).toFixed(1) : 0;
            const persenGagal = totalOrdersPeriod > 0 ? ((gagalOrders / totalOrdersPeriod) * 100).toFixed(1) : 0;

            let totalMins = 0, countAll = 0, belanjaMins = 0, countBelanja = 0, ojekMins = 0, countOjek = 0, kirimMins = 0, countKirim = 0;
            analitikSelesai.forEach(o => {
                const m = getDurationMins(o.dispatched_at, o.completed_at);
                if (m !== null) {
                    totalMins += m; countAll++;
                    if (o.tipe_layanan === 'Belanja') { belanjaMins += m; countBelanja++; }
                    else if (o.tipe_layanan === 'Antar Jemput') { ojekMins += m; countOjek++; }
                    else if (o.tipe_layanan === 'Kirim Barang') { kirimMins += m; countKirim++; }
                }
            });
            const avgDurationAll = countAll > 0 ? formatDurLabel(totalMins / countAll) : '-';
            const avgDurationBelanja = countBelanja > 0 ? formatDurLabel(belanjaMins / countBelanja) : '-';
            const avgDurationOjek = countOjek > 0 ? formatDurLabel(ojekMins / countOjek) : '-';
            const avgDurationKirim = countKirim > 0 ? formatDurLabel(kirimMins / countKirim) : '-';

            const timeMap = {}; const hourMap = Array.from({ length: 24 }, (_, i) => ({ name: `${i.toString().padStart(2, '0')}:00`, Belanja: 0, 'Antar Jemput': 0, 'Kirim Barang': 0 }));
            [...periodOrders].reverse().forEach(o => {
                const d = new Date(o.created_at);
                let key = '';
                if (adminChartGrouping === 'daily') key = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                else if (adminChartGrouping === 'weekly') { const firstDay = new Date(d.setDate(d.getDate() - d.getDay() + 1)); key = `Mg ${Math.ceil(firstDay.getDate() / 7)} ${firstDay.toLocaleDateString('id-ID', { month: 'short' })}`; }
                else if (adminChartGrouping === 'monthly') key = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                else if (adminChartGrouping === 'yearly') key = d.getFullYear().toString();

                if (!timeMap[key]) timeMap[key] = { name: key, Belanja: 0, 'Antar Jemput': 0, 'Kirim Barang': 0 };
                const s = o.tipe_layanan || 'Belanja';
                if (timeMap[key][s] !== undefined) timeMap[key][s]++;
                if (hourMap[d.getHours()][s] !== undefined) hourMap[d.getHours()][s]++;
            });

            let targetOrders = 0;
            if (adminFilterPeriod === 'week') targetOrders = 20;
            else if (adminFilterPeriod === 'month') targetOrders = 80;
            else if (adminFilterPeriod === 'year') targetOrders = 1040;

            let totalDendaGlobal = 0;
            let totalSumbanganKasGlobal = 0;
            let totalHakKurirGlobal = 0;

            const totalSelesaiPeriod = analitikSelesai.length;

            const courierPerformance = couriersList.map(c => {
                const cOrdersAll = periodOrders.filter(o => o.assigned_courier_id === c.id);
                const cTotalAssigned = cOrdersAll.length;
                const cOrdersSelesai = analitikSelesai.filter(o => o.assigned_courier_id === c.id);
                const cTotalSelesai = cOrdersSelesai.length;
                const cTotalBatal = cOrdersAll.filter(o => o.status === 'cancelled' && (!o.failed_couriers || o.failed_couriers.length === 0)).length;
                const cTotalGagal = cOrdersAll.filter(o => o.failed_couriers && Array.isArray(o.failed_couriers) && o.failed_couriers.some(fc => fc.id === c.id)).length;

                const cOngkir = cOrdersSelesai.reduce((sum, o) => sum + (parseFloat(o.delivery_fee) || 0), 0);

                const cDenda = (targetOrders > 0 && cTotalSelesai < targetOrders) ? (targetOrders - cTotalSelesai) * 1000 : 0;
                totalDendaGlobal += cDenda;

                const cAdminCut = cOngkir * (adminProfitShare / 100);
                const cKasCut = cOngkir * (kasShare / 100);
                const cPotonganKasAdmin = cAdminCut + cKasCut; // HITUNGAN BARU
                const cSetoranKasTotal = cKasCut + cDenda;

                totalSumbanganKasGlobal += cSetoranKasTotal;

                const cHakKurirTemp = cOngkir - cAdminCut - cKasCut - cDenda;
                const cHakKurirFinal = Math.max(0, cHakKurirTemp);
                totalHakKurirGlobal += cHakKurirFinal;

                return {
                    id: c.id, nama: c.full_name, totalSelesai: cTotalSelesai, totalBatal: cTotalBatal, totalGagal: cTotalGagal, totalAssigned: cTotalAssigned,
                    successRate: cTotalAssigned > 0 ? ((cTotalSelesai / cTotalAssigned) * 100).toFixed(1) : 0,
                    cancelRate: cTotalAssigned > 0 ? ((cTotalBatal / cTotalAssigned) * 100).toFixed(1) : 0,
                    failRate: cTotalAssigned > 0 ? ((cTotalGagal / cTotalAssigned) * 100).toFixed(1) : 0,
                    ongkir: cOngkir, potonganKasAdmin: cPotonganKasAdmin, setoranKas: cSetoranKasTotal, denda: cDenda, hakKurir: cHakKurirFinal, persentase: totalSelesaiPeriod > 0 ? ((cTotalSelesai / totalSelesaiPeriod) * 100).toFixed(1) : 0
                };
            }).sort((a, b) => b.totalSelesai - a.totalSelesai);

            return {
                periodOrders, analitikSelesai, totalOngkirPeriode, hakAdminPure,
                totalKasTermasukDenda: totalSumbanganKasGlobal, totalHakKurirGlobal,
                serviceData: [{ name: 'Belanja', value: periodOrders.filter(o => o.tipe_layanan === 'Belanja').length, fill: '#004aad' }, { name: 'Antar Jemput', value: periodOrders.filter(o => o.tipe_layanan === 'Antar Jemput').length, fill: '#ffde59' }, { name: 'Kirim Barang', value: periodOrders.filter(o => o.tipe_layanan === 'Kirim Barang').length, fill: '#10b981' }],
                trendDataTime: Object.values(timeMap), trendDataHour: hourMap, courierPerformance,
                totalOrdersPeriod, suksesOrders, batalOrders, gagalOrders, persenSukses, persenBatal, persenGagal,
                avgDurationAll, avgDurationBelanja, avgDurationOjek, avgDurationKirim, targetOrders
            };
        } catch (e) {
            return { periodOrders: [], analitikSelesai: [], totalOngkirPeriode: 0, hakAdminPure: 0, totalKasTermasukDenda: 0, totalHakKurirGlobal: 0, serviceData: [], trendDataTime: [], trendDataHour: [], courierPerformance: [], totalOrdersPeriod: 0, suksesOrders: 0, batalOrders: 0, gagalOrders: 0, persenSukses: 0, persenBatal: 0, persenGagal: 0, avgDurationAll: '-', avgDurationBelanja: '-', avgDurationOjek: '-', avgDurationKirim: '-', targetOrders: 0 };
        }
    }, [adminAnalyticsOrders, adminFilterPeriod, adminFilterStartDate, adminFilterEndDate, adminChartGrouping, adminProfitShare, kasShare, couriersList]);

    const courierAnalytics = useMemo(() => {
        try {
            const periodOrders = courierAnalyticsOrders.filter(o => isWithinPeriod(o.created_at, courierFilterPeriod, courierFilterStartDate, courierFilterEndDate) && (courierFilterService === 'all' || o.tipe_layanan === courierFilterService));

            // =======================================================================
            // LOGIKA BARU: MESIN PEMBELAH RIWAYAT (ACTION-BASED HISTORY)
            // Memecah 1 orderan jadi 2 kartu kalau kurir pernah gagal lalu sukses
            // =======================================================================
            const flattenedHistory = [];

            periodOrders.forEach(o => {
                // 1. Cek apakah kurir ini pernah NYERAH di orderan ini?
                if (o.failed_couriers && Array.isArray(o.failed_couriers)) {
                    o.failed_couriers.filter(fc => fc.id === user?.id).forEach(fc => {
                        flattenedHistory.push({
                            ...o,
                            _viewMode: 'failed',
                            _failedReason: fc.reason,
                            _actionTime: fc.time || o.created_at
                        });
                    });
                }
                // 2. Cek apakah kurir ini yang menyelesaikan (Sukses) / membatalkan (Cancel) di akhir?
                if ((o.status === 'completed' || o.status === 'cancelled') && o.assigned_courier_id === user?.id) {
                    flattenedHistory.push({
                        ...o,
                        _viewMode: 'final',
                        _actionTime: o.completed_at || o.created_at
                    });
                }
            });

            // Urutkan dari kejadian yang paling baru
            flattenedHistory.sort((a, b) => new Date(b._actionTime).getTime() - new Date(a._actionTime).getTime());

            // Hitung statistik dari Riwayat yang udah dibelah
            const successOrders = flattenedHistory.filter(o => o._viewMode === 'final' && o.status === 'completed');
            const totalPendapatan = successOrders.reduce((sum, o) => sum + (parseFloat(o.delivery_fee) || 0), 0);
            const potonganPersen = adminProfitShare + kasShare;

            let target = 0;
            if (courierFilterPeriod === 'week') target = 20;
            else if (courierFilterPeriod === 'month') target = 80;
            else if (courierFilterPeriod === 'year') target = 1040;

            const countSukses = successOrders.length;
            const countBatal = flattenedHistory.filter(o => o._viewMode === 'final' && o.status === 'cancelled').length;
            const countGagal = flattenedHistory.filter(o => o._viewMode === 'failed').length;
            const totalAction = countSukses + countBatal + countGagal;

            const denda = (target > 0 && countSukses < target) ? (target - countSukses) * 1000 : 0;
            const bersihPendapatan = Math.max(0, totalPendapatan - (totalPendapatan * (potonganPersen / 100)) - denda);
            const totalTalanganKeluar = successOrders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0);

            const belanjaSks = successOrders.filter(o => o.tipe_layanan === 'Belanja').length;
            const ojekSks = successOrders.filter(o => o.tipe_layanan === 'Antar Jemput').length;
            const kirimSks = successOrders.filter(o => o.tipe_layanan === 'Kirim Barang').length;

            const getWeekNumber = (d) => {
                const date = new Date(d.getTime());
                date.setHours(0, 0, 0, 0);
                date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                const week1 = new Date(date.getFullYear(), 0, 4);
                return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
            };

            const groupedByDate = {};
            flattenedHistory.forEach(o => {
                const dateObj = new Date(o._actionTime || o.created_at);
                let dateStr = "";
                if (courierChartPeriod === 'weekly') {
                    dateStr = `Mg ${getWeekNumber(dateObj)}, ${dateObj.getFullYear()}`;
                } else if (courierChartPeriod === 'monthly') {
                    dateStr = dateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                } else if (courierChartPeriod === 'yearly') {
                    dateStr = dateObj.getFullYear().toString();
                } else {
                    dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                }

                if (!groupedByDate[dateStr]) groupedByDate[dateStr] = { timeLabel: dateStr, success: 0, failed: 0, cancelled: 0 };

                if (o._viewMode === 'final' && o.status === 'completed') groupedByDate[dateStr].success += 1;
                else if (o._viewMode === 'final' && o.status === 'cancelled') groupedByDate[dateStr].cancelled += 1;
                else if (o._viewMode === 'failed') groupedByDate[dateStr].failed += 1;
            });
            const trendDataTime = Object.values(groupedByDate);

            return {
                trendDataTime,
                total: totalAction, sukses: countSukses,
                belanjaSks, ojekSks, kirimSks,
                batal: countBatal, gagal: countGagal,
                persenSukses: totalAction > 0 ? ((countSukses / totalAction) * 100).toFixed(1) : 0,
                persenBatal: totalAction > 0 ? ((countBatal / totalAction) * 100).toFixed(1) : 0,
                persenGagal: totalAction > 0 ? ((countGagal / totalAction) * 100).toFixed(1) : 0,
                pendapatan: totalPendapatan, bersih: bersihPendapatan, potongan: (totalPendapatan * (potonganPersen / 100)), denda, talangan: totalTalanganKeluar, history: flattenedHistory, potonganPersen
            };
        } catch (e) { return { total: 0, sukses: 0, belanjaSks: 0, ojekSks: 0, kirimSks: 0, batal: 0, gagal: 0, persenSukses: 0, persenBatal: 0, persenGagal: 0, pendapatan: 0, bersih: 0, potongan: 0, denda: 0, talangan: 0, history: [], potonganPersen: 0 }; }
    }, [courierAnalyticsOrders, courierFilterPeriod, courierFilterStartDate, courierFilterEndDate, courierFilterService, courierChartPeriod, adminProfitShare, kasShare, user?.id]);

    const handleDispatch = async (orderId) => {
        const courierId = dispatchInputs[`${orderId}_courier`];
        const fee = dispatchInputs[`${orderId}_fee`];
        if (!courierId || !fee) return showNotif("Pilih Kurir & isi Ongkos Jasa dulu bro!", "error");
        try {
            setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "processing", assigned_courier_id: courierId, delivery_fee: parseFloat(fee || 0), kendala_info: null, dispatched_at: new Date().toISOString() } : o));
            const { error } = await supabase.from("orders").update({ status: "processing", assigned_courier_id: courierId, delivery_fee: parseFloat(fee || 0), kendala_info: null, dispatched_at: new Date().toISOString() }).eq("id", orderId);
            if (error) throw error;
            setDispatchInputs(prev => ({ ...prev, [`${orderId}_courier`]: "", [`${orderId}_fee`]: "" }));
            showNotif("Tugas & Ongkir terkirim ke kurir!", "success");
        } catch (error) { showNotif(`Gagal lempar order`, "error"); }
    };

    const cancelPendingOrder = async (orderId) => {
        const { value: cancelReason } = await Swal.fire({
            title: 'Batalkan Pesanan?',
            text: 'Tuliskan alasan spesifik kenapa orderan ini dibatalkan:',
            input: 'textarea',
            inputPlaceholder: 'Contoh: Stok kosong, Toko tutup, Pelanggan membatalkan...',
            showCancelButton: true,
            confirmButtonText: 'Ya, Batalkan',
            cancelButtonText: 'Tidak',
            confirmButtonColor: '#d33',
            inputValidator: (value) => {
                if (!value) return 'Alasan pembatalan wajib diisi!'
            }
        });

        if (cancelReason) {
            try {
                const finalReason = `Dibatalkan Admin: ${cancelReason}`;
                setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "cancelled", kendala_info: finalReason } : o));
                const { error } = await supabase.from("orders").update({ status: "cancelled", kendala_info: finalReason }).eq("id", orderId);
                if (error) throw error; showNotif("Order dibatalkan oleh Admin!", "success");
            } catch (err) { showNotif(`Gagal batal order`, "error"); }
        }
    };

    const submitEditOrder = async () => {
        try {
            // 1. Susun baris belanjaan murni dengan bullet penanda otomatis
            const cleanLinesText = editLines
                .filter(line => line.trim().length > 0)
                .map((line, i) => `${i + 1}. ${line}`)
                .join('\n');

            // 2. Bungkus kembali ke format asli template jastip lo
            const finalText = `Format Belanja/Jastip:\n${cleanLinesText}\n\nNote: ${editNote.trim()}`;

            const { error } = await supabase.from("orders").update({ raw_order_text: finalText, status: "processing", kendala_info: null }).eq("id", editingOrder.id);
            if (error) throw error; setIsEditModalOpen(false); showNotif("Pesanan di-update, orderan lanjut jalan!", "success");
        } catch (err) { showNotif(`Gagal update pesanan`, "error"); }
    };

    const submitCancelOrder = async () => {
        const { value: cancelReason } = await Swal.fire({
            title: 'Batalkan Pesanan?',
            text: 'Tuliskan alasan spesifik kenapa orderan ini dibatalkan:',
            input: 'textarea',
            inputPlaceholder: 'Contoh: Stok kosong, Toko tutup...',
            showCancelButton: true,
            confirmButtonText: 'Ya, Batalkan',
            cancelButtonText: 'Tidak',
            confirmButtonColor: '#d33',
            inputValidator: (value) => {
                if (!value) return 'Alasan pembatalan wajib diisi!'
            }
        });

        if (cancelReason) {
            try {
                const finalReason = `Dibatalkan: ${cancelReason}`;
                setAllOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, status: "cancelled", kendala_info: finalReason } : o));
                const { error } = await supabase.from("orders").update({ status: "cancelled", kendala_info: finalReason }).eq("id", editingOrder.id);
                if (error) throw error; setIsEditModalOpen(false); showNotif("Pesanan berhasil DIBATALKAN!", "success");
            } catch (err) { showNotif(`Gagal membatalkan`, "error"); }
        }
    };

    const handleDeleteOrder = async (orderId) => {
        const { value: text } = await Swal.fire({
            title: "Hapus Permanen?",
            input: "textarea",
            inputLabel: "Alasan penghapusan",
            inputPlaceholder: "Tuliskan alasan...",
            inputAttributes: {
                "aria-label": "Tuliskan alasan penghapusan di sini"
            },
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Ya, Hapus",
            cancelButtonText: "Batal",
            inputValidator: (value) => {
                if (!value) {
                    return "Anda harus mengisi alasan penghapusan!";
                }
            }
        });

        if (text) {
            try {
                const { error } = await supabase.from('orders').update({ is_deleted: true, kendala_info: `Dihapus Permanen: ${text}` }).eq('id', orderId);
                if (error) throw error;
                setAllOrders(prev => prev.filter(o => o.id !== orderId));
                setAdminHistoricalOrders(prev => prev.filter(o => o.id !== orderId));
                setCourierHistoricalOrders(prev => prev.filter(o => o.id !== orderId));
                showNotif("Orderan berhasil dihapus permanen!", "success");
            } catch (err) {
                console.error(err);
                showNotif(`Gagal menghapus: ${err.message}`, "error");
            }
        }
    };

    const handleCustomerSelect = (selectedName) => {
        const cust = customersList.find(c => c.name.toLowerCase() === selectedName.toLowerCase() || c.phone === selectedName);
        if (cust) {
            setManualForm({ ...manualForm, name: cust.name, wa: cust.phone, address: cust.address || '' });
        } else {
            setManualForm({ ...manualForm, name: selectedName });
        }
    };

    const submitManualOrder = async () => {
        if (!manualForm.name || !manualForm.wa || !manualForm.text) return showNotif("Nama, WA dan Pesanan wajib diisi!", "error");
        setIsUploadingManual(true);
        try {
            let uploadedImageUrls = [];

            // Loop upload semua gambar yang dipilih
            if (manualImages && manualImages.length > 0) {
                for (let i = 0; i < manualImages.length; i++) {
                    const file = manualImages[i];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('order-images').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data: publicUrlData } = supabase.storage.from('order-images').getPublicUrl(fileName);
                    uploadedImageUrls.push(publicUrlData.publicUrl);
                }
            }

            const existingCust = customersList.find(c => c.phone === manualForm.wa);
            if (!existingCust) {
                await supabase.from('customers').insert([{ name: manualForm.name, phone: manualForm.wa, address: manualForm.address }]);
            }

            const isDirectDispatch = manualForm.courier && manualForm.fee;
            const { error } = await supabase.from("orders").insert([{
                customer_name: manualForm.name, customer_wa: manualForm.wa, customer_address: manualForm.address, raw_order_text: manualForm.text, tipe_layanan: manualForm.type, status: isDirectDispatch ? 'processing' : 'pending', total_price: 0, delivery_fee: isDirectDispatch ? parseFloat(manualForm.fee || 0) : 0,
                image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls.join(',') : null,
                assigned_courier_id: isDirectDispatch ? manualForm.courier : null, dispatched_at: isDirectDispatch ? new Date().toISOString() : null,
                inputted_by: user ? user.name : null
            }]);
            if (error) throw error;

            setIsManualModalOpen(false); setManualForm({ name: '', wa: '', address: '', text: '', type: 'Belanja', fee: '', courier: '' }); setManualImages([]);
            showNotif(isDirectDispatch ? "Order Dibuat & Langsung Jalan!" : "Order manual berhasil ditambahkan!", "success"); fetchData();
        } catch (err) { showNotif(`Gagal bikin order`, "error"); } finally { setIsUploadingManual(false); }
    };

    const copyFormat = (type) => {
        let text = "";
        if (type === 'ojek') text = "Alamat Jemput:\nAlamat Tujuan:\nNote/Patokan Titik Jemput:\n";
        if (type === 'kirim') text = "Nama/Jenis Barang:\nAlamat Pengambilan:\nAlamat Tujuan:\nNama Penerima:\nNote:\n";
        if (type === 'jastip') text = "List belanjaan secara spesifik:\n1. \n2. \n3. \nNote:";
        navigator.clipboard.writeText(text); showNotif("Format berhasil di-copy!", "success");
    };

    // [parseJastipItems, parseJastipNote, parseJastipItemsObjects sudah dipindahkan ke src/utils/helpers.js]

    // 4. Kalkulator Total Belanjaan
    const calculateJastipTotal = (orderId, rawText) => {
        return parseJastipItemsObjects(rawText).reduce((sum, itemObj, idx) => {
            const userPrice = jastipPrices[`${orderId}_${idx}`];
            const finalPrice = (userPrice !== undefined && userPrice !== "") ? parseFloat(userPrice) : itemObj.defaultPrice;
            return sum + (finalPrice || 0);
        }, 0);
    };
    // =========================================================================

    const submitKendala = async () => {
        let kendalaNote = kendalaForm.text;
        if (kendalaForm.type === 'Belanja' && kendalaForm.jastipItems) {
            const itemsKendala = kendalaForm.jastipItems.filter(i => i.isKendala).map(i => `- ${i.text}: ${i.note}`).join('\n');
            kendalaNote = itemsKendala ? `Barang Kosong/Terkendala:\n${itemsKendala}` : kendalaForm.text;
        }
        if (!kendalaNote) return showNotif("Harap isi keterangan kendala!", "error");
        try {
            setAllOrders(prev => prev.map(o => o.id === kendalaForm.id ? { ...o, status: 'hold', kendala_info: kendalaNote } : o));
            const { error } = await supabase.from("orders").update({ status: 'hold', kendala_info: kendalaNote }).eq("id", kendalaForm.id);
            if (error) throw error; setIsKendalaModalOpen(false); showNotif("Kendala dilaporkan ke Admin!", "success");
        } catch (err) { showNotif(`Gagal lapor kendala`, "error"); }
    };

    const submitTidakBisaLanjut = async (orderId) => {
        try {
            const order = allOrders.find(o => o.id === orderId);
            const currentFailed = Array.isArray(order.failed_couriers) ? order.failed_couriers : [];
            const newFailed = [...currentFailed, { id: user.id, name: user.name, reason: order.kendala_info || "Menyerah karena kendala", time: new Date().toISOString() }];
            setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "waiting_customer", failed_couriers: newFailed } : o));
            const { error } = await supabase.from("orders").update({ status: "waiting_customer", failed_couriers: newFailed }).eq("id", orderId);
            if (error) throw error; showNotif("Order dilepas.", "success");
        } catch (err) { showNotif(`Gagal update`, "error"); }
    };

    const handleLanjutProsesKendala = async (orderId) => {
        try {
            setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "processing" } : o));
            const { error } = await supabase.from("orders").update({ status: "processing" }).eq("id", orderId);
            if (error) throw error; showNotif("Order dilanjutkan kembali!", "success");
        } catch (err) { showNotif(`Gagal update`, "error"); }
    };

    // GENERATOR STRUK: logika canvas dipindahkan ke src/utils/receiptGenerator.js
    const generateAndCopyReceipt = async (order) => {
        const courier = couriersList.find(c => c.id === order.assigned_courier_id) || {};
        return generateReceiptBlob(order, courier, jastipPrices);
    };
    const handleEditOngkirAdmin = (order) => {
        setEditOngkirModal({ isOpen: true, order: order, newOngkir: order.delivery_fee || '' });
    };

    const submitEditOngkirAdmin = async () => {
        const { order, newOngkir } = editOngkirModal;
        if (!newOngkir) return showNotif('Ongkir baru wajib diisi!', 'error');

        try {
            const parsedOngkir = parseInt(newOngkir);
            const { error } = await supabase.from('orders').update({ delivery_fee: parsedOngkir }).eq('id', order.id);
            if (error) throw error;

            setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, delivery_fee: parsedOngkir } : o));
            showNotif("Ongkir berhasil diubah admin", "success");
            setEditOngkirModal({ isOpen: false, order: null, newOngkir: '' });
        } catch (err) {
            console.error("Gagal update ongkir admin:", err);
            showNotif("Gagal mengubah ongkir", "error");
        }
    };

    const handleKirimTagihanKeCustomer = async (order) => {
        showNotif("Membuat Struk Tagihan HD...", "success");
        try {
            const blob = await generateAndCopyReceipt(order);
            try {
                await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
                showNotif("Struk Gambar Otomatis Di-copy! Silakan Paste (Ctrl+V) di WA.", "success");
            } catch (e) {
                const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Struk_${order.id}.png`; a.click();
                showNotif("Struk di-download! Silakan kirimkan ke WA Customer.", "success");
            }

            // UPDATE DATABASE MENJADI BILL_SENT = TRUE
            await supabase.from("orders").update({ bill_sent: true }).eq("id", order.id);

            let phone = order.customer_wa.replace(/\D/g, '');
            if (phone.startsWith('08')) { phone = '62' + phone.substring(1); }

            const courier = couriersList.find(c => c.id === order.assigned_courier_id) || {};
            let textBank = "";
            if (courier.bank_name && courier.account_number) textBank += `\n - ${courier.bank_name}: ${courier.account_number} a/n ${courier.full_name}`;
            if (courier.bank_name_2 && courier.account_number_2) textBank += `\n - ${courier.bank_name_2}: ${courier.account_number_2} a/n ${courier.full_name}`;
            if (textBank === "") textBank = "\n - Silakan hubungi admin untuk info rekening.";

            const serviceName = order.tipe_layanan === 'Belanja' ? 'Belanja/Jastip' : (order.tipe_layanan === 'Antar Jemput' ? 'Antar Jemput/Ojek' : 'Kirim Barang');
            const waText = encodeURIComponent(`Berikut adalah struk tagihan untuk Layanan ${serviceName} anda.\n\nPembayaran via transfer:${textBank}\n\nTerima kasih telah menggunakan layanan TutahTitah.`);
            window.open(`https://wa.me/${phone}?text=${waText}`, '_blank');
        } catch (err) { showNotif("Gagal membuat struk gambar.", "error"); }
    };

    const handleKirimTagihanKeAdmin = async (order) => {
        let finalFee = dispatchInputs[`${order.id}_updateFee`] !== undefined ? dispatchInputs[`${order.id}_updateFee`] : order.delivery_fee;
        if (!finalFee) return showNotif("WAJIB memastikan nominal ongkos jasa!", "error");

        let detailText = "";
        let finalTotalPrice = 0;

        if (order.tipe_layanan === 'Belanja') {
            const rawItemsObj = parseJastipItemsObjects(order.raw_order_text);

            // 🔥 VALIDASI HARGA HARUS TERISI & LEBIH DARI 0
            for (let idx = 0; idx < rawItemsObj.length; idx++) {
                const userPrice = jastipPrices[`${order.id}_${idx}`];
                const hasUserPrice = userPrice !== undefined && userPrice !== "";
                const finalPrice = hasUserPrice ? parseFloat(userPrice) : rawItemsObj[idx].defaultPrice;

                if (Number.isNaN(finalPrice) || finalPrice < 0 || (!hasUserPrice && finalPrice === 0)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Harga Belum Lengkap! ⚠️',
                        text: 'Terdapat produk yang harganya belum diisi. Jika memang gratis, ketik angka 0!',
                        confirmButtonColor: '#004aad'
                    });
                    return;
                }
            }

            finalTotalPrice = calculateJastipTotal(order.id, order.raw_order_text);
            rawItemsObj.forEach((itemObj, idx) => {
                const userPrice = jastipPrices[`${order.id}_${idx}`];
                const finalPrice = (userPrice !== undefined && userPrice !== "") ? parseFloat(userPrice) : itemObj.defaultPrice;
                detailText += `- ${itemObj.name}: Rp ${(finalPrice || 0).toLocaleString('id-ID')}\n`;
            });
        } else if (order.tipe_layanan === 'Antar Jemput') {
            const ojekData = parseOjekDetails(order.raw_order_text);
            if (ojekData) detailText += `Titik Jemput: ${ojekData.jemput}\nTujuan: ${ojekData.tujuan}\n`;
        } else if (order.tipe_layanan === 'Kirim Barang') {
            const kirimData = parseKirimDetails(order.raw_order_text);
            if (kirimData) detailText += `Barang: ${kirimData.barang}\nAmbil: ${kirimData.ambil}\nTujuan: ${kirimData.tujuan}\nPenerima: ${kirimData.penerima}\nNote: ${kirimData.note}\n`;
        }

        try {
            // OPTIMISTIC UPDATE: Update state lokal seketika agar tidak ada delay UI
            setAllOrders(prev => prev.map(o => o.id === order.id ? {
                ...o, status: "delivering", total_price: parseFloat(finalTotalPrice || 0), delivery_fee: parseFloat(finalFee || 0), bill_details: detailText
            } : o));

            const { error } = await supabase.from("orders").update({
                status: "delivering", total_price: parseFloat(finalTotalPrice || 0), delivery_fee: parseFloat(finalFee || 0), bill_details: detailText
            }).eq("id", order.id);

            if (error) throw error;
            showNotif("Rincian tagihan berhasil diteruskan ke Admin!", "success");
        } catch (err) { showNotif(`Gagal kirim tagihan`, "error"); }
    };

    const handleCompleteOrder = async (order) => {
        // GEMBOK ATURAN BARU: CEK APAKAH ADMIN SUDAH KIRIM STRUK KE CUSTOMER
        if (!order.bill_sent) {
            return showNotif("Gagal: Admin belum mengirimkan struk tagihan ke customer!", "error");
        }

        let finalTotalPrice = order.total_price;
        let finalFee = dispatchInputs[`${order.id}_updateFee`] !== undefined ? dispatchInputs[`${order.id}_updateFee`] : order.delivery_fee;
        if (order.tipe_layanan === 'Belanja' && order.status !== 'delivering') finalTotalPrice = calculateJastipTotal(order.id, order.raw_order_text);
        if (!finalFee) return showNotif("Kurir WAJIB memastikan nominal ongkos jasa!", "error");

        try {
            setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "completed", total_price: parseFloat(finalTotalPrice || 0), delivery_fee: parseFloat(finalFee || 0), completed_at: new Date().toISOString() } : o));
            const { error } = await supabase.from("orders").update({ status: "completed", total_price: parseFloat(finalTotalPrice || 0), delivery_fee: parseFloat(finalFee || 0), completed_at: new Date().toISOString() }).eq("id", order.id);
            if (error) throw error; showNotif(`Sukses! Data keuangan tersimpan.`, "success");
        } catch (error) { showNotif(`Gagal menyelesaikan order`, "error"); }
    };


    // --- Beban kerja kurir live (derived state) ---
    const activeCourierCounts = useMemo(() => {
        const counts = {};
        allOrders.forEach(o => {
            if (['processing', 'hold', 'delivering'].includes(o.status) && o.assigned_courier_id) {
                counts[o.assigned_courier_id] = (counts[o.assigned_courier_id] || 0) + 1;
            }
        });
        return counts;
    }, [allOrders]);
    // [ServiceBadge, SimpleTooltip, CustomCourierSelect dipindahkan ke src/components/]

    const chatData = useLiveChat(user);

    if (!user) {
        return (
            <LoginPage
                notif={notif}
                needsInitialSetup={needsInitialSetup}
                isSetupMode={isSetupMode}
                setIsSetupMode={setIsSetupMode}
                hrForm={hrForm}
                setHrForm={setHrForm}
                isSubmittingHr={isSubmittingHr}
                submitRegisterEmployee={submitRegisterEmployee}
                isKurirApp={isKurirApp}
                handleLogin={handleLogin}
                handleForgotPassword={handleForgotPassword}
                emailInput={emailInput}
                setEmailInput={setEmailInput}
                pinInput={pinInput}
                setPinInput={setPinInput}
                isLoggingIn={isLoggingIn}
            />
        );
    }

    // Deteksi apakah kurir dibekukan
    const isSuspended = courierProfile?.pin?.startsWith('BANNED_');

    if (isSuspended) {
        return (
            <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 mb-6 text-red-500 bg-red-100 rounded-full flex items-center justify-center text-4xl shadow-md border-4 border-white">
                    ⛔
                </div>
                <h1 className="text-3xl font-black text-red-700 mb-3 tracking-tight">AKUN DIBEKUKAN</h1>
                <p className="text-red-900/80 mb-8 max-w-sm mx-auto font-medium leading-relaxed">
                    Akses Anda ke sistem telah ditangguhkan sementara. Silakan hubungi tim Admin atau Manajemen Tutah Titah untuk informasi lebih lanjut dan proses pemulihan akun.
                </p>
                <button
                    onClick={() => supabase.auth.signOut()}
                    className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95"
                >
                    Keluar Aplikasi
                </button>
            </div>
        );
    }

    return (
        <div className={`min-h-screen font-sans text-gray-800 flex flex-col ${user?.role === 'courier' ? 'bg-[#eef3fb]' : 'bg-gray-50'}`}>
            {/* Pasang Toaster di sini biar notifnya bisa melayang di seluruh aplikasi */}
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#333',
                        color: '#fff',
                        borderRadius: '10px',
                    },
                }}
            />
            <style>{`@media print { body * { visibility: hidden; } #analytics-export-area, #analytics-export-area * { visibility: visible; } #analytics-export-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; } .no-print { display: none !important; } .print-break { page-break-inside: avoid; } }`}</style>
            <NotifToast notif={notif} className="no-print" />

            {/* TOP NAVIGATION */}
            {user?.role === 'courier' ? (
                /* COURIER HEADER - Only shown on Tugas tab */
                courierMainTab === 'tugas' && (
                    <div className="no-print md:hidden sticky top-0 z-40 bg-white px-4 sm:px-6 py-3 flex justify-between items-center shadow-sm border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                            {/* Logo bulat Tutahtitah */}
                            <div className="w-10 h-10 bg-[#004aad] rounded-full flex items-center justify-center shadow-md overflow-hidden p-1.5 shrink-0 ring-2 ring-[#ffde59] ring-offset-1 ring-offset-white">
                                <img src="/logo-tutahtitah-biru.webp" alt="Logo Tutahtitah" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h1 className="text-sm font-bold text-[#004aad] leading-tight truncate max-w-[120px] sm:max-w-xs">{user?.name}</h1>
                                    <span className="bg-[#ffde59] text-[#004aad] text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none">Kurir</span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium">Tutahtitah Mitra Delivery</p>
                            </div>
                        </div>
                        {/* Tanggal & Toggle di sisi kanan */}
                        <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-[#004aad] leading-tight capitalize">
                                {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}
                            </p>
                            <p className="text-[10px] font-bold text-gray-500 leading-tight mb-1">
                                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                            </p>
                            {(() => {
                                const isOnline = couriersList.find(c => c.id === user?.id)?.is_online || false;
                                return (
                                    <div className="flex items-center gap-1.5 justify-end cursor-pointer" onClick={() => toggleCourierOnlineStatus(isOnline)}>
                                        <span className={`text-[8px] font-bold ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                                        </span>
                                        <div className={`w-7 h-3.5 flex items-center rounded-full p-0.5 transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                            <div className={`bg-white w-2.5 h-2.5 rounded-full shadow-sm transform transition-transform ${isOnline ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )
            ) : (
                /* ADMIN HEADER */
                <div className="no-print bg-white px-4 sm:px-6 py-3 shadow-sm flex justify-between items-center sticky top-0 z-40 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#004aad] rounded-full flex items-center justify-center shadow-sm overflow-hidden p-1 shrink-0">
                            <img src="/logo-tutahtitah-biru.webp" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 leading-tight truncate max-w-[150px] sm:max-w-xs">{user?.name}</h1>
                            <p className="text-[10px] sm:text-xs text-[#004aad] font-bold uppercase tracking-wider">Pusat Komando</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-red-500 bg-red-50 hover:bg-red-500 hover:text-white font-bold px-4 py-2 rounded-xl text-xs transition border border-red-100 shrink-0">Logout</button>
                </div>
            )}

            <div className="flex-1">

                {/* ===================================== */}
                {/* ADMIN VIEW */}
                {/* ===================================== */}
                {user.role === "admin" && (
                    <div className="max-w-7xl mx-auto pb-20 md:pb-0 h-full flex flex-col">
                        <AdminNav adminMainTab={adminMainTab} setAdminMainTab={setAdminMainTab} unreadChatCount={chatData.unreadCount} />

                        <div className="p-4 sm:p-6 flex-1 relative">


                            {/* TAB HRD / MANAJEMEN TIM KHUSUS ADMIN */}
                            {/* ✅ [LEVEL 2 #10] Di-extract ke src/pages/admin/AdminTimTab.jsx */}
                            {adminMainTab === 'tim' && (
                                <AdminTimTab
                                    allEmployees={allEmployees}
                                    hrSearch={hrSearch}
                                    setHrSearch={setHrSearch}
                                    courierRatingStats={courierRatingStats}
                                    onAddEmployee={() => { setHrForm({ id: null, role: 'courier', full_name: '', email: '', phone: '', pin: '', bank_name: '', account_number: '', bank_name_2: '', account_number_2: '' }); setIsHrModalOpen(true); }}
                                    onEditEmployee={openEditEmployee}
                                    onDeleteEmployee={handleDeleteEmployee}
                                    onRestoreEmployee={handleRestoreEmployee}
                                />
                            )}

                            {/* ====================================================== */}
                            {/* TAB PORTAL PUBLIK (UMKM & TESTIMONI) KHUSUS ADMIN */}
                            {/* ====================================================== */}
                            {/* [LEVEL 3 #11] Di-extract ke src/pages/admin/AdminPortalTab.jsx */}
                            {adminMainTab === 'portal' && (
                                <AdminPortalTab
                                    supabase={supabase}
                                    portalTab={portalTab}
                                    setPortalTab={setPortalTab}
                                    searchVerifiedToko={searchVerifiedToko}
                                    setSearchVerifiedToko={setSearchVerifiedToko}
                                    isPortalLoading={isPortalLoading}
                                    portalUmkmData={portalUmkmData}
                                    setPortalUmkmData={setPortalUmkmData}
                                    portalTestimoniData={portalTestimoniData}
                                    setPortalTestimoniData={setPortalTestimoniData}
                                    isLoadingTestimoni={isLoadingTestimoni}
                                    setIsLoadingTestimoni={setIsLoadingTestimoni}
                                    expandedStores={expandedStores}
                                    toggleStoreProducts={toggleStoreProducts}
                                />
                            )}

                            {/* TAB OPERASIONAL ADMIN */}
                            {adminMainTab === 'operasional' && (
                                <AdminOperasionalTab
                                    adminOperasionalTab={adminOperasionalTab}
                                    setAdminOperasionalTab={setAdminOperasionalTab}
                                    adminOperasionalSubTab={adminOperasionalSubTab}
                                    setAdminOperasionalSubTab={setAdminOperasionalSubTab}
                                    adminPendingOrders={adminPendingOrders}
                                    adminProcessingOrders={adminProcessingOrders}
                                    dispatchInputs={dispatchInputs}
                                    setDispatchInputs={setDispatchInputs}
                                    couriersList={couriersList}
                                    activeCourierCounts={activeCourierCounts}
                                    courierRatingStats={courierRatingStats}
                                    isCustomOrderOpen={isCustomOrderOpen}
                                    isTogglingCustomOrder={isTogglingCustomOrder}
                                    customOrderMerchantId={customOrderMerchantId}
                                    onCopyFormat={copyFormat}
                                    onToggleCustomOrder={handleToggleCustomOrder}
                                    onSetLightboxImg={setLightboxImg}
                                    onDispatch={handleDispatch}
                                    onCancelPendingOrder={cancelPendingOrder}
                                    onReplaceCourier={async (order) => {
                                        const newCourier = dispatchInputs[`${order.id}_courier_ganti`];
                                        if (!newCourier) return showNotif("Pilih kurir pengganti dulu!", "error");
                                        try {
                                            const { error } = await supabase.from("orders").update({ status: "processing", assigned_courier_id: newCourier, kendala_info: null, dispatched_at: new Date().toISOString() }).eq("id", order.id);
                                            if (error) throw error;
                                            showNotif("Berhasil ganti kurir & lanjut proses!", "success");
                                            setDispatchInputs({ ...dispatchInputs, [`${order.id}_courier_ganti`]: "" });
                                        } catch (err) { showNotif(`Gagal Ganti Kurir: ${err.message}`, "error"); }
                                    }}
                                    onEditOngkir={handleEditOngkirAdmin}
                                    onSendBillToCustomer={handleKirimTagihanKeCustomer}
                                    onEditOrder={(order) => { setEditingOrder({ id: order.id, text: order.raw_order_text, status: order.status, kendala_info: order.kendala_info }); setIsEditModalOpen(true); }}
                                    onOpenManualOrder={() => setIsManualModalOpen(true)}
                                />
                            )}
                            {/* TAB RIWAYAT ADMIN */}
                            {/* [LEVEL 3 #12] Di-extract ke src/pages/admin/AdminRiwayatTab.jsx */}
                            {adminMainTab === 'riwayat' && (
                                <AdminRiwayatTab
                                    adminFilterPeriod={adminFilterPeriod}
                                    setAdminFilterPeriod={setAdminFilterPeriod}
                                    adminFilterStartDate={adminFilterStartDate}
                                    setAdminFilterStartDate={setAdminFilterStartDate}
                                    adminFilterEndDate={adminFilterEndDate}
                                    setAdminFilterEndDate={setAdminFilterEndDate}
                                    adminFilterService={adminFilterService}
                                    setAdminFilterService={setAdminFilterService}
                                    adminFilterStatus={adminFilterStatus}
                                    setAdminFilterStatus={setAdminFilterStatus}
                                    adminFilterCourier={adminFilterCourier}
                                    setAdminFilterCourier={setAdminFilterCourier}
                                    adminHistorySearch={adminHistorySearch}
                                    setAdminHistorySearch={setAdminHistorySearch}
                                    adminHistoryLimit={adminHistoryLimit}
                                    setAdminHistoryLimit={setAdminHistoryLimit}
                                    adminAnalytics={adminAnalytics}
                                    adminHistoricalOrders={adminHistoricalOrders}
                                    couriersList={couriersList}
                                    isFetchingHistory={isFetchingHistory}
                                    orderRatings={orderRatings}
                                    user={user}
                                    loading={loading}
                                    setLightboxImg={setLightboxImg}
                                    onDeleteOrder={handleDeleteOrder}
                                    onFetchAllHistoricalOrders={fetchAllHistoricalOrders}
                                />
                            )}

                            {/* TAB ANALITIK ADMIN */}
                            {adminMainTab === 'laporan' && (
                                <AdminLaporanTab
                                    adminFilterPeriod={adminFilterPeriod}
                                    setAdminFilterPeriod={setAdminFilterPeriod}
                                    adminFilterStartDate={adminFilterStartDate}
                                    setAdminFilterStartDate={setAdminFilterStartDate}
                                    adminFilterEndDate={adminFilterEndDate}
                                    setAdminFilterEndDate={setAdminFilterEndDate}
                                    adminProfitShare={adminProfitShare}
                                    kasShare={kasShare}
                                    adminChartGrouping={adminChartGrouping}
                                    setAdminChartGrouping={setAdminChartGrouping}
                                    adminAnalytics={adminAnalytics}
                                    onUpdateGlobalSettings={updateGlobalSettings}
                                />
                            )}

                            {/* TAB CHAT ADMIN */}
                            {adminMainTab === 'chat' && (
                                <div className="absolute inset-0 bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-200 overflow-hidden md:m-4 flex flex-col h-[calc(100vh-140px)]">
                                    {chatData.activeChatId ? (
                                        <InternalChatRoom
                                            currentUser={user}
                                            participantName={chatData.chats.find(c => c.id === chatData.activeChatId)?.displayName}
                                            participantAvatar={chatData.chats.find(c => c.id === chatData.activeChatId)?.displayAvatar}
                                            participantSubtitle={chatData.chats.find(c => c.id === chatData.activeChatId)?.displaySubtitle}
                                            messages={chatData.messages}
                                            loading={chatData.loadingMessages}
                                            relevantOrders={chatData.relevantOrders}
                                            loadingOrders={chatData.loadingOrders}
                                            isChatClosed={false}
                                            isUploading={false}
                                            onBack={() => chatData.setActiveChatId(null)}
                                            onSendMessage={chatData.handleSendMessage}
                                            onDeleteMessage={chatData.handleDeleteMessage}
                                            onUploadImage={chatData.handleUploadImage}
                                            onOpenOrderPicker={() => { }}
                                            onCloseOrderPicker={() => { }}
                                        />
                                    ) : (
                                        <InternalChatList
                                            currentUser={user}
                                            chats={chatData.chats}
                                            contacts={chatData.contacts}
                                            loading={chatData.loadingChats}
                                            loadingContacts={chatData.loadingContacts}
                                            onOpenChat={chatData.setActiveChatId}
                                            onFetchContacts={chatData.fetchContacts}
                                            onStartNewChat={chatData.handleStartNewChat}
                                            onDeleteChat={chatData.handleDeleteChat}
                                            onDeleteAllChats={chatData.handleDeleteAllChats}
                                            onMarkAsRead={chatData.handleMarkAsRead}
                                        />
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* ===================================== */}
                {/* COURIER VIEW */}
                {/* ===================================== */}
                {user.role === "courier" && (
                    <div className="w-full max-w-screen-xl mx-auto pb-24 md:pb-0">

                        {/* ── TOP HEADER BAR (tablet & desktop only) ── */}
                        <div className="no-print hidden md:flex items-center justify-between bg-[#004aad] px-6 py-3 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow border-2 border-[#ffde59] p-1">
                                    <img src="/kurir-tutahtitah.webp" alt="Avatar" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm leading-tight">{user?.name}</p>
                                    <span className="text-[#ffde59] text-[9px] font-bold uppercase tracking-wider">Mitra Kurir</span>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="text-[10px] font-bold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                                🚪 Keluar
                            </button>
                        </div>

                        {/* ── LAYOUT CONTAINER: sidebar (lg) + content ── */}
                        <div className="md:flex md:flex-row md:min-h-screen">

                            <CourierNav
                                courierMainTab={courierMainTab}
                                setCourierMainTab={setCourierMainTab}
                                activeOrdersCount={courierActiveOrders.length}
                                forwardedReportsCount={courierReports.filter(r => r.status === 'forwarded').length}
                                unreadChatCount={chatData.unreadCount}
                            />

                            {/* ── MAIN CONTENT AREA ── */}
                            <div className="flex-1 min-w-0 relative">

                                {/* TAB TUGAS */}
                                {courierMainTab === 'tugas' && (
                                    <CourierTugasAktifTab
                                        courierActiveOrders={courierActiveOrders}
                                        courierTugasSubTab={courierTugasSubTab}
                                        setCourierTugasSubTab={setCourierTugasSubTab}
                                        loading={loading}
                                        user={user}
                                        jastipPrices={jastipPrices}
                                        jastipChecked={jastipChecked}
                                        calculateJastipTotal={calculateJastipTotal}
                                        updateJastipPrice={updateJastipPrice}
                                        updateJastipChecked={updateJastipChecked}
                                        dispatchInputs={dispatchInputs}
                                        setDispatchInputs={setDispatchInputs}
                                        onSetLightboxImg={setLightboxImg}
                                        onOpenEditOrder={(order) => { setEditingOrder({ id: order.id, text: order.raw_order_text, status: order.status, kendala_info: order.kendala_info }); setIsEditModalOpen(true); }}
                                        onOpenKendala={(order) => { const items = order.tipe_layanan === 'Belanja' ? parseJastipItemsObjects(order.raw_order_text).map(item => ({ text: item.name, isKendala: false, note: '' })) : []; setKendalaForm({ id: order.id, type: order.tipe_layanan, text: '', jastipItems: items }); setIsKendalaModalOpen(true); }}
                                        onSendBillToAdmin={handleKirimTagihanKeAdmin}
                                        onCompleteOrder={handleCompleteOrder}
                                        onGiveUp={submitTidakBisaLanjut}
                                        onContinueAfterIssue={handleLanjutProsesKendala}
                                    />
                                )}

                                {/* TAB RIWAYAT */}
                                {courierMainTab === 'riwayat' && (
                                    <CourierRiwayatTab
                                        courierFilterPeriod={courierFilterPeriod}
                                        setCourierFilterPeriod={setCourierFilterPeriod}
                                        courierFilterService={courierFilterService}
                                        setCourierFilterService={setCourierFilterService}
                                        courierFilterStartDate={courierFilterStartDate}
                                        setCourierFilterStartDate={setCourierFilterStartDate}
                                        courierFilterEndDate={courierFilterEndDate}
                                        setCourierFilterEndDate={setCourierFilterEndDate}
                                        courierHistoryOrders={courierHistoryOrders}
                                        user={user}
                                        courierHistoryLimit={courierHistoryLimit}
                                        setCourierHistoryLimit={setCourierHistoryLimit}
                                        isFetchingHistory={isFetchingHistory}
                                        loading={loading}
                                        orderRatings={orderRatings}
                                        setLightboxImg={setLightboxImg}
                                        onFetchAllHistoricalOrders={fetchAllHistoricalOrders}
                                    />
                                )}

                                {/* TAB ANALITIK (sekarang termasuk Pelanggaran) */}
                                {courierMainTab === 'analitik' && (
                                    <CourierAnalitikTab
                                        courierFilterPeriod={courierFilterPeriod}
                                        setCourierFilterPeriod={setCourierFilterPeriod}
                                        courierFilterService={courierFilterService}
                                        setCourierFilterService={setCourierFilterService}
                                        courierFilterStartDate={courierFilterStartDate}
                                        setCourierFilterStartDate={setCourierFilterStartDate}
                                        courierFilterEndDate={courierFilterEndDate}
                                        setCourierFilterEndDate={setCourierFilterEndDate}
                                        courierChartPeriod={courierChartPeriod}
                                        setCourierChartPeriod={setCourierChartPeriod}
                                        courierAnalytics={courierAnalytics}
                                        courierRatingStats={courierRatingStats}
                                        user={user}
                                        courierProfile={courierProfile}
                                        courierReports={courierReports}
                                        onSubmitFeedback={handleSubmitFeedback}
                                        onOpenAttachment={(order) => { setAttachmentOrder(order); setIsAttachmentModalOpen(true); }}
                                    />
                                )}

                                {/* TAB PROFIL */}
                                {courierMainTab === 'profil' && (
                                    <CourierProfilTab
                                        user={user}
                                        courierProfile={courierProfile}
                                        onSave={saveCourierProfile}
                                        handleLogout={handleLogout}
                                    />
                                )}

                                {/* TAB CHAT KURIR */}
                                {courierMainTab === 'chat' && (
                                    <div className="absolute inset-0 bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-200 overflow-hidden md:m-4 flex flex-col h-[calc(100vh-140px)]">
                                        {chatData.activeChatId ? (
                                            <InternalChatRoom
                                                currentUser={user}
                                                participantName={chatData.chats.find(c => c.id === chatData.activeChatId)?.displayName}
                                                participantAvatar={chatData.chats.find(c => c.id === chatData.activeChatId)?.displayAvatar}
                                                participantSubtitle={chatData.chats.find(c => c.id === chatData.activeChatId)?.displaySubtitle}
                                                messages={chatData.messages}
                                                loading={chatData.loadingMessages}
                                                relevantOrders={chatData.relevantOrders}
                                                loadingOrders={chatData.loadingOrders}
                                                isChatClosed={false}
                                                isUploading={false}
                                                onBack={() => chatData.setActiveChatId(null)}
                                                onSendMessage={chatData.handleSendMessage}
                                                onDeleteMessage={chatData.handleDeleteMessage}
                                                onUploadImage={chatData.handleUploadImage}
                                                onOpenOrderPicker={() => { }}
                                                onCloseOrderPicker={() => { }}
                                            />
                                        ) : (
                                            <InternalChatList
                                                currentUser={user}
                                                chats={chatData.chats}
                                                contacts={chatData.contacts}
                                                loading={chatData.loadingChats}
                                                loadingContacts={chatData.loadingContacts}
                                                onOpenChat={chatData.setActiveChatId}
                                                onFetchContacts={chatData.fetchContacts}
                                                onStartNewChat={chatData.handleStartNewChat}
                                                onDeleteChat={chatData.handleDeleteChat}
                                                onDeleteAllChats={chatData.handleDeleteAllChats}
                                                onMarkAsRead={chatData.handleMarkAsRead}
                                            />
                                        )}
                                    </div>
                                )}




                            </div>{/* end main content */}
                        </div>{/* end flex layout */}
                    </div>
                )}

            </div>

            {/* MODAL EDIT PESANAN */}

            {/* MODAL LAMPIRAN LAPORAN */}
            <ReportAttachmentModal
                isOpen={isAttachmentModalOpen}
                onClose={() => setIsAttachmentModalOpen(false)}
                order={attachmentOrder}
            />

            {/* MODAL EDIT ONGKIR */}
            <EditOngkirModal
                editOngkirModal={editOngkirModal}
                setEditOngkirModal={setEditOngkirModal}
                onSubmit={submitEditOngkirAdmin}
            />

            {/* MODAL EDIT ORDER */}
            <EditOrderModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                editingOrder={editingOrder}
                editLines={editLines}
                editNote={editNote}
                onLineChange={handleEditLineChange}
                onAddLine={handleAddEditLine}
                onRemoveLine={handleRemoveEditLine}
                onNoteChange={setEditNote}
                onSubmitEdit={submitEditOrder}
                onSubmitCancel={submitCancelOrder}
            />

            {/* MODAL TAMBAH PEGAWAI (HRD) */}
            <HrModal
                isOpen={isHrModalOpen}
                onClose={() => setIsHrModalOpen(false)}
                hrForm={hrForm}
                setHrForm={setHrForm}
                onSubmit={() => submitRegisterEmployee(false)}
                isSubmitting={isSubmittingHr}
            />

            {/* MODAL INPUT MANUAL */}
            <ManualOrderModal
                isOpen={isManualModalOpen}
                onClose={() => { setIsManualModalOpen(false); setManualImages([]); }}
                manualForm={manualForm}
                setManualForm={setManualForm}
                manualImages={manualImages}
                setManualImages={setManualImages}
                isUploading={isUploadingManual}
                onSubmit={submitManualOrder}
                onCopyFormat={copyFormat}
                setLightboxData={setLightboxData}
                customersList={customersList}
                couriersList={couriersList}
                activeCourierCounts={activeCourierCounts}
            />


            {/* MODAL LAPOR KENDALA */}
            <KendalaModal
                isOpen={isKendalaModalOpen}
                onClose={() => setIsKendalaModalOpen(false)}
                kendalaForm={kendalaForm}
                setKendalaForm={setKendalaForm}
                onSubmit={submitKendala}
            />




            {/* MODAL BUAT PIN BARU (DARI LINK RESET EMAIL) */}
            <ResetPinModal
                isOpen={isResetPasswordModalOpen}
                form={resetPinForm}
                setForm={setResetPinForm}
                onSubmit={handleSaveNewResetPin}
                isSubmitting={isSubmittingResetPin}
            />


            {/* MODAL PENGATURAN PROFIL & PIN MANDIRI UNTUK KURIR */}
            <CourierSettingsModal
                isOpen={isCourierSettingsOpen}
                onClose={() => setIsCourierSettingsOpen(false)}
                form={courierSettingsForm}
                setForm={setCourierSettingsForm}
                onSubmit={submitCourierSettings}
                isSubmitting={isSubmittingCourierSettings}
            />


            {/* LIGHTBOX UNTUK FOTO BELANJAAN MULTIPLE */}
            <ImageLightbox lightboxData={lightboxData} setLightboxData={setLightboxData} />
        </div>
    );
}


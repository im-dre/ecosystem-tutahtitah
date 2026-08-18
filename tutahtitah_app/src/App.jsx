import React, { useState, useEffect, useMemo } from "react";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
// === TAMBAHAN UNTUK INTEGRASI PORTAL UMKM (FIREBASE) & TESTIMONI (GAS) ===
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDoc, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import toast, { Toaster } from 'react-hot-toast';
import Swal from 'sweetalert2';

// GANTI DENGAN CONFIG FIREBASE KAMU (Sama persis dengan yang di auth.html Project 2)
const firebaseConfig = {
            apiKey: "AIzaSyDVkYXJCiB5wY12M5Lte7jGO8d_J2NN00w",
            authDomain: "system-tutahtitah.firebaseapp.com",
            projectId: "system-tutahtitah",
            storageBucket: "system-tutahtitah.firebasestorage.app",
            messagingSenderId: "561053088556",
            appId: "1:561053088556:web:3914ab3b92b8123d8aca89"
        };
        
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// GANTI DENGAN URL WEB APP GOOGLE SCRIPT YANG BARU KAMU DEPLOY
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyjZkE5aO2Ku3cxIO-qNBb7c30dNbJDf5xXsC9DqseQZVaOoi32QBG9VNDIy83dUFUdlQ/exec";
// =========================================================================

// KUNCI SUPABASE UTAMA
const SUPABASE_URL = "https://tphaeukukktjykorkcxi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XQdY7plphwCcoEEt7M1_bw_bdgpa0j6";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NOTIF_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function App() {
  const [user, setUser] = useState(null);

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
  const [couriersList, setCouriersList] = useState([]);
  const [customersList, setCustomersList] = useState([]); 
  
  const [adminProfitShare, setAdminProfitShare] = useState(10);
  const [kasShare, setKasShare] = useState(10);
  
  const [adminMainTab, setAdminMainTab] = useState('operasional'); 
  const [adminOperasionalTab, setAdminOperasionalTab] = useState('pending'); 
  const [adminFilterPeriod, setAdminFilterPeriod] = useState('month');
  const [adminFilterStartDate, setAdminFilterStartDate] = useState('');
  const [adminFilterEndDate, setAdminFilterEndDate] = useState('');
  const [adminChartGrouping, setAdminChartGrouping] = useState('daily');
  
  const [adminHistorySearch, setAdminHistorySearch] = useState('');

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

  const fetchPortalData = async () => {
    try {
        console.log("🚀 [MULAI DETEKTIF] Menarik data Portal Publik...");

        // ==========================================
        // 1. TARIK & FILTER DATA DARI umkm_users
        // ==========================================
        const umkmSnapshot = await getDocs(collection(db, "umkm_users"));
        const pendingUmkmList = [];

        umkmSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            if (data.status) {
                const statusStr = data.status.toLowerCase();
                // TARIK SEMUA KECUALI 'draft', 'unverified', dan 'rejected'
                if (statusStr === 'pending' || statusStr === 'verified' || statusStr === 'published' || statusStr === 'suspended') {
                    pendingUmkmList.push({ id: docSnap.id, ...data });
                }
            }
        });

        console.log(`📦 Ditemukan ${pendingUmkmList.length} UMKM dengan status pending di umkm_users.`);

        // ==========================================
        // 2. JOIN DATA DENGAN collection "stores" & "products"
        // ==========================================
        const mergedDataPromises = pendingUmkmList.map(async (user) => {
        try {
            // A. Tarik Data Toko (stores)
            const storeRef = doc(db, "stores", user.id);
            const storeSnap = await getDoc(storeRef);
            let storeData = {};
            
            if (storeSnap.exists()) {
            storeData = storeSnap.data();
            }

            // B. Tarik Data Produk (products) berdasarkan UID Penjual
            const produkQuery = query(
            collection(db, "products"), 
            where("uid_penjual", "==", user.id)
            );
            const produkSnap = await getDocs(produkQuery);
            
            const listProduk = [];
            produkSnap.forEach((docSnap) => {
            listProduk.push({ id_produk: docSnap.id, ...docSnap.data() });
            });

            // C. Gabungkan Semuanya (User + Toko + Array Produk)
            return {
            ...user,
            alamat: storeData.alamat || "",
            deskripsi: storeData.deskripsi || "",
            kategori: storeData.kategori || storeData.kategory || [], 
            logoUrl: storeData.logo_url || "",
            jam_operasional: storeData.jam_operasional || "",
            nama_toko: storeData.nama_toko || user.nama_toko, 
            store_updated_at: storeData.update_at || null,
            produk: listProduk // <--- Ini pelurunya! Semua produk UMKM ini masuk ke array
            };
            
        } catch (err) {
            console.error(`Gagal menarik data detail untuk UID ${user.id}:`, err);
            return user;
        }
        });

        const finalMergedData = await Promise.all(mergedDataPromises);
        
        console.log("✅ [HASIL MERGE] Data akhir yang siap dirender:", finalMergedData);
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
        return portalUmkmData.filter(item => item.status === 'verified' || item.status === 'published').length;
    }, [portalUmkmData]);

    const totalProdukLive = useMemo(() => {
        let count = 0;
        portalUmkmData.forEach(item => {
        if ((item.status === 'verified' || item.status === 'published') && item.produk) {
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
        const payload = {
            action: 'approveUMKM',
            data: umkm 
        };

        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === 'success') {
            const umkmRef = doc(db, "umkm_users", umkm.id);
            await updateDoc(umkmRef, {
            status: "verified" 
            });

            toast.success(result.message, { id: toastId });
            fetchPortalData(); 
        } else {
            toast.error(`Gagal: ${result.message}`, { id: toastId });
        }
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
            // 3. Update status di Firebase Firestore
            const umkmRef = doc(db, "umkm_users", umkm.id);
            await updateDoc(umkmRef, {
            status: "rejected",
            alasan_penolakan: alasan
            });

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
            const umkmRef = doc(db, "umkm_users", umkm.id);
            await updateDoc(umkmRef, {
                status: "suspended",
                alasan_suspend: alasan,
                alasan_banding: null,
                // 🌟 FITUR ENTERPRISE: Rekam Snapshot Data Sebelum Diperbaiki Penjual!
                snapshot_suspend: {
                    nama_toko: umkm.nama_toko || '',
                    deskripsi: umkm.deskripsi || '',
                    alamat: umkm.alamat || '',
                    jam_operasional: umkm.jam_operasional || '',
                    logoUrl: umkm.logoUrl || '',
                    produk: umkm.produk || [] // Copy seluruh array produknya
                }
            });

            toast.success(`Toko ${umkm.nama_toko} resmi dinonaktifkan.`, { id: toastId });
            fetchPortalData(); 
        } catch (error) {
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
            const umkmRef = doc(db, "umkm_users", umkm.id);
            await updateDoc(umkmRef, {
                status: "verified", // Kembali live
                alasan_suspend: null,
                alasan_banding: null,
                snapshot_suspend: null // Hapus rekam jejak fotokopi
            });

            toast.success(`Toko ${umkm.nama_toko} berhasil dipulihkan & live kembali!`, { id: toastId });
            fetchPortalData(); 
        } catch (error) {
            toast.error("Gagal memproses pemulihan toko.", { id: toastId });
        }
    };

  const [adminFilterService, setAdminFilterService] = useState('all'); 
  const [adminFilterStatus, setAdminFilterStatus] = useState('all'); 
  const [adminFilterCourier, setAdminFilterCourier] = useState('all'); 
  
  const [dispatchInputs, setDispatchInputs] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  const [courierMainTab, setCourierMainTab] = useState('aktif'); 
  const [courierFilterPeriod, setCourierFilterPeriod] = useState('month');
  const [courierFilterStartDate, setCourierFilterStartDate] = useState(''); // STATE BARU: Tgl Awal
  const [courierFilterEndDate, setCourierFilterEndDate] = useState('');     // STATE BARU: Tgl Akhir
  const [courierFilterService, setCourierFilterService] = useState('all'); 
  const [courierFilterStatus, setCourierFilterStatus] = useState('all'); 
  const [courierHistorySearch, setCourierHistorySearch] = useState(''); 
  
  // STATE MANAJEMEN TIM (HRD)
  const [allEmployees, setAllEmployees] = useState([]);
  const [isHrModalOpen, setIsHrModalOpen] = useState(false);
  const [hrForm, setHrForm] = useState({ id: null,role: 'courier', full_name: '', email: '', phone: '', pin: '', bank_name: '', account_number: '', bank_name_2: '', account_number_2: '' });
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

  const openCourierSettings = async () => {
      try {
          const { data, error } = await supabase.from('employees').select('*').eq('id', user.id).single();
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
          const { data: empData, error: fetchErr } = await supabase.from('employees').select('auth_id, pin').eq('id', user.id).single();
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
      try { return JSON.parse(localStorage.getItem('tutahJastipPrices')) || {}; } catch(e) { return {}; }
  });
  const [jastipChecked, setJastipChecked] = useState(() => {
      try { return JSON.parse(localStorage.getItem('tutahJastipChecked')) || {}; } catch(e) { return {}; }
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

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '-';
        return `${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } catch(e) { return '-'; }
  };
  
  const calculateDuration = (startIso, endIso) => {
      if (!startIso || !endIso) return '-';
      try {
          const diffMins = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
          if (diffMins < 0) return '-';
          if (diffMins < 60) return `${diffMins} Mnt`;
          return `${Math.floor(diffMins / 60)}j ${diffMins % 60}m`;
      } catch(e) { return '-'; }
  };
  
  const getDurationMins = (startIso, endIso) => {
      if (!startIso || !endIso) return null;
      try {
          const diffMs = new Date(endIso) - new Date(startIso);
          return diffMs > 0 ? diffMs / 60000 : null;
      } catch(e) { return null; }
  };
  const formatDurLabel = (m) => m > 0 ? (m < 60 ? `${Math.round(m)} Mnt` : `${Math.floor(m/60)}j ${Math.round(m%60)}m`) : '-';

  const isWithinPeriod = (dateString, period, customStart, customEnd) => {
    if (!dateString) return false;
    try {
        const d = new Date(dateString); d.setHours(0,0,0,0);
        const now = new Date(); now.setHours(0,0,0,0);
        if (period === 'today') return d.getTime() === now.getTime();
        if (period === 'week') { const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); return d >= weekAgo; }
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === 'year') return d.getFullYear() === now.getFullYear();
        if (period === 'custom') {
            if(customStart && customEnd) {
                const s = new Date(customStart); s.setHours(0,0,0,0);
                const e = new Date(customEnd); e.setHours(23,59,59,999);
                return d >= s && d <= e;
            }
        }
        return true;
    } catch(e) { return false; }
  };

  const getWaLink = (waString) => {
      if (!waString) return '#';
      let cleanNum = waString.replace(/[^0-9]/g, '');
      if (cleanNum.startsWith('08')) { cleanNum = '62' + cleanNum.substring(1); }
      return `https://wa.me/${cleanNum}`;
  };

  // PARSER OJEK (ANTAR JEMPUT)
  const parseOjekDetails = (rawText) => {
      if (!rawText) return null;
      const jemputMatch = rawText.match(/Alamat Jemput:\s*([\s\S]*?)(?=Alamat Tujuan:|$)/i);
      const tujuanMatch = rawText.match(/Alamat Tujuan:\s*([\s\S]*?)(?=Note\/Patokan Titik Jemput:|$)/i);
      const noteMatch = rawText.match(/Note\/Patokan Titik Jemput:\s*([\s\S]*)/i);

      if (!jemputMatch && !tujuanMatch) return null; // Jika bukan format ojek, return null

      return {
          jemput: jemputMatch && jemputMatch[1].trim() ? jemputMatch[1].trim() : '-',
          tujuan: tujuanMatch && tujuanMatch[1].trim() ? tujuanMatch[1].trim() : '-',
          note: noteMatch && noteMatch[1].trim() ? noteMatch[1].trim() : ''
      };
  };

  // PARSER KIRIM BARANG
  const parseKirimDetails = (rawText) => {
      if (!rawText) return null;
      const barangMatch = rawText.match(/Nama\/Jenis Barang:\s*([\s\S]*?)(?=Alamat Pengambilan:|$)/i);
      const ambilMatch = rawText.match(/Alamat Pengambilan:\s*([\s\S]*?)(?=Alamat Tujuan:|$)/i);
      const tujuanMatch = rawText.match(/Alamat Tujuan:\s*([\s\S]*?)(?=Nama Penerima:|$)/i);
      const penerimaMatch = rawText.match(/Nama Penerima:\s*([\s\S]*?)(?=Note:|$)/i);
      const noteMatch = rawText.match(/Note:\s*([\s\S]*)/i);

      if (!barangMatch && !ambilMatch && !tujuanMatch) return null; // Jika bukan format kirim, return null

      return {
          barang: barangMatch && barangMatch[1].trim() ? barangMatch[1].trim() : '-',
          ambil: ambilMatch && ambilMatch[1].trim() ? ambilMatch[1].trim() : '-',
          tujuan: tujuanMatch && tujuanMatch[1].trim() ? tujuanMatch[1].trim() : '-',
          penerima: penerimaMatch && penerimaMatch[1].trim() ? penerimaMatch[1].trim() : '-',
          note: noteMatch && noteMatch[1].trim() ? noteMatch[1].trim() : ''
      };
  };

  const showNotif = (message, type) => { setNotif({ message, type }); setTimeout(() => setNotif({ message: "", type: "" }), 3000); };
  const requestNotificationPermission = () => { if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission(); };
  const playAlertSound = () => { try { new Audio(NOTIF_SOUND_URL).play().catch(()=>{}); } catch (e) {} };
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
          const { data, error } = await supabase.from('employees').select('*').eq('auth_id', authId).single();
          if (data && !error) {
              setUser({ role: data.role, name: data.full_name, id: data.id, auth_id: authId });
              requestNotificationPermission();
          } else {
              handleLogout();
          }
      } catch (err) { console.error("Error fetching profile:", err); }
  };

  useEffect(() => {
      checkInitialSetup();
      
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
      
      if(!f.email || !f.pin || !f.full_name || !f.phone) {
          return showNotif("Nama, Email, PIN, dan No WA Wajib Diisi!", "error");
      }
      if(f.pin.length < 6) return showNotif("PIN minimal 6 karakter/angka!", "error");

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
              const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ordersData } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      const { data: couriersData } = await supabase.from("employees").select("*").eq("role", "courier");
      const { data: allEmpData } = await supabase.from("employees").select("*").order("role", { ascending: true });
      const { data: customersData } = await supabase.from("customers").select("*");
      // ✅ KODE BARU
      const { data: settingsData } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      
      if (ordersData) setAllOrders(ordersData);
      if (couriersData) setCouriersList(couriersData);
      if (allEmpData) setAllEmployees(allEmpData);
      if (customersData) setCustomersList(customersData);
      if (settingsData) {
          setAdminProfitShare(settingsData.profit_share !== undefined ? settingsData.profit_share : 10);
          setKasShare(settingsData.kas_share !== undefined ? settingsData.kas_share : 10);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const updateGlobalSettings = async (field, newVal) => {
      const val = parseInt(newVal) || 0;
      if(field === 'admin') setAdminProfitShare(val); else setKasShare(val);
      try {
          await supabase.from("app_settings").update({ [field === 'admin' ? 'profit_share' : 'kas_share']: val }).eq("id", 1);
          showNotif("Pengaturan terupdate Real-time!", "success");
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!user) return;
    fetchData(); requestNotificationPermission();
    
    const channel = supabase.channel('realtime_all_tables')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => { 
          fetchData(); 
          // 1. ADMIN cuma dapet alarm kalau orderannya masuk dari Bot WA (status pending)
          if (user.role === 'admin' && p.new.status === 'pending') { 
              playAlertSound(); 
              showPushNotification("🔔 Order Baru Masuk!", `Ada orderan dari: ${p.new.customer_name || p.new.customer_wa.split('-')[0]}`); 
          }
          // 2. KURIR dapet alarm kalau Admin input order manual & langsung di-dispatch ke kurir tsb
          if (user.role === 'courier' && p.new.assigned_courier_id === user.id && p.new.status === 'processing') {
              playAlertSound(); 
              showPushNotification("🛵 Tugas Baru Masuk!", "Admin memberi tugas baru. Cek aplikasi sekarang!");
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) => { 
          fetchData(); 
          const oldStatus = p.old?.status;
          const newStatus = p.new?.status;

          // --- ALARM UNTUK KURIR ---
          if (user.role === 'courier' && p.new.assigned_courier_id === user.id) {
              // Admin nge-dispatch tugas (dari pending/waiting ke processing)
              if (newStatus === 'processing' && oldStatus !== 'processing') { 
                  playAlertSound(); 
                  showPushNotification("🛵 Tugas Baru Diterima!", "Cek layar Tugas Aktif sekarang!"); 
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
                  showPushNotification("🚨 Kurir Nyerah!", `Kurir membatalkan Order #${p.new.id}. Segera hubungi customer!`);
              } else if (newStatus === 'delivering' && p.new.tipe_layanan === 'Belanja') {
                  playAlertSound();
                  showPushNotification("🧾 Tagihan Jastip Siap", `Order #${p.new.id} siap dikirim struknya ke customer.`);
              }
          }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (p) => { 
          if(p.new) { 
              if(p.new.profit_share !== undefined) setAdminProfitShare(p.new.profit_share); 
              if(p.new.kas_share !== undefined) setKasShare(p.new.kas_share); 
          } 
      })
      .subscribe();
      
    const fallbackRadar = setInterval(fetchData, 8000);
    return () => { supabase.removeChannel(channel); clearInterval(fallbackRadar); };
  }, [user]);

  const adminPendingOrders = allOrders.filter(o => o.status === 'pending');
  const adminProcessingOrders = allOrders.filter(o => o.status === 'processing' || o.status === 'hold' || o.status === 'waiting_customer' || o.status === 'delivering');
  const courierActiveOrders = allOrders.filter(o => (o.status === 'processing' || o.status === 'hold' || o.status === 'delivering') && o.assigned_courier_id === user?.id);
  const courierHistoryOrders = allOrders.filter(o => {
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
        const periodOrders = allOrders.filter(o => isWithinPeriod(o.created_at, adminFilterPeriod, adminFilterStartDate, adminFilterEndDate));
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
            if(m !== null) {
                totalMins += m; countAll++;
                if(o.tipe_layanan === 'Belanja') { belanjaMins += m; countBelanja++; }
                else if(o.tipe_layanan === 'Antar Jemput') { ojekMins += m; countOjek++; }
                else if(o.tipe_layanan === 'Kirim Barang') { kirimMins += m; countKirim++; }
            }
        });
        const avgDurationAll = countAll > 0 ? formatDurLabel(totalMins / countAll) : '-';
        const avgDurationBelanja = countBelanja > 0 ? formatDurLabel(belanjaMins / countBelanja) : '-';
        const avgDurationOjek = countOjek > 0 ? formatDurLabel(ojekMins / countOjek) : '-';
        const avgDurationKirim = countKirim > 0 ? formatDurLabel(kirimMins / countKirim) : '-';

        const timeMap = {}; const hourMap = Array.from({length: 24}, (_, i) => ({ name: `${i.toString().padStart(2, '0')}:00`, Belanja: 0, 'Antar Jemput': 0, 'Kirim Barang': 0 }));
        [...periodOrders].reverse().forEach(o => {
            const d = new Date(o.created_at);
            let key = '';
            if (adminChartGrouping === 'daily') key = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
            else if (adminChartGrouping === 'weekly') { const firstDay = new Date(d.setDate(d.getDate() - d.getDay() + 1)); key = `Mg ${Math.ceil(firstDay.getDate()/7)} ${firstDay.toLocaleDateString('id-ID', { month: 'short' })}`; }
            else if (adminChartGrouping === 'monthly') key = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            else if (adminChartGrouping === 'yearly') key = d.getFullYear().toString();

            if(!timeMap[key]) timeMap[key] = { name: key, Belanja: 0, 'Antar Jemput': 0, 'Kirim Barang': 0 };
            const s = o.tipe_layanan || 'Belanja';
            if(timeMap[key][s] !== undefined) timeMap[key][s]++;
            if(hourMap[d.getHours()][s] !== undefined) hourMap[d.getHours()][s]++;
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
    } catch(e) {
        return { periodOrders: [], analitikSelesai: [], totalOngkirPeriode: 0, hakAdminPure: 0, totalKasTermasukDenda: 0, totalHakKurirGlobal: 0, serviceData: [], trendDataTime: [], trendDataHour: [], courierPerformance: [], totalOrdersPeriod: 0, suksesOrders: 0, batalOrders: 0, gagalOrders: 0, persenSukses: 0, persenBatal: 0, persenGagal: 0, avgDurationAll: '-', avgDurationBelanja: '-', avgDurationOjek: '-', avgDurationKirim: '-', targetOrders: 0 };
    }
  }, [allOrders, adminFilterPeriod, adminFilterStartDate, adminFilterEndDate, adminChartGrouping, adminProfitShare, kasShare, couriersList]);

  const courierAnalytics = useMemo(() => {
      try {
          const periodOrders = courierHistoryOrders.filter(o => isWithinPeriod(o.created_at, courierFilterPeriod, courierFilterStartDate, courierFilterEndDate));
          
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

          return { 
              total: totalAction, sukses: countSukses, 
              belanjaSks, ojekSks, kirimSks,
              batal: countBatal, gagal: countGagal,
              persenSukses: totalAction > 0 ? ((countSukses / totalAction) * 100).toFixed(1) : 0,
              persenBatal: totalAction > 0 ? ((countBatal / totalAction) * 100).toFixed(1) : 0,
              persenGagal: totalAction > 0 ? ((countGagal / totalAction) * 100).toFixed(1) : 0,
              pendapatan: totalPendapatan, bersih: bersihPendapatan, potongan: (totalPendapatan * (potonganPersen / 100)), denda, talangan: totalTalanganKeluar, history: flattenedHistory 
          };
      } catch(e) { return { total: 0, sukses: 0, belanjaSks:0, ojekSks:0, kirimSks:0, batal: 0, gagal: 0, persenSukses: 0, persenBatal: 0, persenGagal: 0, pendapatan: 0, bersih: 0, potongan: 0, denda: 0, talangan: 0, history: [] }; }
  }, [courierHistoryOrders, courierFilterPeriod, courierFilterStartDate, courierFilterEndDate, adminProfitShare, kasShare, user?.id]);

  const handleDispatch = async (orderId) => {
    const courierId = dispatchInputs[`${orderId}_courier`];
    const fee = dispatchInputs[`${orderId}_fee`];
    if (!courierId || !fee) return showNotif("Pilih Kurir & isi Ongkos Jasa dulu bro!", "error");
    try {
      const { error } = await supabase.from("orders").update({ status: "processing", assigned_courier_id: courierId, delivery_fee: parseFloat(fee || 0), kendala_info: null, dispatched_at: new Date().toISOString() }).eq("id", orderId);
      if (error) throw error;
      setDispatchInputs(prev => ({ ...prev, [`${orderId}_courier`]: "", [`${orderId}_fee`]: "" }));
      showNotif("Tugas & Ongkir terkirim ke kurir!", "success");
    } catch (error) { showNotif(`Gagal lempar order`, "error"); }
  };

  const cancelPendingOrder = async (orderId) => {
      try {
          const { error } = await supabase.from("orders").update({ status: "cancelled", kendala_info: "Dibatalkan admin" }).eq("id", orderId);
          if (error) throw error; showNotif("Order dibatalkan oleh Admin!", "success");
      } catch(err) { showNotif(`Gagal batal order`, "error"); }
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
        if(error) throw error; setIsEditModalOpen(false); showNotif("Pesanan di-update, orderan lanjut jalan!", "success");
      } catch(err) { showNotif(`Gagal update pesanan`, "error"); }
  };

  const submitCancelOrder = async () => {
      try {
        const { error } = await supabase.from("orders").update({ status: "cancelled", kendala_info: "Dibatalkan Admin/Customer" }).eq("id", editingOrder.id);
        if(error) throw error; setIsEditModalOpen(false); showNotif("Pesanan berhasil DIBATALKAN!", "success");
      } catch(err) { showNotif(`Gagal membatalkan`, "error"); }
  };

  const handleCustomerSelect = (selectedName) => {
      const cust = customersList.find(c => c.name.toLowerCase() === selectedName.toLowerCase() || c.phone === selectedName);
      if(cust) {
          setManualForm({...manualForm, name: cust.name, wa: cust.phone, address: cust.address || ''});
      } else {
          setManualForm({...manualForm, name: selectedName});
      }
  };

  const submitManualOrder = async () => {
      if(!manualForm.name || !manualForm.wa || !manualForm.text) return showNotif("Nama, WA dan Pesanan wajib diisi!", "error");
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
          if(!existingCust) {
              await supabase.from('customers').insert([{ name: manualForm.name, phone: manualForm.wa, address: manualForm.address }]);
          }

          const isDirectDispatch = manualForm.courier && manualForm.fee;
          const { error } = await supabase.from("orders").insert([{
              customer_name: manualForm.name, customer_wa: manualForm.wa, customer_address: manualForm.address, raw_order_text: manualForm.text, tipe_layanan: manualForm.type, status: isDirectDispatch ? 'processing' : 'pending', total_price: 0, delivery_fee: isDirectDispatch ? parseFloat(manualForm.fee || 0) : 0, 
              image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls.join(',') : null, 
              assigned_courier_id: isDirectDispatch ? manualForm.courier : null, dispatched_at: isDirectDispatch ? new Date().toISOString() : null
          }]);
          if(error) throw error;
          
          setIsManualModalOpen(false); setManualForm({ name: '', wa: '', address: '', text: '', type: 'Belanja', fee: '', courier: '' }); setManualImages([]);
          showNotif(isDirectDispatch ? "Order Dibuat & Langsung Jalan!" : "Order manual berhasil ditambahkan!", "success"); fetchData();
      } catch(err) { showNotif(`Gagal bikin order`, "error"); } finally { setIsUploadingManual(false); }
  };

  const copyFormat = (type) => {
      let text = "";
      if(type === 'ojek') text = "Alamat Jemput:\nAlamat Tujuan:\nNote/Patokan Titik Jemput:\n";
      if(type === 'kirim') text = "Nama/Jenis Barang:\nAlamat Pengambilan:\nAlamat Tujuan:\nNama Penerima:\nNote:\n";
      if(type === 'jastip') text = "List belanjaan secara spesifik:\n1. \n2. \n3. \nNote:";
      navigator.clipboard.writeText(text); showNotif("Format berhasil di-copy!", "success");
  };

  // =========================================================================
  // 🛒 KUMPULAN FUNGSI PARSER JASTIP (JANGAN DIPISAH BIAR AMAN)
  // =========================================================================

  // 1. Pemecah Teks Asli dari Landing Page
  const parseJastipItems = (rawText) => {
      if (!rawText) return [];
      let listPart = rawText.split(/note:/i)[0].split(/alamat tujuan:/i)[0];
      listPart = listPart.replace(/format belanja\/jastip:/ig, '');
      listPart = listPart.replace(/list belanjaan secara spesifik:/ig, '');
      return listPart.split('\n').filter(line => {
          const t = line.trim();
          if (t.length === 0) return false;
          if (/^\d+\.?$/.test(t)) return false; 
          return true;
      }).map(line => line.trim());
  };

  // 2. Penangkap Catatan Khusus
  const parseJastipNote = (rawText) => {
      if (!rawText) return '';
      const match = rawText.match(/note:\s*([\s\S]*)/i);
      return match ? match[1].trim() : '';
  };

  // 3. Parser Cerdas (Pemisah Nama Menu & Harga)
  const parseJastipItemsObjects = (rawText) => {
      return parseJastipItems(rawText).map(line => {
          let name = line;
          let defaultPrice = 0;
          const splitIndex = line.lastIndexOf('= Rp ');
          if (splitIndex > -1) {
              name = line.substring(0, splitIndex).trim();
              defaultPrice = parseFloat(line.substring(splitIndex + 5).trim()) || 0;
          }
          return { name, defaultPrice, original: line };
      });
  };

  // 4. Kalkulator Total Belanjaan
  const calculateJastipTotal = (orderId, rawText) => {
      return parseJastipItemsObjects(rawText).reduce((sum, itemObj, idx) => {
          const userPrice = jastipPrices[`${orderId}_${idx}`];
          const finalPrice = userPrice !== undefined ? parseFloat(userPrice || 0) : itemObj.defaultPrice;
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
      if(!kendalaNote) return showNotif("Harap isi keterangan kendala!", "error");
      try {
          const { error } = await supabase.from("orders").update({ status: 'hold', kendala_info: kendalaNote }).eq("id", kendalaForm.id);
          if(error) throw error; setIsKendalaModalOpen(false); showNotif("Kendala dilaporkan ke Admin!", "success");
      } catch (err) { showNotif(`Gagal lapor kendala`, "error"); }
  };

  const submitTidakBisaLanjut = async (orderId) => {
      try {
          const order = allOrders.find(o => o.id === orderId);
          const currentFailed = Array.isArray(order.failed_couriers) ? order.failed_couriers : [];
          const newFailed = [...currentFailed, { id: user.id, name: user.name, reason: order.kendala_info || "Menyerah karena kendala", time: new Date().toISOString() }];
          const { error } = await supabase.from("orders").update({ status: "waiting_customer", failed_couriers: newFailed }).eq("id", orderId);
          if(error) throw error; showNotif("Order dilepas.", "success");
      } catch(err) { showNotif(`Gagal update`, "error"); }
  };

  const handleLanjutProsesKendala = async (orderId) => {
      try {
          const { error } = await supabase.from("orders").update({ status: "processing" }).eq("id", orderId);
          if(error) throw error; showNotif("Order dilanjutkan kembali!", "success");
      } catch(err) { showNotif(`Gagal update`, "error"); }
  };

  // GENERATOR GAMBAR STRUK NATIVE HTML5 CANVAS DENGAN PIXEL SCALING (HD MODE)
  // GENERATOR GAMBAR STRUK (ALL SERVICES SUPPORTED)
  const generateAndCopyReceipt = async (order) => {
      return new Promise((resolve, reject) => {
          const courier = couriersList.find(c => c.id === order.assigned_courier_id) || {};
          let isBelanja = order.tipe_layanan === 'Belanja';
          let parsedItems = [];
          
          if (isBelanja) {
              if (order.bill_details) {
                  const lines = order.bill_details.split('\n').filter(l => l.trim().length > 0);
                  parsedItems = lines.map(line => {
                      const match = line.match(/^- (.*):\s*Rp\s*(.*)$/);
                      if (match) return { name: match[1].trim(), priceText: match[2].trim() };
                      return { name: line.replace(/^- /, ''), priceText: '0' };
                  });
              } else {
                  const rawItems = parseJastipItems(order.raw_order_text);
                  parsedItems = rawItems.map((item, idx) => {
                      const p = parseFloat(jastipPrices[`${order.id}_${idx}`]) || 0;
                      return { name: item, priceText: p.toLocaleString('id-ID') };
                  });
              }
          } else {
              // Untuk Ojek & Kirim Barang
              if (order.bill_details) {
                  parsedItems = order.bill_details.split('\n').filter(l => l.trim().length > 0).map(line => ({ name: line }));
              } else {
                  if (order.tipe_layanan === 'Antar Jemput') {
                      const ojekData = parseOjekDetails(order.raw_order_text);
                      if (ojekData) parsedItems = [{name: `Titik Jemput: ${ojekData.jemput}`}, {name: `Tujuan: ${ojekData.tujuan}`}];
                  } else if (order.tipe_layanan === 'Kirim Barang') {
                      const kirimData = parseKirimDetails(order.raw_order_text);
                      if (kirimData) parsedItems = [{name: `Barang: ${kirimData.barang}`}, {name: `Ambil: ${kirimData.ambil}`}, {name: `Tujuan: ${kirimData.tujuan}`}, {name: `Penerima: ${kirimData.penerima}`}, {name: `Note: ${kirimData.note}`}];
                  }
                  if (parsedItems.length === 0) parsedItems = [{name: order.raw_order_text.substring(0, 50) + '...'}];
              }
          }

          const itemHeight = isBelanja ? 25 : 22; // Baris untuk ojek dirapatkan dikit biar rapi
          const scale = 2; 
          const canvas = document.createElement('canvas');
          
          const baseWidth = 450;
          const baseHeight = 590 + (parsedItems.length * itemHeight);
          
          canvas.width = baseWidth * scale;
          canvas.height = baseHeight * scale;
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);

          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, baseWidth, baseHeight); 
          ctx.fillStyle = '#004aad'; ctx.fillRect(0, 0, baseWidth, 140); 
          
          ctx.strokeStyle = '#ffde59'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(130, 25); ctx.lineTo(30, 25); ctx.arcTo(20, 25, 20, 35, 10); ctx.lineTo(20, 115); ctx.arcTo(20, 125, 30, 125, 10); ctx.lineTo(110, 125); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(320, 25); ctx.lineTo(420, 25); ctx.arcTo(430, 25, 430, 35, 10); ctx.lineTo(430, 115); ctx.arcTo(430, 125, 420, 125, 10); ctx.lineTo(340, 125); ctx.stroke();

          ctx.fillStyle = '#ffffff'; ctx.font = '800 16px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('LAYANAN HARIAN', 225, 31);
          ctx.fillStyle = '#ffde59'; ctx.font = '800 18px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('SEMUA KAMI KERJAKAN', 225, 131);

          ctx.font = 'italic 900 58px "Arial Black", Impact, sans-serif';
          ctx.textAlign = 'right'; ctx.fillStyle = '#ffde59'; ctx.fillText('TUTAH', 223, 90);
          ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.fillText('TITAH', 227, 90);

          let y = 170;
          ctx.fillStyle = '#111827'; ctx.font = '800 13px sans-serif'; ctx.textAlign = 'center';

          const teksTagihan = 'STRUK TAGIHAN';
          ctx.fillText(teksTagihan, 225, y); 
          const textWidth = ctx.measureText(teksTagihan).width;
          ctx.beginPath(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#111827'; 
          ctx.moveTo(225 - (textWidth / 2), y + 4); ctx.lineTo(225 + (textWidth / 2), y + 4); ctx.stroke(); 

          y += 40;
          ctx.textAlign = 'left'; ctx.font = '600 13px sans-serif'; ctx.fillStyle = '#4b5563';
          ctx.fillText(`Pelanggan: ${order.customer_name || order.customer_wa.split('-')[0]}`, 20, y);
          ctx.fillText(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 250, y);
          y += 20;
          ctx.fillText(`Order ID: #${order.id}`, 20, y);
          ctx.fillText(`Kurir: ${courier.full_name || '-'}`, 250, y);
          y += 20;

          ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(430, y); ctx.stroke(); y += 25;

          ctx.fillStyle = '#111827'; ctx.font = '700 14px sans-serif'; 
          ctx.fillText(isBelanja ? 'Rincian Belanja:' : 'Rincian Layanan:', 20, y); y += 20;
          
          if (isBelanja) {
              ctx.font = '500 13px sans-serif';
              parsedItems.forEach((itemObj) => {
                  ctx.fillText(itemObj.name.length > 35 ? itemObj.name.substring(0,35)+'...' : itemObj.name, 20, y);
                  ctx.textAlign = 'right'; ctx.fillText(`Rp ${itemObj.priceText}`, 430, y); ctx.textAlign = 'left';
                  y += itemHeight;
              });
          } else {
              // LOGIKA BARU: CETAK TEBAL UNTUK LABEL OJEK/KIRIM BARANG
              parsedItems.forEach((itemObj) => {
                  const line = itemObj.name;
                  const colonIdx = line.indexOf(':');
                  if (colonIdx > -1) {
                      const label = line.substring(0, colonIdx + 1);
                      const val = line.substring(colonIdx + 1).trim();
                      
                      ctx.font = '700 13px sans-serif';
                      ctx.fillStyle = '#6b7280'; // abu-abu
                      ctx.fillText(label, 20, y);
                      
                      const labelWidth = ctx.measureText(label).width;
                      
                      ctx.font = '600 13px sans-serif';
                      ctx.fillStyle = '#111827'; // hitam pekat
                      ctx.fillText(val.length > 45 ? val.substring(0, 45) + '...' : val, 20 + labelWidth + 5, y);
                  } else {
                      ctx.font = '500 13px sans-serif';
                      ctx.fillStyle = '#111827';
                      ctx.fillText(line.length > 60 ? line.substring(0,60)+'...' : line, 20, y);
                  }
                  y += itemHeight;
              });
          }

          y += 10; ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(430, y); ctx.stroke(); y += 25;

          const subtotal = order.bill_details ? parseFloat(order.total_price || 0) : (isBelanja ? calculateJastipTotal(order.id, order.raw_order_text) : 0);
          const ongkir = parseFloat(order.delivery_fee || 0);
          const grandTotal = subtotal + ongkir;

          ctx.font = '600 13px sans-serif';
          ctx.fillStyle = '#111827';
          if (isBelanja) {
              ctx.fillText('Subtotal Belanja', 20, y); ctx.textAlign = 'right'; ctx.fillText(`Rp ${subtotal.toLocaleString('id-ID')}`, 430, y); ctx.textAlign = 'left'; y += 25;
          }
          ctx.fillText('Ongkos Jasa', 20, y); ctx.textAlign = 'right'; ctx.fillText(`Rp ${ongkir.toLocaleString('id-ID')}`, 430, y); ctx.textAlign = 'left'; y += 30;

          ctx.font = '900 18px sans-serif'; ctx.fillStyle = '#004aad';
          ctx.fillText('GRAND TOTAL', 20, y); ctx.textAlign = 'right'; ctx.fillText(`Rp ${grandTotal.toLocaleString('id-ID')}`, 430, y); ctx.textAlign = 'left';

          y += 40; 
          ctx.fillStyle = '#f3f4f6'; ctx.fillRect(20, y, 410, 110);
          y += 25;
          ctx.fillStyle = '#111827'; ctx.font = '800 13px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('METODE PEMBAYARAN (CASH / TRANSFER)', 225, y); y += 20;
          ctx.font = '600 12px sans-serif'; ctx.fillStyle = '#004aad';
          
          const pay1 = (courier.bank_name && courier.account_number) ? `${courier.bank_name}: ${courier.account_number}` : `Hubungi admin untuk rekening kurir`;
          ctx.fillText(pay1, 225, y); y += 18;
          if (courier.bank_name_2 && courier.account_number_2) {
              const pay2 = `${courier.bank_name_2}: ${courier.account_number_2}`;
              ctx.fillText(pay2, 225, y); y += 18;
          }
          ctx.fillText(`a/n ${courier.full_name || 'Kurir Tutah Titah'}`, 225, y);

          y += 45;
          ctx.fillStyle = '#111827'; ctx.font = '700 13px sans-serif';
          ctx.fillText('Terima kasih telah menggunakan layanan TutahTitah. 🙏', 225, y);
          y += 20;
          ctx.font = '500 11px sans-serif'; ctx.fillStyle = '#4b5563';
          ctx.fillText('WA: 087842344481 | IG: tutahtitah  |  FB: Tutahtitah  |  TikTok: @tutahtitah_', 225, y);

          canvas.toBlob(blob => resolve(blob), 'image/png', 1.0); 
      });
  };

  const handleKirimTagihanKeCustomer = async (order) => {
      showNotif("Membuat Struk Tagihan HD...", "success");
      try {
          const blob = await generateAndCopyReceipt(order);
          try {
              await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
              showNotif("Struk Gambar Otomatis Di-copy! Silakan Paste (Ctrl+V) di WA.", "success");
          } catch(e) {
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
      } catch(err) { showNotif("Gagal membuat struk gambar.", "error"); }
  };

  const handleKirimTagihanKeAdmin = async (order) => {
      let finalFee = dispatchInputs[`${order.id}_updateFee`] !== undefined ? dispatchInputs[`${order.id}_updateFee`] : order.delivery_fee;
      if (!finalFee) return showNotif("WAJIB memastikan nominal ongkos jasa!", "error");

      let detailText = "";
      let finalTotalPrice = 0;

      if (order.tipe_layanan === 'Belanja') {
          const rawItemsObj = parseJastipItemsObjects(order.raw_order_text);
          
            // 🔥 VALIDASI HARGA HARUS TERISI (MENGIZINKAN ANGKA 0)
            for (let idx = 0; idx < rawItemsObj.length; idx++) {
                const userPrice = jastipPrices[`${order.id}_${idx}`];
                
                // Tolak jika input sengaja dikosongkan ("") ATAU belum disentuh padahal tidak ada harga default
                if (userPrice === "" || (userPrice === undefined && rawItemsObj[idx].defaultPrice === 0)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Harga Belum Lengkap! ⚠️',
                        text: 'Terdapat produk yang harganya masih kosong. (Silakan ketik angka 0 secara manual jika barang gratis/habis).',
                        confirmButtonColor: '#004aad'
                    });
                    return; 
                }

                const finalPrice = userPrice !== undefined && userPrice !== "" ? parseFloat(userPrice) : rawItemsObj[idx].defaultPrice;
                
                // Tolak jika kurir iseng masukin harga minus
                if (finalPrice < 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Harga Tidak Valid! ⚠️',
                        text: 'Harga produk tidak boleh minus (kurang dari 0)!',
                        confirmButtonColor: '#004aad'
                    });
                    return; 
                }
            }

          finalTotalPrice = calculateJastipTotal(order.id, order.raw_order_text);
          rawItemsObj.forEach((itemObj, idx) => {
              const userPrice = jastipPrices[`${order.id}_${idx}`];
              const finalPrice = userPrice !== undefined ? parseFloat(userPrice || 0) : itemObj.defaultPrice;
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
          const { error } = await supabase.from("orders").update({ 
              status: "delivering", total_price: parseFloat(finalTotalPrice||0), delivery_fee: parseFloat(finalFee||0), bill_details: detailText 
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
      const { error } = await supabase.from("orders").update({ status: "completed", total_price: parseFloat(finalTotalPrice||0), delivery_fee: parseFloat(finalFee||0), completed_at: new Date().toISOString() }).eq("id", order.id);
      if (error) throw error; showNotif(`Sukses! Data keuangan tersimpan.`, "success");
    } catch (error) { showNotif(`Gagal menyelesaikan order`, "error"); }
  };

  const ServiceBadge = ({ type }) => {
    if (type === 'Belanja') return <span className="bg-blue-100 text-[#004aad] px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-block shadow-sm border border-blue-200">🛒 Belanja</span>;
    if (type === 'Antar Jemput') return <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-block shadow-sm border border-yellow-200">🛵 Antar Jemput</span>;
    if (type === 'Kirim Barang') return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-block shadow-sm border border-emerald-200">📦 Kirim Barang</span>;
    return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-block shadow-sm border border-gray-200">📋 Umum</span>;
  };

  const SimpleTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg border border-gray-100 rounded-xl z-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">{label || payload[0].payload.name}</p>
            {payload.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center gap-4 mb-1">
                    <span className="text-[10px] font-bold" style={{color: p.stroke || p.fill}}>{p.name}:</span>
                    <span className="text-sm font-black text-gray-900">{p.value} Order</span>
                </div>
            ))}
        </div>
      );
    }
    return null;
  };

  // --- KOMPONEN BARU: MENGHITUNG BEBAN KERJA KURIR LIVE ---
  const activeCourierCounts = useMemo(() => {
      const counts = {};
      allOrders.forEach(o => {
          if (['processing', 'hold', 'delivering'].includes(o.status) && o.assigned_courier_id) {
              counts[o.assigned_courier_id] = (counts[o.assigned_courier_id] || 0) + 1;
          }
      });
      return counts;
  }, [allOrders]);

  // --- KOMPONEN BARU: CUSTOM DROPDOWN PREMIUM ---
  const CustomCourierSelect = ({ value, onChange, placeholder, bgClass = "bg-gray-50" }) => {
      const [isOpen, setIsOpen] = useState(false);
      const selected = couriersList.find(c => c.id === value);
      
      // LOGIKA FILTER & SORTING: Filter yang aktif, lalu urutkan abjad A-Z berdasarkan full_name
      const activeCouriers = couriersList
          .filter(c => !(c.pin && c.pin.startsWith('BANNED_')))
          .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

      return (
          <div className="relative w-full">
              <div 
                  className={`w-full px-3 py-2.5 ${bgClass} border border-gray-200 rounded-lg font-bold cursor-pointer flex justify-between items-center transition hover:border-[#004aad]`}
                  onClick={() => setIsOpen(!isOpen)}
              >
                  {/* Kalau belum milih (placeholder), teksnya dikasih ukuran 10px aja biar imut */}
                  <span className={`truncate ${!selected ? 'text-[10px] text-gray-500' : 'text-xs sm:text-sm text-gray-700'}`}>
                      {selected ? selected.full_name : placeholder}
                  </span>
                  <span className="text-gray-400 text-[10px]">▼</span>
              </div>
              
              {isOpen && (
                  <>
                      {/* Layar transparan biar bisa close pas klik di luar */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                      {/* Mekar ke ATAS */}
                      <div className="absolute z-50 bottom-full mb-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto py-1">
                          <div 
                              className={`px-3 py-2 text-[10px] font-bold hover:bg-blue-50 cursor-pointer transition ${!value ? 'text-[#004aad] bg-blue-50/50' : 'text-gray-500'}`}
                              onClick={() => { onChange(''); setIsOpen(false); }}
                          >
                              {placeholder}
                          </div>
                          {/* Looping dari daftar kurir yang AKTIF doang */}
                          {activeCouriers.map(c => {
                              const count = activeCourierCounts[c.id] || 0;
                              return (
                                  <div 
                                      key={c.id}
                                      className={`px-3 py-2.5 text-xs hover:bg-blue-50 cursor-pointer flex justify-between items-center transition border-t border-gray-50 ${value === c.id ? 'bg-blue-50/50' : ''}`}
                                      onClick={() => { onChange(c.id); setIsOpen(false); }}
                                  >
                                      <span className={`font-bold ${value === c.id ? 'text-[#004aad]' : 'text-gray-700'}`}>{c.full_name}</span>
                                      {count > 0 && (
                                          <span className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 px-2 py-1 rounded-md text-[9px] font-black whitespace-nowrap shadow-sm">
                                              {count} In progress
                                          </span>
                                      )}
                                  </div>
                              )
                          })}
                      </div>
                  </>
              )}
          </div>
      );
  };

  if (!user) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4 font-sans relative">
        {/* PANGGUNG TOASTER UNTUK HALAMAN LOGIN */}
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff', borderRadius: '10px' } }} />
        
        {notif.message && (<div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl font-bold text-white shadow-xl ${notif.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>{notif.message}</div>)}
        
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
                <h2 className="text-2xl font-black text-gray-800 mb-2">Setup Bos Admin</h2>
                <p className="text-xs text-gray-500 mb-6 font-medium">Ini hanya dilakukan 1x. Setelah Bos Admin dibuat, pendaftaran karyawan lain dilakukan di dalam Dashboard.</p>
                <form onSubmit={(e) => { e.preventDefault(); submitRegisterEmployee(true); }} className="space-y-4">
                    <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nama Lengkap</label><input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500" value={hrForm.full_name} onChange={e => setHrForm({...hrForm, full_name: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Alamat Email (Untuk Login)</label><input type="email" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500" value={hrForm.email} onChange={e => setHrForm({...hrForm, email: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">PIN Rahasia (Minimal 6 Angka/Huruf)</label><input type="password" required minLength="6" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500" value={hrForm.pin} onChange={e => setHrForm({...hrForm, pin: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nomor WhatsApp Aktif</label><input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500" value={hrForm.phone} onChange={e => setHrForm({...hrForm, phone: e.target.value})} /></div>
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

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800 flex flex-col">
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
      {notif.message && (<div className={`no-print fixed top-4 right-4 z-50 px-6 py-3 rounded-xl font-bold text-white shadow-xl transition-all ${notif.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>{notif.message}</div>)}

      {/* TOP NAVIGATION */}
      <div className="no-print bg-white px-4 sm:px-6 py-3 shadow-sm flex justify-between items-center sticky top-0 z-40 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#004aad] rounded-full flex items-center justify-center shadow-sm overflow-hidden p-1 shrink-0">
            <img src="/logo-tutahtitah-biru.webp" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight truncate max-w-[150px] sm:max-w-xs">{user.name}</h1>
            <p className="text-[10px] sm:text-xs text-[#004aad] font-bold uppercase tracking-wider">{user.role === 'admin' ? 'Pusat Komando' : 'Mitra Kurir'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-red-500 bg-red-50 hover:bg-red-500 hover:text-white font-bold px-4 py-2 rounded-xl text-xs transition border border-red-100 shrink-0">Logout</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        
        {/* ===================================== */}
        {/* ADMIN VIEW */}
        {/* ===================================== */}
        {user.role === "admin" && (
          <div className="max-w-7xl mx-auto">
            <div className="no-print flex bg-white border-b border-gray-200 px-4 pt-2 gap-2 overflow-x-auto hide-scrollbar">
                <button onClick={() => setAdminMainTab('operasional')} className={`px-4 py-3 font-bold text-sm border-b-2 transition whitespace-nowrap ${adminMainTab === 'operasional' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>🛠️ Operasional (Live)</button>
                <button onClick={() => setAdminMainTab('riwayat')} className={`px-4 py-3 font-bold text-sm border-b-2 transition whitespace-nowrap ${adminMainTab === 'riwayat' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>📜 Riwayat Order</button>
                <button onClick={() => setAdminMainTab('laporan')} className={`px-4 py-3 font-bold text-sm border-b-2 transition whitespace-nowrap ${adminMainTab === 'laporan' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>📊 Laporan & Analitik</button>
                <button onClick={() => setAdminMainTab('tim')} className={`px-4 py-3 font-bold text-sm border-b-2 transition whitespace-nowrap ${adminMainTab === 'tim' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>👥 Manajemen Tim</button>
                <button onClick={() => setAdminMainTab('portal')} className={`px-4 py-3 font-bold text-sm border-b-2 transition whitespace-nowrap ${adminMainTab === 'portal' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>🌐 Manajemen Publik</button>
            </div>

            <div className="p-4 sm:p-6">
                
                {/* TAB HRD / MANAJEMEN TIM KHUSUS ADMIN */}
                {adminMainTab === 'tim' && (
                    <div className="space-y-6">
                        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 mb-1">Manajemen Karyawan (HRD)</h2>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Hanya Admin yang dapat menambahkan anggota baru. Akses publik ditutup.</p>
                            </div>
                            <button onClick={() => { setHrForm({ id: null, role: 'courier', full_name: '', email: '', phone: '', pin: '', bank_name: '', account_number: '', bank_name_2: '', account_number_2: '' }); setIsHrModalOpen(true); }} className="w-full md:w-auto bg-[#004aad] hover:bg-[#003b8a] text-white px-6 py-3 rounded-xl font-bold shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm">
                                ➕ Daftarkan Anggota
                            </button>
                        </div>

                        {/* BLOK PENCARIAN KARYAWAN */}
                        <div className="relative w-full">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                            <input 
                                type="text" 
                                placeholder="Cari Nama Anggota / Karyawan..." 
                                className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl pl-11 pr-4 py-3.5 font-medium outline-none focus:border-[#004aad] shadow-sm" 
                                value={hrSearch} 
                                onChange={(e) => setHrSearch(e.target.value)} 
                            />
                        </div>
                        
                        {/* LOGIKA GROUPING & SORTING KARYAWAN */}
                        {(() => {
                            const searched = allEmployees.filter(emp => (emp.full_name || '').toLowerCase().includes(hrSearch.toLowerCase()));
                            
                            // 1. KELOMPOK AKTIF (Admin di atas, lalu sesuai abjad)
                            const activeList = searched.filter(emp => !(emp.pin && emp.pin.startsWith('BANNED_'))).sort((a, b) => {
                                if (a.role === 'admin' && b.role !== 'admin') return -1;
                                if (a.role !== 'admin' && b.role === 'admin') return 1;
                                return (a.full_name || '').localeCompare(b.full_name || '');
                            });
                            
                            // 2. KELOMPOK NONAKTIF (Sesuai abjad)
                            const inactiveList = searched.filter(emp => emp.pin && emp.pin.startsWith('BANNED_')).sort((a, b) => {
                                return (a.full_name || '').localeCompare(b.full_name || '');
                            });

                            // Komponen UI Kartu (Biar kodingan nggak diulang-ulang)
                            const EmployeeCard = ({ emp }) => (
                                <div key={emp.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-5 relative overflow-hidden flex flex-col h-full">
                                    <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-2 sm:mb-3 border-b border-gray-100 pb-2 gap-1.5">
                                        <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2.5 py-1 rounded uppercase tracking-wider w-max ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                            {emp.role === 'admin' ? '👑 Admin' : '🛵 Kurir'}
                                        </span>
                                        {emp.pin && emp.pin.startsWith('BANNED_') ? (
                                            <span className="text-[8px] sm:text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-1 rounded w-max">NONAKTIF</span>
                                        ) : emp.auth_id ? (
                                            <span className="text-[8px] sm:text-[9px] font-bold text-green-700 bg-green-50 px-1.5 sm:px-2 py-1 rounded border border-green-100 w-max">Verified</span> 
                                        ) : (
                                            <span className="text-[8px] sm:text-[9px] font-bold text-red-700 bg-red-50 px-1.5 sm:px-2 py-1 rounded border border-red-100 w-max">No Auth</span>
                                        )}
                                    </div>
                                    
                                    <div className="mb-3 flex-grow">
                                        <h3 className="font-black text-gray-900 text-sm sm:text-lg leading-tight line-clamp-2">{emp.full_name}</h3>
                                        <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold mb-2 mt-0.5">🗓️ Join: {emp.created_at ? new Date(emp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                                        
                                        <div className="flex flex-col gap-0.5 mt-2">
                                            <p className="text-[9px] sm:text-xs text-gray-600 font-medium flex items-center gap-1.5"><span className="text-gray-400">📱</span> <span className="truncate">{emp.phone || '-'}</span></p>
                                            <p className="text-[9px] sm:text-xs text-gray-600 font-medium flex items-center gap-1.5"><span className="text-gray-400">📧</span> <span className="truncate">{emp.email || '-'}</span></p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-100 mb-3">
                                        <p className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase mb-1 border-b border-gray-200 pb-1">Rekening</p>
                                        <p className="text-[8px] sm:text-[10px] font-mono text-gray-700 truncate"><span className="font-bold text-gray-500">B1:</span> {emp.bank_name ? `${emp.bank_name}-${emp.account_number}` : '-'}</p>
                                        <p className="text-[8px] sm:text-[10px] font-mono text-gray-700 truncate mt-0.5"><span className="font-bold text-gray-500">B2:</span> {emp.bank_name_2 ? `${emp.bank_name_2}-${emp.account_number_2}` : '-'}</p>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-auto pt-2 border-t border-gray-100">
                                        <button onClick={() => openEditEmployee(emp)} className="flex-1 bg-blue-50 text-[#004aad] hover:bg-blue-100 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border border-blue-100">
                                            ✏️ Edit
                                        </button>
                                        {emp.pin && emp.pin.startsWith('BANNED_') ? (
                                            <button onClick={() => handleRestoreEmployee(emp.id, emp.full_name)} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border border-emerald-100">
                                                ✅ Aktifkan
                                            </button>
                                        ) : (
                                            <button onClick={() => handleDeleteEmployee(emp.id, emp.full_name)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border border-red-100">
                                                🚫 Nonaktif
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );

                            return (
                                <div className="space-y-6">
                                    {searched.length === 0 && (
                                        <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                                            <span className="text-4xl block mb-2 opacity-50">🔍</span>
                                            <p className="font-bold text-gray-500">Tidak ada anggota yang cocok dengan pencarian.</p>
                                        </div>
                                    )}

                                    {/* SECTION ANGGOTA AKTIF */}
                                    {activeList.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3 px-1">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <h3 className="font-bold text-gray-800 text-sm">Anggota Aktif ({activeList.length})</h3>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                                                {activeList.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION ANGGOTA NONAKTIF (BANNED) */}
                                    {inactiveList.length > 0 && (
                                        <div className="pt-4 border-t border-gray-200 border-dashed">
                                            <div className="flex items-center gap-2 mb-3 px-1">
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                <h3 className="font-bold text-gray-800 text-sm">Anggota Dinonaktifkan ({inactiveList.length})</h3>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 opacity-75">
                                                {inactiveList.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* ====================================================== */}
                {/* TAB PORTAL PUBLIK (UMKM & TESTIMONI) KHUSUS ADMIN */}
                {/* ====================================================== */}
                {adminMainTab === 'portal' && (
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
                                🏪 Verifikasi UMKM ({portalUmkmData.filter(x => x.status && x.status.toLowerCase() === 'pending').length})
                            </button>

                            {/* 3. BARU: TOKO DI-SUSPEND */}
                            <button onClick={() => setPortalTab('suspended')} className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-[11px] sm:text-sm transition ${portalTab === 'suspended' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                🚫 Toko Di-Suspend ({portalUmkmData.filter(x => x.status && x.status.toLowerCase() === 'suspended').length})
                            </button>
                            
                            {/* 4. Testimoni */}
                            <button onClick={() => setPortalTab('testimoni')} className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-[11px] sm:text-sm transition ${portalTab === 'testimoni' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                💬 Verifikasi Testimoni ({portalTestimoniData.length})
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
                                            .filter(item => item.status === 'verified' || item.status === 'published')
                                            .filter(item => (item.nama_toko || '').toLowerCase().includes(searchVerifiedToko.toLowerCase()))
                                            .length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 font-medium text-xs sm:text-sm">
                                            {searchVerifiedToko ? `Toko dengan kata kunci "${searchVerifiedToko}" tidak ditemukan.` : 'Belum ada toko yang terverifikasi bro.'}
                                        </div>
                                            ) : (
                                            portalUmkmData
                                                .filter(item => item.status === 'verified' || item.status === 'published')
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
                                                                <p className="text-xs text-[#004aad] font-semibold">Rp {Number(prod.harga).toLocaleString('id-ID')}</p>
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

                                    {portalUmkmData.filter(umkm => umkm.status && umkm.status.toLowerCase() === 'suspended').length === 0 ? (
                                        <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                            <span className="text-4xl block mb-2">🎉</span>
                                            <h3 className="text-lg font-bold text-gray-700">Tidak ada toko yang di-suspend</h3>
                                            <p className="text-gray-500 text-sm mt-1">Semua mitra UMKM berjalan normal dan tertib.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {portalUmkmData
                                                .filter(umkm => umkm.status && umkm.status.toLowerCase() === 'suspended')
                                                .map((umkm) => (
                                                <div key={umkm.id} className="p-5 border border-red-200 rounded-xl shadow-sm bg-red-50/20 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-start gap-4 mb-3">
                                                            <img src={umkm.logoUrl || 'https://placehold.co/100'} className="w-14 h-14 rounded-xl object-cover border shadow-sm shrink-0" alt="Logo Toko" />
                                                            <div>
                                                                <h4 className="text-lg font-bold text-gray-900">{umkm.nama_toko}</h4>
                                                                <p className="text-xs text-gray-500">{umkm.nama_pemilik} • {umkm.alamat || 'Alamat -'}</p>
                                                                <span className="inline-block mt-1 px-2.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase">
                                                                    🚫 Status: Di-Suspend
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Alasan Suspend */}
                                                        <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-3 text-xs shadow-inner">
                                                            <p className="font-bold text-red-900 mb-0.5">⚠️ Alasan Suspend dari Admin:</p>
                                                            <p className="text-red-800 italic">"{umkm.alasan_suspend || 'Tidak dicantumkan'}"</p>
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
                                                                        <p className="font-black text-gray-800 mb-2 flex items-center gap-1">🔄 Hasil Revisi Data:</p>
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
                                                                                        if(oldProd.foto_url !== newProd.foto_url) changes.push({ type: 'image', label: `Foto Produk: ${newProd.nama_produk}`, old: oldProd.foto_url, new: newProd.foto_url });
                                                                                        if(oldProd.nama_produk !== newProd.nama_produk) changes.push({ type: 'text', label: `Nama Produk`, old: oldProd.nama_produk, new: newProd.nama_produk });
                                                                                        if(oldProd.deskripsi !== newProd.deskripsi) changes.push({ type: 'text', label: `Deskripsi: ${newProd.nama_produk}`, old: oldProd.deskripsi, new: newProd.deskripsi });
                                                                                    }
                                                                                });

                                                                                if (changes.length === 0) return <p className="text-[10px] text-gray-500 bg-white p-2 rounded border border-gray-100 italic">Tidak ada perubahan data yang terdeteksi.</p>;

                                                                                return changes.map((c, i) => (
                                                                                    <div key={i} className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-[10px]">
                                                                                        <span className="font-bold text-gray-700 block mb-1.5">{c.label}</span>
                                                                                        {c.type === 'text' ? (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-red-500 line-through truncate w-1/2 p-1.5 bg-red-50 rounded border border-red-100">{c.old || '-'}</span>
                                                                                                <span>➔</span>
                                                                                                <span className="text-green-700 font-bold truncate w-1/2 p-1.5 bg-green-50 rounded border border-green-200 shadow-sm">{c.new || '-'}</span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="relative">
                                                                                                    <span className="absolute -top-2 -left-2 bg-red-100 text-red-600 text-[8px] font-bold px-1 rounded shadow-sm">LAMA</span>
                                                                                                    <img src={c.old || 'https://placehold.co/50'} className="w-12 h-12 object-cover rounded-lg border-2 border-red-200 opacity-60" />
                                                                                                </div>
                                                                                                <span className="text-lg">➔</span>
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
                                    {portalUmkmData.filter(umkm => umkm.status && umkm.status.toLowerCase() === 'pending').length === 0 ? (
                                    
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
                                        .filter(umkm => umkm.status && umkm.status.toLowerCase() === 'pending')
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
                                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
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
                    </div>
                )}

                {/* TAB OPERASIONAL ADMIN */}
                {adminMainTab === 'operasional' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
                                <h3 className="font-bold text-gray-800 text-sm mb-2">📋 Copy Format Order (Kirim ke WA)</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => copyFormat('ojek')} className="flex-1 bg-yellow-50 text-yellow-700 font-bold text-[10px] sm:text-xs py-2 rounded-lg border border-yellow-200 hover:bg-yellow-100">🛵 Ojek</button>
                                    <button onClick={() => copyFormat('kirim')} className="flex-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] sm:text-xs py-2 rounded-lg border border-emerald-200 hover:bg-emerald-100">📦 Kurir</button>
                                    <button onClick={() => copyFormat('jastip')} className="flex-1 bg-blue-50 text-[#004aad] font-bold text-[10px] sm:text-xs py-2 rounded-lg border border-blue-200 hover:bg-blue-100">🛒 Jastip</button>
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm mb-1">Pusat Input Manual</h3>
                                    <p className="text-[10px] text-gray-500">Mendukung Database Pelanggan & Lampiran Foto</p>
                                </div>
                                <button onClick={() => setIsManualModalOpen(true)} className="bg-[#004aad] hover:bg-[#003b8a] text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition text-xs">+ Input Order Manual</button>
                            </div>
                        </div>

                        <div className="flex gap-2 p-1 bg-gray-200 rounded-xl w-full sm:w-max">
                            <button onClick={() => setAdminOperasionalTab('pending')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition ${adminOperasionalTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                📥 Order Masuk ({adminPendingOrders.length})
                            </button>
                            <button onClick={() => setAdminOperasionalTab('processing')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition ${adminOperasionalTab === 'processing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                🚀 Sedang Jalan ({adminProcessingOrders.length})
                            </button>
                        </div>

                        {/* SUB-TAB MASUK (PENDING) */}
                        {adminOperasionalTab === 'pending' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {adminPendingOrders.map(o => (
                                    <div key={o.id} className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col h-full shadow-sm hover:shadow-md transition relative">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#004aad] opacity-5 rounded-bl-full pointer-events-none"></div>
                                        <div className="flex justify-between items-start mb-3">
                                            <ServiceBadge type={o.tipe_layanan} />
                                            <span className="text-[10px] font-bold text-gray-400">{formatDateTime(o.created_at)}</span>
                                        </div>
                                        <p className="font-black text-gray-900 text-lg mb-1">{o.customer_name || o.customer_wa.split('-')[0]}</p>
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-[10px] font-bold text-gray-500">{o.customer_wa}</p>
                                            <a href={getWaLink(o.customer_wa)} target="_blank" rel="noreferrer" className="bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white px-2 py-1 rounded text-[10px] font-bold transition shadow-sm border border-[#25D366]/30 flex items-center gap-1">
                                                💬 Hubungi
                                            </a>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mb-3 font-medium flex items-start gap-1">📍 <span>{o.customer_address}</span></p>
                                        
                                        {o.image_url && (
                                            <button onClick={() => setLightboxImg(o.image_url)} className="mb-3 w-full bg-blue-50 text-[#004aad] text-[10px] font-bold py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1">
                                                📸 Lihat Lampiran Foto
                                            </button>
                                        )}
                                        
                                        <div className="bg-gray-50 p-3 rounded-xl text-xs font-mono text-gray-700 border border-gray-100 mb-4 flex-grow whitespace-pre-wrap">{o.raw_order_text}</div>
                                        
                                        <div className="mt-auto space-y-2 pt-3 border-t border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Input Ongkir & Tugaskan</p>
                                            <input type="number" placeholder="Nominal Ongkos Jasa (Rp)" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-[#004aad]" value={dispatchInputs[`${o.id}_fee`] || ""} onChange={(e) => setDispatchInputs({ ...dispatchInputs, [`${o.id}_fee`]: e.target.value })} />
                                            <CustomCourierSelect 
                                                value={dispatchInputs[`${o.id}_courier`] || ""} 
                                                onChange={(val) => setDispatchInputs({ ...dispatchInputs, [`${o.id}_courier`]: val })} 
                                                placeholder="-- Pilih Kurir yang Jalan --" 
                                            />
                                            
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => cancelPendingOrder(o.id)} className="flex-[0.8] bg-[#FF0000] hover:bg-red-500 text-white font-bold py-3 rounded-lg text-xs border border-red-200 hover:bg-red-50 transition shadow-sm">Batal</button>
                                                <button onClick={() => handleDispatch(o.id)} className="flex-[1.2] bg-[#004aad] hover:bg-[#003b8a] text-white py-3 rounded-lg text-sm font-bold shadow-md transition">Lanjut Proses 🚀</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {adminPendingOrders.length === 0 && <div className="col-span-full p-10 text-center bg-white rounded-2xl border border-gray-200 shadow-sm"><span className="text-4xl block mb-2 opacity-50">☕</span><span className="font-bold text-gray-500">Belum ada orderan baru.</span></div>}
                            </div>
                        )}

                        {/* SUB-TAB SEDANG JALAN (PROCESSING / HOLD / WAITING / DELIVERING) */}
                        {adminOperasionalTab === 'processing' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {adminProcessingOrders.map(o => {
                                    const isHold = o.status === 'hold';
                                    const isWaiting = o.status === 'waiting_customer';
                                    const isDelivering = o.status === 'delivering';
                                    
                                    return (
                                    <div key={o.id} className={`p-5 rounded-2xl border shadow-sm flex flex-col h-full relative overflow-hidden ${isHold ? 'bg-orange-50 border-orange-300' : isWaiting ? 'bg-red-50 border-red-300' : isDelivering ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${isHold ? 'bg-orange-400' : isWaiting ? 'bg-red-500 animate-pulse' : isDelivering ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                                        <div className="flex justify-between items-start mb-2 pl-2">
                                            <ServiceBadge type={o.tipe_layanan} />
                                            <span className="text-[10px] font-bold text-gray-400">{formatDateTime(o.created_at)}</span>
                                        </div>
                                        <div className="pl-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-black text-gray-900 text-sm truncate">{o.customer_name || o.customer_wa.split('-')[0]}</p>
                                                <a href={getWaLink(o.customer_wa)} target="_blank" rel="noreferrer" className="bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white px-2 py-1 rounded text-[10px] font-bold transition shadow-sm border border-[#25D366]/30 flex items-center gap-1 shrink-0">
                                                    💬 WA
                                                </a>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-500 mb-1">{o.customer_wa}</p>
                                            <p className="text-[10px] text-gray-500 mb-2 font-medium flex items-start gap-1">📍 <span>{o.customer_address}</span></p>
                                            
                                            {o.image_url && (
                                                <button onClick={() => setLightboxImg(o.image_url)} className="mb-2 w-max px-2 py-1 bg-blue-50 text-[#004aad] text-[9px] font-bold rounded border border-blue-200 flex items-center gap-1">
                                                    📸 Lihat Foto
                                                </button>
                                            )}

                                            {isDelivering && o.tipe_layanan === 'Belanja' && o.bill_details ? (
                                                <div className="bg-white p-3 rounded-lg text-[10px] font-mono border border-blue-100 my-2 flex-grow whitespace-pre-wrap text-blue-900 shadow-inner">
                                                    <p className="font-black uppercase border-b border-blue-200 pb-1 mb-1 text-center">🧾 Struk Belanjaan & Tagihan</p>
                                                    {o.bill_details}
                                                </div>
                                            ) : (
                                                <div className="bg-white p-2.5 rounded-lg text-[10px] font-mono text-gray-600 border border-gray-100 my-2 flex-grow line-clamp-3 whitespace-pre-wrap">{o.raw_order_text}</div>
                                            )}
                                        </div>
                                        
                                        {/* Hold Biasa (Kendala ringan -> Negosiasi) */}
                                        {isHold && (
                                            <div className="pl-2 mt-2">
                                                <div className="bg-orange-100 p-2.5 rounded-lg border border-orange-200">
                                                    <p className="text-[10px] font-black text-orange-800 uppercase mb-1">💬 Kurir Lapor Kendala:</p>
                                                    <p className="text-xs text-orange-900 font-bold whitespace-pre-wrap">{o.kendala_info}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Kurir Nyerah -> Admin Take Action */}
                                        {isWaiting && (
                                            <div className="pl-2 mt-2 flex flex-col h-full">
                                                <div className="bg-red-100 p-3 rounded-lg border border-red-200 mb-3 shadow-inner">
                                                    <p className="text-[10px] font-black text-red-800 uppercase mb-1 flex items-center gap-1">
                                                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                                                        KURIR MENYERAH / BATAL
                                                    </p>
                                                    <p className="text-xs text-red-900 font-medium">Hubungi Customer. Kurir sebelumnya menyerah karena kendala.</p>
                                                </div>

                                                <div className="space-y-2 pt-2 border-t border-red-200 mt-auto">
                                                    <p className="text-[10px] font-bold text-gray-600 uppercase">Pilih Kurir Pengganti & Lanjut</p>
                                                    <CustomCourierSelect 
                                                        value={dispatchInputs[`${o.id}_courier_ganti`] || ""} 
                                                        onChange={(val) => setDispatchInputs({ ...dispatchInputs, [`${o.id}_courier_ganti`]: val })} 
                                                        placeholder="-- Pilih Kurir Baru --" 
                                                        bgClass="bg-white"
                                                    />
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const {error} = await supabase.from("orders").update({ status: "cancelled", kendala_info: "Dibatalkan Customer (Kendala Kurir)" }).eq("id", o.id);
                                                                    if(error) throw error; showNotif("Order dibatalkan.", "success");
                                                                } catch(err){ showNotif(`Gagal Batal: ${err.message}`, "error"); }
                                                            }}
                                                            className="flex-1 bg-white text-red-600 font-bold py-2.5 rounded-lg text-xs border border-red-200 hover:bg-red-50 transition"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const newCourier = dispatchInputs[`${o.id}_courier_ganti`];
                                                                if(!newCourier) return showNotif("Pilih kurir pengganti dulu!", "error");
                                                                try {
                                                                    const {error} = await supabase.from("orders").update({ 
                                                                        status: "processing", 
                                                                        assigned_courier_id: newCourier, 
                                                                        kendala_info: null,
                                                                        dispatched_at: new Date().toISOString()
                                                                    }).eq("id", o.id);
                                                                    if(error) throw error;
                                                                    showNotif("Berhasil ganti kurir & lanjut proses!", "success");
                                                                    setDispatchInputs({...dispatchInputs, [`${o.id}_courier_ganti`]: ""});
                                                                } catch(err){ showNotif(`Gagal Ganti Kurir: ${err.message}`, "error"); }
                                                            }}
                                                            className="flex-[1.5] bg-[#004aad] text-white font-bold py-2.5 rounded-lg text-xs shadow-md hover:bg-[#003b8a] transition"
                                                        >
                                                            Ganti & Lanjut 🚀
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Biasa */}
                                        {(!isWaiting) && (
                                            <div className="flex flex-col mt-auto pt-3 pl-2">
                                                {/* HAPUS SYARAT 'Belanja' BIAR MUNCUL DI SEMUA LAYANAN */}
                                                {isDelivering && (
                                                    <div className="mb-3 pt-3 border-t border-blue-200/50">
                                                        {/* INFORMASI STATUS STRUK TAGIHAN DI TAMPILAN ADMIN */}
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Status Struk Tagihan:</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${o.bill_sent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                {o.bill_sent ? 'Sudah Dikirim ke Customer ✅' : 'Belum Dikirim ke Customer ❌'}
                                                            </span>
                                                        </div>

                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Total Tagihan (Inc. Ongkir):</span>
                                                            <span className="text-sm font-black text-blue-700">Rp {(parseFloat(o.total_price || 0) + parseFloat(o.delivery_fee || 0)).toLocaleString('id-ID')}</span>
                                                        </div>
                                                        <button onClick={() => handleKirimTagihanKeCustomer(o)} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-2.5 rounded-lg text-[11px] font-bold shadow-md transition flex items-center justify-center gap-1.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M187.58,144.84l-32-16a8,8,0,0,0-8,.5l-14.69,9.8a40.55,40.55,0,0,1-38.6-38.6l9.8-14.69a8,8,0,0,0,.5-8l-16-32A8,8,0,0,0,80,40a24,24,0,0,0-24,24c0,76.22,63.78,140,140,140a24,24,0,0,0,24-24A8,8,0,0,0,211.58,172.58Z" opacity="0.2"></path><path d="M232,112.44v37.66a8,8,0,0,1-16,0V112.44A88,88,0,0,0,128.44,24a8,8,0,0,1,0-16A104,104,0,0,1,232,112.44Zm-47.53,8.08a8,8,0,0,0-11.31-11.31A39.9,39.9,0,0,0,144.88,80.89a8,8,0,0,0,0,16A23.94,23.94,0,0,1,184.47,120.52ZM128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm65.76-60.45a24,24,0,0,1-23.7,28.45c-66,0-120-54-120-120a24,24,0,0,1,28.45-23.71,16,16,0,0,1,13.12,11.62l16,32a16,16,0,0,1-1,16L91.9,114.61a56.55,56.55,0,0,0,49.49,49.49l14.69-14.73a16,16,0,0,1,16-1l32,16A16,16,0,0,1,216,177.58l-22.24,38.53Z"></path></svg>
                                                            {o.bill_sent ? 'Kirim Ulang Struk ke Customer' : 'Kirim Tagihan ke Customer'}
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                        Mitra: {couriersList.find(c => c.id === o.assigned_courier_id)?.full_name}
                                                        {isDelivering && <span className="ml-1 text-blue-500">(Menuju Lokasi)</span>}
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        <button onClick={async () => {
                                                            try {
                                                                const {error} = await supabase.from("orders").update({ status: "cancelled", kendala_info: "Dibatalkan Admin" }).eq("id", o.id);
                                                                if(error) throw error; showNotif("Order dibatalkan.", "success");
                                                            } catch(err){ showNotif(`Gagal Batal`, "error"); }
                                                        }} className="font-bold text-[10px] px-2 py-1.5 rounded-lg border shadow-sm transition whitespace-nowrap bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                                                            ❌ Batal
                                                        </button>
                                                        <button onClick={() => { setEditingOrder({ id: o.id, text: o.raw_order_text, status: o.status, kendala_info: o.kendala_info }); setIsEditModalOpen(true); }} className="font-bold text-[10px] px-3 py-1.5 rounded-lg border shadow-sm transition whitespace-nowrap bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100">
                                                            📝 Edit
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                                {adminProcessingOrders.length === 0 && <div className="col-span-full p-10 text-center bg-white rounded-2xl border border-gray-200 shadow-sm font-bold text-gray-500">Tidak ada order yang sedang di jalan.</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB RIWAYAT ADMIN */}
                {adminMainTab === 'riwayat' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap gap-3 items-center">
                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm rounded-xl px-3 py-2 font-bold outline-none flex-grow" value={adminFilterPeriod} onChange={(e) => setAdminFilterPeriod(e.target.value)}>
                                <option value="today">Hari Ini</option><option value="week">7 Hari Terakhir</option><option value="month">Bulan Ini</option><option value="year">Tahun Ini</option><option value="all">Semua Waktu</option><option value="custom">Pilih Rentang Tanggal</option>
                            </select>
                            {/* BLOK KALENDER (MUNCUL KALAU MILIH CUSTOM) */}
                            {adminFilterPeriod === 'custom' && (
                                <div className="flex items-center gap-2 flex-grow">
                                    <input type="date" className="bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm rounded-xl px-3 py-2 font-bold outline-none w-full" value={adminFilterStartDate} onChange={e => setAdminFilterStartDate(e.target.value)} />
                                    <span className="text-gray-400 font-bold">-</span>
                                    <input type="date" className="bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm rounded-xl px-3 py-2 font-bold outline-none w-full" value={adminFilterEndDate} onChange={e => setAdminFilterEndDate(e.target.value)} />
                                </div>
                            )}
                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm rounded-xl px-3 py-2 font-bold outline-none flex-grow" value={adminFilterService} onChange={(e) => setAdminFilterService(e.target.value)}>
                                <option value="all">Semua Layanan</option><option value="Belanja">Belanja</option><option value="Antar Jemput">Antar Jemput</option><option value="Kirim Barang">Kirim Barang</option>
                            </select>
                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm rounded-xl px-3 py-2 font-bold outline-none flex-grow" value={adminFilterStatus} onChange={(e) => setAdminFilterStatus(e.target.value)}>
                                <option value="all">Semua Status</option><option value="completed">Sukses</option><option value="cancelled">Batal</option><option value="failed">Gagal / Nyerah</option>
                            </select>
                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm rounded-xl px-3 py-2 font-bold outline-none flex-grow" value={adminFilterCourier} onChange={(e) => setAdminFilterCourier(e.target.value)}>
                                <option value="all">Semua Kurir</option>
                                {couriersList.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                            <div className="relative w-full sm:w-auto flex-grow">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                                <input type="text" placeholder="Cari Nama Customer..." className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl pl-9 pr-4 py-2 font-medium outline-none w-full focus:border-[#004aad]" value={adminHistorySearch} onChange={(e) => setAdminHistorySearch(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {adminAnalytics.periodOrders
                                .filter(o => o.status === 'completed' || o.status === 'cancelled')
                                .filter(o => adminFilterService === 'all' ? true : o.tipe_layanan === adminFilterService)
                                .filter(o => {
                                    if (adminFilterStatus === 'all') return true;
                                    if (adminFilterStatus === 'completed') return o.status === 'completed';
                                    if (adminFilterStatus === 'cancelled') return o.status === 'cancelled' && (!o.failed_couriers || o.failed_couriers.length === 0);
                                    if (adminFilterStatus === 'failed') return o.failed_couriers && o.failed_couriers.length > 0;
                                    return true;
                                })
                                .filter(o => adminFilterCourier === 'all' ? true : o.assigned_courier_id === adminFilterCourier)
                                .filter(o => (o.customer_name || o.customer_wa || '').toLowerCase().includes(adminHistorySearch.toLowerCase()))
                                .map(o => {
                                    const isFailed = o.failed_couriers && o.failed_couriers.length > 0;
                                    const statusLabel = o.status === 'completed' ? 'Sukses' : (isFailed ? 'Gagal' : 'Batal');
                                    const statusColor = o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : (isFailed ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700');
                                    
                                    return (
                                <div key={o.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:border-blue-200 transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${statusColor}`}>{statusLabel}</span>
                                        <span className="text-[9px] font-bold text-gray-400">{formatDateTime(o.created_at)}</span>
                                    </div>
                                    <div className="mb-2"><ServiceBadge type={o.tipe_layanan} /></div>
                                    <p className="font-bold text-gray-800 text-sm mb-1">{o.customer_name || o.customer_wa.split('-')[0]}</p>
                                    <p className="text-[10px] font-bold text-gray-500 mb-1">{o.customer_wa}</p>
                                    <p className="text-[10px] text-gray-500 mb-3 flex items-start gap-1">📍 <span>{o.customer_address}</span></p>

                                    {o.image_url && (
                                        <button onClick={() => setLightboxImg(o.image_url)} className="mb-2 w-max px-2 py-1 bg-blue-50 text-[#004aad] text-[9px] font-bold rounded border border-blue-200 flex items-center gap-1">
                                            📸 Foto Tersimpan
                                        </button>
                                    )}

                                    {o.tipe_layanan === 'Belanja' && o.bill_details ? (
                                        <div className="bg-blue-50 p-2.5 rounded-lg text-[10px] font-mono border border-blue-100 mb-3 whitespace-pre-wrap text-blue-800 flex-grow">
                                            <strong className="text-blue-900 block mb-1">Rincian Belanja:</strong>{o.bill_details}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-2.5 rounded-lg text-[10px] font-mono border border-gray-100 mb-3 flex-grow line-clamp-3 whitespace-pre-wrap">{o.raw_order_text}</div>
                                    )}
                                    
                                    {o.status === 'cancelled' && (
                                        <div className="bg-red-50 p-2 rounded text-[9px] text-red-700 border border-red-100 mb-2 italic line-clamp-2">
                                            <strong>Alasan Batal:</strong> {o.kendala_info || '-'}
                                        </div>
                                    )}
                                    {isFailed && (
                                        <div className="bg-orange-50 p-2 rounded text-[9px] text-orange-700 border border-orange-100 mb-2">
                                            <strong>Riwayat Gagal (Nyerah):</strong>
                                            {o.failed_couriers.map((fc, i) => (
                                                <div key={i} className="mt-0.5">- {fc.name}: {fc.reason}</div>
                                            ))}
                                        </div>
                                    )}

                                    {o.status === 'completed' && (
                                        <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-gray-100">
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                <span className="text-gray-500">⏱️ Durasi Pengerjaan:</span>
                                                <span className="text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{calculateDuration(o.dispatched_at, o.completed_at)}</span>
                                            </div>
                                            {o.tipe_layanan === 'Belanja' && (
                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                    <span className="text-gray-500">Total Belanja (Talangan):</span>
                                                    <span className="text-red-500 text-sm">Rp {parseInt(o.total_price||0).toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                <span className="text-gray-500">Ongkir/Jasa:</span>
                                                <span className="text-emerald-600 text-sm">Rp {parseInt(o.delivery_fee||0).toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-[9px] text-gray-400 mt-3 font-bold text-right uppercase">Mitra Terakhir: {couriersList.find(c => c.id === o.assigned_courier_id)?.full_name || 'Tidak ada'}</div>
                                </div>
                            )})}
                        </div>
                    </div>
                )}

                {/* TAB ANALITIK ADMIN */}
                {adminMainTab === 'laporan' && (
                    <div id="analytics-export-area" className="space-y-6 bg-gray-50 min-h-screen">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                            <h2 className="text-xl font-black text-gray-800 print-break">Dashboard Analitik Eksekutif</h2>
                            <button onClick={() => window.print()} className="no-print bg-gray-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-gray-900 transition flex items-center gap-2">
                                🖨️ Export PDF (Print)
                            </button>
                        </div>

                        {/* CONTROLS */}
                        <div className="no-print bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-2 font-bold outline-none flex-grow md:flex-none" value={adminFilterPeriod} onChange={(e) => setAdminFilterPeriod(e.target.value)}>
                                <option value="today">Hari Ini</option>
                                <option value="week">7 Hari Terakhir</option>
                                <option value="month">Bulan Ini</option>
                                <option value="year">Tahun Ini</option>
                                <option value="all">Semua Waktu</option>
                                <option value="custom">Custom (Pilih Rentang Tanggal)</option>
                            </select>
                            
                            {adminFilterPeriod === 'custom' && (
                                <div className="flex items-center gap-2 flex-grow md:flex-none">
                                    <input type="date" className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 font-bold outline-none" value={adminFilterStartDate} onChange={e => setAdminFilterStartDate(e.target.value)} />
                                    <span className="text-gray-400 font-bold">-</span>
                                    <input type="date" className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 font-bold outline-none" value={adminFilterEndDate} onChange={e => setAdminFilterEndDate(e.target.value)} />
                                </div>
                            )}

                            <div className="flex items-center gap-2 ml-auto w-full md:w-auto">
                                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 flex-1 md:flex-none">
                                    <label className="text-[10px] font-bold text-[#004aad] uppercase leading-tight">Hak<br/>Admin:</label>
                                    <div className="flex items-center relative">
                                        <input type="number" className="w-12 bg-white border border-blue-200 text-[#004aad] text-sm rounded-md font-black py-1 text-center outline-none" value={adminProfitShare} onChange={(e) => updateGlobalSettings('admin', e.target.value)} />
                                        <span className="absolute right-1 text-[10px] font-bold text-[#004aad] pointer-events-none">%</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 flex-1 md:flex-none">
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase leading-tight">Uang<br/>Kas:</label>
                                    <div className="flex items-center relative">
                                        <input type="number" className="w-12 bg-white border border-emerald-200 text-emerald-700 text-sm rounded-md font-black py-1 text-center outline-none" value={kasShare} onChange={(e) => updateGlobalSettings('kas', e.target.value)} />
                                        <span className="absolute right-1 text-[10px] font-bold text-emerald-700 pointer-events-none">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* KPI TOTAL ORDERS */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 print-break">
                            <div className="text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6 w-full md:w-auto">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Order Masuk</p>
                                <h3 className="text-4xl font-black text-[#004aad]">{adminAnalytics.totalOrdersPeriod} <span className="text-sm font-bold text-gray-400">Order</span></h3>
                            </div>
                            
                            <div className="flex-1 w-full grid grid-cols-3 gap-2 sm:gap-4">
                                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Sukses</p>
                                    <p className="text-2xl font-black text-emerald-700">{adminAnalytics.suksesOrders}</p>
                                    <p className="text-[10px] font-bold text-emerald-500">{adminAnalytics.persenSukses}%</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Batal</p>
                                    <p className="text-2xl font-black text-gray-700">{adminAnalytics.batalOrders}</p>
                                    <p className="text-[10px] font-bold text-gray-500">{adminAnalytics.persenBatal}%</p>
                                </div>
                                <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Gagal (Nyerah)</p>
                                    <p className="text-2xl font-black text-red-700">{adminAnalytics.gagalOrders}</p>
                                    <p className="text-[10px] font-bold text-red-500">{adminAnalytics.persenGagal}%</p>
                                </div>
                            </div>
                        </div>

                        {/* RATA RATA DURASI (SLA) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-break">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 text-center">
                                 <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rata-Rata Pengerjaan Global</p>
                                 <h3 className="text-xl font-black text-gray-900">{adminAnalytics.avgDurationAll}</h3>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl shadow-sm border border-blue-100 text-center">
                                 <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Rata-Rata Pengerjaan Belanja</p>
                                 <h3 className="text-xl font-black text-blue-800">{adminAnalytics.avgDurationBelanja}</h3>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-2xl shadow-sm border border-yellow-100 text-center">
                                 <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1">Rata-Rata Pengerjaan Antar Jemput</p>
                                 <h3 className="text-xl font-black text-yellow-800">{adminAnalytics.avgDurationOjek}</h3>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-2xl shadow-sm border border-emerald-100 text-center">
                                 <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Rata-Rata Pengerjaan Kirim Barang</p>
                                 <h3 className="text-xl font-black text-emerald-800">{adminAnalytics.avgDurationKirim}</h3>
                            </div>
                        </div>

                        {/* FINANCIALS */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print-break">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-gray-400 col-span-2 sm:col-span-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Omset Jasa</p>
                                <h3 className="text-xl font-black text-gray-900">Rp {adminAnalytics.totalOngkirPeriode.toLocaleString('id-ID')}</h3>
                                <p className="text-[9px] font-bold text-gray-500 mt-1">Dari {adminAnalytics.analitikSelesai.length} Order Sukses</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-emerald-400">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Hak Kurir (Netto)</p>
                                <h3 className="text-xl font-black text-emerald-700">Rp {adminAnalytics.totalHakKurirGlobal.toLocaleString('id-ID')}</h3>
                            </div>
                            <div className="bg-[#004aad] text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
                                <p className="text-[10px] font-bold text-blue-200 uppercase mb-1">Hak Admin ({adminProfitShare}%)</p>
                                <h3 className="text-xl font-black text-white">Rp {adminAnalytics.hakAdminPure.toLocaleString('id-ID')}</h3>
                            </div>
                            <div className="bg-[#10b981] text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
                                <p className="text-[10px] font-bold text-emerald-100 uppercase mb-1">Uang Kas ({kasShare}% + Denda)</p>
                                <h3 className="text-xl font-black text-[#ffde59]">Rp {adminAnalytics.totalKasTermasukDenda.toLocaleString('id-ID')}</h3>
                            </div>
                        </div>

                        {/* TREN ORDER WAKTU (LINE CHART) */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 print-break">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">📈 Tren Orderan per Waktu</h3>
                                <select className="no-print bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg px-2 py-1 font-bold outline-none" value={adminChartGrouping} onChange={(e) => setAdminChartGrouping(e.target.value)}>
                                    <option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option>
                                </select>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={adminAnalytics.trendDataTime} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                        <RechartsTooltip content={<SimpleTooltip label="Periode" />} />
                                        <Line type="monotone" name="Belanja" dataKey="Belanja" stroke="#004aad" strokeWidth={3} dot={{r:3}} activeDot={{r: 5}} />
                                        <Line type="monotone" name="Antar Jemput" dataKey="Antar Jemput" stroke="#ffde59" strokeWidth={3} dot={{r:3}} activeDot={{r: 5}} />
                                        <Line type="monotone" name="Kirim Barang" dataKey="Kirim Barang" stroke="#10b981" strokeWidth={3} dot={{r:3}} activeDot={{r: 5}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-4 text-[10px] font-bold">
                                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#004aad]"></div> Belanja</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#ffde59]"></div> Antar Jemput</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Kirim Barang</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-break">
                            {/* TREN ORDER JAM (LINE CHART) */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                <h3 className="text-xs font-bold text-gray-600 mb-6 uppercase tracking-wider text-center">⏰ Tren Jam Orderan (24 Jam)</h3>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={adminAnalytics.trendDataHour} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                                            <XAxis dataKey="name" tick={{fontSize: 9, fill: '#9ca3af', fontWeight: 'bold'}} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                                            <YAxis tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                            <RechartsTooltip content={<SimpleTooltip label="Jam Order" />} />
                                            <Line type="monotone" name="Belanja" dataKey="Belanja" stroke="#004aad" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                                            <Line type="monotone" name="Antar Jemput" dataKey="Antar Jemput" stroke="#ffde59" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                                            <Line type="monotone" name="Kirim Barang" dataKey="Kirim Barang" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-4 mt-4 text-[10px] font-bold">
                                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#004aad]"></div> Belanja</span>
                                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#ffde59]"></div> Ojek</span>
                                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Kirim</span>
                                </div>
                            </div>

                            {/* DISTRIBUSI LAYANAN (BAR CHART) */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                <h3 className="text-xs font-bold text-gray-600 mb-6 uppercase tracking-wider text-center">📦 Komposisi Layanan</h3>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={adminAnalytics.serviceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#4b5563', fontWeight: 'bold'}} width={80} />
                                            <RechartsTooltip content={<SimpleTooltip />} cursor={{fill: '#f3f4f6'}} />
                                            <Bar dataKey="value" name="Total Order" radius={[0, 8, 8, 0]}>
                                                {adminAnalytics.serviceData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* LEADERBOARD */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print-break">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">🏆 Leaderboard & Evaluasi Kurir</h3>
                                <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-1 border border-gray-200 rounded">Target {adminAnalytics.targetOrders > 0 ? `${adminAnalytics.targetOrders} Order / ${adminFilterPeriod}` : 'Off'}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                            <th className="p-4 sm:p-5 font-bold">Nama Mitra</th>
                                            <th className="p-4 sm:p-5 font-bold text-center">Order Sukses</th>
                                            <th className="p-4 sm:p-5 font-bold text-center">Batal / Cancel</th>
                                            <th className="p-4 sm:p-5 font-bold text-center text-orange-500">Gagal / Nyerah</th>
                                            <th className="p-4 sm:p-5 font-bold text-right">Pendapatan Kotor</th>
                                            <th className="p-4 sm:p-5 font-bold text-right text-red-500">Potongan Admin & Kas</th>
                                            {/* KOLOM DENDA HANYA MUNCUL JIKA BUKAN FILTER HARI INI */}
                                            {adminFilterPeriod !== 'today' && (
                                                <th className="p-4 sm:p-5 font-bold text-right text-red-500">Denda Target</th>
                                            )}
                                            <th className="p-4 sm:p-5 font-bold text-right text-emerald-600">Pendapatan Bersih</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-50">
                                        {adminAnalytics.courierPerformance.map((c, index) => (
                                            <tr key={c.id} className="hover:bg-blue-50/30 transition">
                                                <td className="p-4 sm:p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                                                            {index + 1}
                                                        </div>
                                                        <span className="font-bold text-gray-900">{c.nama}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 sm:p-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{c.totalSelesai}</span>
                                                        <span className="text-[10px] font-bold text-emerald-500 mt-1">{c.successRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 sm:p-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">{c.totalBatal}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 mt-1">{c.cancelRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 sm:p-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">{c.totalGagal}</span>
                                                        <span className="text-[10px] font-bold text-orange-500 mt-1">{c.failRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 sm:p-5 text-right font-bold text-gray-700">Rp {c.ongkir.toLocaleString('id-ID')}</td>
                                                <td className="p-4 sm:p-5 text-right font-bold text-red-500">- Rp {c.potonganKasAdmin.toLocaleString('id-ID')}</td>
                                                {adminFilterPeriod !== 'today' && (
                                                    <td className="p-4 sm:p-5 text-right font-bold text-red-500">- Rp {c.denda.toLocaleString('id-ID')}</td>
                                                )}
                                                <td className="p-4 sm:p-5 text-right font-black text-emerald-600">Rp {c.hakKurir.toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* COURIER VIEW */}
        {/* ===================================== */}
        {user.role === "courier" && (
          <div className="max-w-md mx-auto pb-20">
            <div className="bg-[#004aad] text-white px-6 pt-8 pb-10 rounded-b-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-blue-600 rounded-full opacity-50 blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-start relative z-10">
                  <h2 className="text-2xl font-black tracking-tight">Siap Narik,<br/>{user.name}! 🛵</h2>
                  <button 
                      onClick={openCourierSettings} 
                      className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-2xl backdrop-blur-md border border-white/30 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
                  >
                      ⚙️ Profil & PIN
                  </button>
              </div>
              <div className="flex gap-4 mt-6 relative z-10">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex-1 border border-white/20">
                      <p className="text-[10px] uppercase font-bold text-blue-200 mb-1">Total Orderan Masuk</p>
                      {/* <p className="text-2xl font-black leading-none mb-1">{courierAnalytics.sukses}</p> */}
                      {/* <div className="flex gap-1 text-[8px] font-bold text-blue-200">
                          <span title="Belanja" className="bg-white/10 px-1.5 rounded">🛒 {courierAnalytics.belanjaSks}</span>
                          <span title="Ojek" className="bg-white/10 px-1.5 rounded">🛵 {courierAnalytics.ojekSks}</span>
                          <span title="Kirim" className="bg-white/10 px-1.5 rounded">📦 {courierAnalytics.kirimSks}</span>
                      </div> */}

                      <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
                          <span className="text-[10px] text-white-200">🛒 Belanja </span>
                          <span className="text-[10px] font-bold text-white-200">{courierAnalytics.belanjaSks}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
                          <span className="text-[10px] text-white-200">🛵 Ojek </span>
                          <span className="text-[10px] font-bold text-white-200">{courierAnalytics.ojekSks}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
                          <span className="text-[10px] text-white-200">📦 Kirim Barang </span>
                          <span className="text-[10px] font-bold text-white-200">{courierAnalytics.kirimSks}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
                          <span className="text-[12px] text-white-200 font-bold">TOTAL </span>
                          <span className="text-[12px] font-bold text-white-200">{courierAnalytics.sukses}</span>
                      </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex-[1.2] border border-white/20 flex flex-col justify-center">
                      <p className="text-[10px] uppercase font-bold text-blue-200 mb-2">Laporan Keuangan</p>
                      <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] text-emerald-200">Pendapatan Kotor</span>
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-black text-[#ffde59]">Rp {courierAnalytics.pendapatan.toLocaleString('id-ID')}</span>
                      </div>

                      <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] text-emerald-200">Pendapatan Bersih</span>
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-black text-[#ffde59]">Rp {courierAnalytics.bersih.toLocaleString('id-ID')}</span>
                      </div>

                       <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
                          <span className="text-[9px] text-red-200">Admin & Kas</span>
                          <span className="text-[10px] font-bold text-red-200">Rp {courierAnalytics.potongan.toLocaleString('id-ID')}</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
                          <span className="text-[9px] text-red-200">Denda Target (Mingguan)</span>
                          <span className="text-[10px] font-bold text-red-200">- Rp {courierAnalytics.denda.toLocaleString('id-ID')}</span>
                      </div>
                  </div>
              </div>
            </div>

            <div className="flex justify-center -mt-5 relative z-20 px-4">
                <div className="bg-white rounded-full shadow-md p-1 flex border border-gray-100 w-full max-w-sm">
                    <button 
                        onClick={() => setCourierMainTab('aktif')} 
                        className={`flex-1 py-2 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${courierMainTab === 'aktif' ? 'bg-[#ffde59] text-[#004aad]' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Tugas Aktif
                        {courierActiveOrders.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${courierMainTab === 'aktif' ? 'bg-[#004aad] text-[#ffde59]' : 'bg-red-500 text-white shadow-sm'}`}>
                                {courierActiveOrders.length}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setCourierMainTab('riwayat')} className={`flex-1 py-2 rounded-full text-xs font-bold transition ${courierMainTab === 'riwayat' ? 'bg-[#ffde59] text-[#004aad]' : 'text-gray-500 hover:bg-gray-50'}`}>📈 Riwayat</button>
                </div>
            </div>

            <div className="p-4 mt-2 space-y-4">
                {courierMainTab === 'aktif' && (
                    <>
                    {courierActiveOrders.length === 0 && !loading && (
                        <div className="text-center p-10 bg-white rounded-2xl border border-gray-200 shadow-sm mt-4"><span className="text-5xl block mb-3 opacity-30">☕</span><span className="font-bold text-gray-500 block">Belum ada tugas baru.</span></div>
                    )}

                    {courierActiveOrders.map((task) => {
                        const jastipItemsObj = task.tipe_layanan === 'Belanja' ? parseJastipItemsObjects(task.raw_order_text) : [];
                        const jastipNote = task.tipe_layanan === 'Belanja' ? parseJastipNote(task.raw_order_text) : ''; // TANGKAP NOTE DISINI
                        const ojekData = task.tipe_layanan === 'Antar Jemput' ? parseOjekDetails(task.raw_order_text) : null;
                        const kirimData = task.tipe_layanan === 'Kirim Barang' ? parseKirimDetails(task.raw_order_text) : null;

                        const cleanPhone = task.customer_wa ? task.customer_wa.replace(/\D/g, '') : '';

                        return (
                        <div key={task.id} className={`bg-white rounded-2xl border shadow-sm p-5 relative overflow-hidden ${task.status === 'hold' ? 'border-orange-300' : task.status === 'delivering' ? 'border-blue-300' : 'border-gray-200'}`}>
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${task.status === 'hold' ? 'bg-orange-500' : task.status === 'delivering' ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                            
                            <div className="flex justify-between items-start mb-3 pl-2">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${task.status === 'hold' ? 'bg-orange-100 text-orange-700' : task.status === 'delivering' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {task.status === 'hold' ? 'KENDALA (TAHAN PROSES)' : task.status === 'delivering' ? 'MENUJU LOKASI CUSTOMER' : 'SEDANG DIKERJAKAN'}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400">{formatDateTime(task.created_at)}</span>
                            </div>

                            <div className="pl-2 mb-4">
                                <div className="mb-2"><ServiceBadge type={task.tipe_layanan} /></div>
                                
                                <p className="text-lg font-black text-gray-900 leading-tight mt-1 truncate">{task.customer_name || 'Customer'}</p>
                                
                                <p className="text-xs text-gray-500 font-medium flex items-start gap-1.5 mt-2"><span className="mt-0.5">📍</span> {task.customer_address}</p>
                                
                                {task.image_url && (
                                    <button onClick={() => setLightboxImg(task.image_url)} className="mt-3 w-full bg-blue-50 text-[#004aad] text-[10px] font-bold py-2 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1">
                                        📸 Lihat Foto Belanjaan
                                    </button>
                                )}
                            </div>

                            {task.tipe_layanan === 'Belanja' ? (
                                <div className="pl-2 mb-4 space-y-2">
                                    {/* Saat Status Menuju Lokasi (Delivering) */}
                                    {task.status === 'delivering' ? (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                                            <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-3">
                                                <p className="text-[10px] font-black text-blue-800 uppercase">🧾 Summary Belanjaan</p>
                                                <button onClick={() => { setEditingOrder({ id: task.id, text: task.raw_order_text, status: task.status, kendala_info: task.kendala_info }); setIsEditModalOpen(true); }} className="text-[10px] font-bold text-[#004aad] bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition shadow-sm flex items-center gap-1">
                                                    ✏️ Edit/Tambah List
                                                </button>
                                            </div>
                                            <div className="space-y-2 mb-3">
                                                {jastipItemsObj.map((itemObj, idx) => {
                                                    const userPrice = jastipPrices[`${task.id}_${idx}`];
                                                    const finalPrice = userPrice !== undefined ? parseFloat(userPrice || 0) : itemObj.defaultPrice;
                                                    return (
                                                        <div key={idx} className="flex justify-between items-start gap-2">
                                                            <span className="text-xs font-medium text-gray-700 leading-tight">{itemObj.name}</span>
                                                            <span className="text-xs font-bold text-gray-900 whitespace-nowrap">Rp {parseInt(finalPrice || 0).toLocaleString('id-ID')}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Subtotal Belanja:</span>
                                                <span className="text-sm font-black text-blue-700">Rp {calculateJastipTotal(task.id, task.raw_order_text).toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Saat Status Sedang Dikerjakan (Processing) */}
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase">List Belanjaan Secara Spesifik:</p>
                                                <button onClick={() => { setEditingOrder({ id: task.id, text: task.raw_order_text, status: task.status, kendala_info: task.kendala_info }); setIsEditModalOpen(true); }} className="text-[10px] font-bold text-[#004aad] bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition shadow-sm flex items-center gap-1">
                                                    ✏️ Tambah/Edit List
                                                </button>
                                            </div>
                                            {jastipItemsObj.map((itemObj, idx) => {
                                                // Logika Auto-Fill & Edit Manual
                                                const userPrice = jastipPrices[`${task.id}_${idx}`];
                                                const displayVal = userPrice !== undefined ? userPrice : (itemObj.defaultPrice > 0 ? itemObj.defaultPrice : '');

                                                return (
                                                    <div key={idx} className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex flex-col gap-2">
                                                        <div className="flex items-start gap-2">
                                                            <input type="checkbox" className="mt-1 w-4 h-4 rounded text-[#004aad] focus:ring-[#004aad]" checked={!!jastipChecked[`${task.id}_${idx}`]} onChange={(e) => updateJastipChecked(task.id, idx, e.target.checked)} />
                                                            <span className="text-xs font-medium text-gray-800">{itemObj.name}</span>
                                                        </div>
                                                        {task.status !== 'hold' && (
                                                            <input 
                                                                type="number" 
                                                                placeholder="Harga Barang (Rp)" 
                                                                className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#004aad] font-bold text-[#004aad]" 
                                                                value={displayVal} 
                                                                onChange={(e) => updateJastipPrice(task.id, idx, e.target.value)} 
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {task.status !== 'hold' && (
                                                <div className="text-right text-xs font-bold text-[#004aad] pt-2 border-t border-gray-100 mt-2">
                                                    Subtotal Barang Sementara: Rp {calculateJastipTotal(task.id, task.raw_order_text).toLocaleString('id-ID')}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {/* BLOK CATATAN KHUSUS JASTIP (MUNCUL KALAU ADA NOTE) */}
                                    {jastipNote && (
                                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 mt-4 shadow-sm">
                                            <p className="text-[10px] font-black text-yellow-800 uppercase mb-1 flex items-center gap-1">📝 Catatan Pelanggan:</p>
                                            <p className="text-xs text-yellow-900 font-medium whitespace-pre-wrap">{jastipNote}</p>
                                        </div>
                                    )}
                                </div>
                            ) : task.tipe_layanan === 'Antar Jemput' && ojekData ? (
                                // UI KHUSUS LAYANAN ANTAR JEMPUT / OJEK
                                <div className="pl-2 mb-4 space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 relative">
                                        <div className="flex gap-3 items-start">
                                            <div className="flex flex-col items-center mt-1">
                                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
                                                <div className="w-0.5 h-10 bg-gray-300 my-1"></div>
                                                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Titik Jemput</p>
                                                    <p className="text-xs font-bold text-gray-800 mt-0.5 leading-tight">{ojekData.jemput}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Tujuan</p>
                                                    <p className="text-xs font-bold text-gray-800 mt-0.5 leading-tight">{ojekData.tujuan}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {ojekData.note && (
                                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 shadow-sm">
                                            <p className="text-[10px] font-black text-yellow-800 uppercase mb-1">📝 Patokan / Note:</p>
                                            <p className="text-xs text-yellow-900 font-medium whitespace-pre-wrap">{ojekData.note}</p>
                                        </div>
                                    )}
                                </div>
                            ) : task.tipe_layanan === 'Kirim Barang' && kirimData ? (
                                // UI KHUSUS LAYANAN KIRIM BARANG
                                <div className="pl-2 mb-4 space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-start gap-3">
                                        <div className="text-2xl mt-0.5">📦</div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Nama / Jenis Paket</p>
                                            <p className="text-sm font-bold text-gray-800 leading-tight">{kirimData.barang}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 relative">
                                        <div className="flex gap-3 items-start">
                                            <div className="flex flex-col items-center mt-1">
                                                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></div>
                                                <div className="w-0.5 h-10 bg-gray-300 my-1"></div>
                                                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ambil Dari</p>
                                                    <p className="text-xs font-bold text-gray-800 mt-0.5 leading-tight">{kirimData.ambil}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kirim Ke</p>
                                                    <p className="text-xs font-bold text-gray-800 mt-0.5 leading-tight">{kirimData.tujuan}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase">Penerima:</p>
                                        <p className="text-sm font-black text-blue-800">{kirimData.penerima}</p>
                                    </div>
                                    {kirimData.note && (
                                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 shadow-sm">
                                            <p className="text-[10px] font-black text-yellow-800 uppercase mb-1">📝 Catatan:</p>
                                            <p className="text-xs text-yellow-900 font-medium whitespace-pre-wrap">{kirimData.note}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // FALLBACK JIKA FORMAT ADMIN NGACO / NGGAK PAKE FORMAT (Raw Text Biasa)
                                <div className="pl-2 bg-gray-50 p-3.5 rounded-xl text-xs font-mono text-gray-800 mb-4 border border-gray-200 whitespace-pre-wrap">
                                    {task.raw_order_text}
                                </div>
                            )}

                            {task.status !== 'hold' && task.status !== 'delivering' && (
                                <div className="pl-2 mb-5">
                                    <button onClick={() => { 
                                        const items = task.tipe_layanan === 'Belanja' ? parseJastipItemsObjects(task.raw_order_text).map(t => ({text: t.name, isKendala: false, note: ''})) : [];
                                        setKendalaForm({ id: task.id, type: task.tipe_layanan, text: '', jastipItems: items }); 
                                        setIsKendalaModalOpen(true); 
                                    }} className="w-full text-xs font-bold text-orange-500 hover:text-orange-700 border border-orange-200 bg-orange-50 py-2.5 rounded-xl transition shadow-sm">
                                        ⚠️ Lapor Kendala
                                    </button>
                                </div>
                            )}

                            {task.status !== 'hold' && (
                                <div className="pl-2 mb-5">
                                    {task.status === 'delivering' ? (
                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2">
                                            <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                                                <span className="text-[10px] font-bold text-emerald-800 uppercase">Ongkos Jasa:</span>
                                                <span className="text-sm font-black text-emerald-700">Rp {parseInt(task.delivery_fee || 0).toLocaleString('id-ID')}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1">
                                                <span className="text-sm font-black text-emerald-900">GRAND TOTAL:</span>
                                                <span className="text-xl font-black text-emerald-600">Rp {(parseInt(task.total_price || 0) + parseInt(task.delivery_fee || 0)).toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Edit Ongkos Jasa (Rp)</label>
                                            <input type="number" placeholder="Input Ongkir" className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-[#004aad] outline-none text-right focus:border-[#004aad]" value={dispatchInputs[`${task.id}_updateFee`] !== undefined ? dispatchInputs[`${task.id}_updateFee`] : (task.delivery_fee || '')} onChange={(e) => setDispatchInputs({...dispatchInputs, [`${task.id}_updateFee`]: e.target.value})} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TOMBOL KIRIM TAGIHAN UNTUK SEMUA LAYANAN (DARI PROCESSING -> DELIVERING) */}
                            {task.status !== 'hold' && task.status === 'processing' && (
                                <button onClick={() => handleKirimTagihanKeAdmin(task)} className="w-full bg-[#004aad] hover:bg-[#003b8a] text-white font-black py-4 rounded-xl shadow-md transition transform hover:-translate-y-1 text-sm mt-2">
                                    🧾 Kirim Tagihan ke Admin Pusat
                                </button>
                            )}

                            {/* TOMBOL SELESAIKAN ORDER MUNCUL SETELAH TAGIHAN DIKIRIM (DELIVERING -> COMPLETED) */}
                            {task.status !== 'hold' && task.status === 'delivering' && (
                                <button onClick={() => handleCompleteOrder(task)} className="w-full bg-[#10b981] text-white font-black py-4 rounded-xl shadow-md transition transform hover:-translate-y-1 text-sm mt-2">
                                    ✅ Selesaikan Order (Uang Diterima)
                                </button>
                            )}
                            
                            {task.status === 'hold' && (
                                <div className="flex gap-2 mt-4 pl-2">
                                    <button onClick={() => submitTidakBisaLanjut(task.id)} className="flex-[0.8] bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-md text-xs transition hover:bg-red-600">
                                        Nyerah (Batal)
                                    </button>
                                    <button onClick={() => handleLanjutProsesKendala(task.id)} className="flex-[1.2] bg-[#004aad] text-white font-bold py-3.5 rounded-xl shadow-md text-xs transition hover:bg-blue-700">
                                        Lanjut Proses 🚀
                                    </button>
                                </div>
                            )}
                        </div>
                    )})}
                    </>
                )}

                {courierMainTab === 'riwayat' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2 mb-2">
                            <select className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 font-bold outline-none" value={courierFilterPeriod} onChange={(e) => setCourierFilterPeriod(e.target.value)}>
                                <option value="today">Hari Ini</option><option value="week">Minggu Ini</option><option value="month">Bulan Ini</option><option value="all">Semua Waktu</option><option value="custom">Pilih Rentang Waktu</option>
                            </select>
                            {/* BLOK KALENDER (MUNCUL KALAU MILIH CUSTOM) */}
                            {courierFilterPeriod === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input type="date" className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 font-bold outline-none" value={courierFilterStartDate} onChange={e => setCourierFilterStartDate(e.target.value)} />
                                    <span className="text-gray-400 font-bold">-</span>
                                    <input type="date" className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 font-bold outline-none" value={courierFilterEndDate} onChange={e => setCourierFilterEndDate(e.target.value)} />
                                </div>
                            )}
                            <div className="flex gap-2">
                                <select className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl p-2.5 font-bold outline-none" value={courierFilterService} onChange={(e) => setCourierFilterService(e.target.value)}>
                                    <option value="all">Semua</option><option value="Belanja">Belanja</option><option value="Antar Jemput">Ojek</option><option value="Kirim Barang">Kirim</option>
                                </select>
                                <select className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl p-2.5 font-bold outline-none" value={courierFilterStatus} onChange={(e) => setCourierFilterStatus(e.target.value)}>
                                    <option value="all">Status</option><option value="completed">Sukses</option><option value="cancelled">Batal</option><option value="failed">Gagal</option>
                                </select>
                            </div>
                            <div className="relative w-full mt-1">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                                <input type="text" placeholder="Cari Nama Customer..." className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl pl-9 pr-4 py-2.5 font-medium outline-none w-full focus:border-[#004aad]" value={courierHistorySearch} onChange={(e) => setCourierHistorySearch(e.target.value)} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4">
                             <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                                 <p className="text-[9px] font-bold text-emerald-600 uppercase mb-1">Sukses</p>
                                 <p className="text-xl font-black text-emerald-700">{courierAnalytics.sukses}</p>
                                 <p className="text-[10px] font-bold text-emerald-500">{courierAnalytics.persenSukses}%</p>
                             </div>
                             <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center">
                                 <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Batal</p>
                                 <p className="text-xl font-black text-gray-700">{courierAnalytics.batal}</p>
                                 <p className="text-[10px] font-bold text-gray-500">{courierAnalytics.persenBatal}%</p>
                             </div>
                             <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-center">
                                 <p className="text-[9px] font-bold text-red-600 uppercase mb-1">Gagal</p>
                                 <p className="text-xl font-black text-red-700">{courierAnalytics.gagal}</p>
                                 <p className="text-[10px] font-bold text-red-500">{courierAnalytics.persenGagal}%</p>
                             </div>
                        </div>

                        {/* <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total Talangan Keluar</p>
                                <p className="text-xl font-black text-gray-800">Rp {courierAnalytics.talangan.toLocaleString('id-ID')}</p>
                            </div>
                        </div> */}

                        <h3 className="font-bold text-sm text-gray-800 mt-6 mb-3 px-1">Riwayat Orderan (Sesuai Filter):</h3>
                        {courierAnalytics.history
                            .filter(o => courierFilterService === 'all' ? true : o.tipe_layanan === courierFilterService)
                            .filter(o => {
                                if (courierFilterStatus === 'all') return true;
                                if (courierFilterStatus === 'completed') return o._viewMode === 'final' && o.status === 'completed';
                                if (courierFilterStatus === 'cancelled') return o._viewMode === 'final' && o.status === 'cancelled';
                                if (courierFilterStatus === 'failed') return o._viewMode === 'failed';
                                return true;
                            })
                            .filter(o => (o.customer_name || o.customer_wa || '').toLowerCase().includes(courierHistorySearch.toLowerCase()))
                            .map((o, idx) => {
                             
                             const isFailedView = o._viewMode === 'failed';
                             const isSuccessView = o._viewMode === 'final' && o.status === 'completed';
                             const isCancelView = o._viewMode === 'final' && o.status === 'cancelled';
                             
                             let statusLabel = ''; let statusColor = '';
                             if(isFailedView) { statusLabel = 'Gagal (Nyerah)'; statusColor = 'bg-red-100 text-red-700'; }
                             else if(isSuccessView) { statusLabel = 'Sukses'; statusColor = 'bg-emerald-100 text-emerald-700'; }
                             else if(isCancelView) { statusLabel = 'Batal / Cancel'; statusColor = 'bg-gray-100 text-gray-700'; }
                             
                             return (
                             <div key={`${o.id}-${o._viewMode}-${idx}`} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 hover:border-blue-200 transition">
                                 <div className="flex justify-between items-center mb-1">
                                     <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${statusColor}`}>{statusLabel}</span>
                                     {/* TAMPILIN JAM KEJADIAN ASLINYA */}
                                     <span className="text-[9px] font-bold text-gray-400">{formatDateTime(o._actionTime)}</span>
                                 </div>
                                 <div className="mb-1"><ServiceBadge type={o.tipe_layanan} /></div>
                                 <p className="font-bold text-gray-800 text-sm mt-1">{o.customer_name || o.customer_wa.split('-')[0]}</p>
                                 <p className="text-[10px] text-gray-500 flex items-start gap-1">📍 <span>{o.customer_address}</span></p>

                                 {o.image_url && (
                                    <button onClick={() => setLightboxImg(o.image_url)} className="mt-2 w-max px-2 py-1 bg-blue-50 text-[#004aad] text-[9px] font-bold rounded border border-blue-200 flex items-center gap-1">
                                        📸 Foto Belanjaan
                                    </button>
                                 )}

                                 {o.tipe_layanan === 'Belanja' && o.bill_details ? (
                                     <div className="bg-blue-50 p-2.5 rounded-lg text-[10px] font-mono border border-blue-100 mt-1 whitespace-pre-wrap text-blue-800 flex-grow">
                                         <strong className="text-blue-900 block mb-1">Rincian Belanja:</strong>{o.bill_details}
                                     </div>
                                 ) : (
                                     <div className="bg-gray-50 p-2.5 rounded-lg text-[10px] font-mono text-gray-600 line-clamp-3 border border-gray-100 mt-1 whitespace-pre-wrap">{o.raw_order_text}</div>
                                 )}
                                 
                                 {isFailedView && o._failedReason && (
                                     <div className="bg-red-50 p-2 rounded text-[9px] text-red-700 border border-red-100 mt-1 italic">
                                         <strong>Alasan Kendala:</strong> {o._failedReason}
                                     </div>
                                 )}
                                 
                                 {isCancelView && o.kendala_info && (
                                     <div className="bg-gray-50 p-2 rounded text-[9px] text-gray-700 border border-gray-200 mt-1 italic">
                                         <strong>Alasan Batal:</strong> {o.kendala_info}
                                     </div>
                                 )}

                                 {isSuccessView && (
                                     <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-gray-100">
                                         <div className="flex justify-between items-center text-[10px] font-bold">
                                             <span className="text-gray-500">⏱️ Durasi Pengerjaan:</span>
                                             <span className="text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{calculateDuration(o.dispatched_at, o.completed_at)}</span>
                                         </div>
                                         {o.tipe_layanan === 'Belanja' && (
                                             <div className="flex justify-between items-center text-[10px] font-bold">
                                                 <span className="text-gray-500">Total Belanja (Talangan):</span>
                                                 <span className="text-red-500 text-sm">Rp {parseInt(o.total_price||0).toLocaleString('id-ID')}</span>
                                             </div>
                                         )}
                                         <div className="flex justify-between items-center text-[10px] font-bold">
                                             <span className="text-gray-500">Ongkos Jasa Diterima:</span>
                                             <span className="text-emerald-600 text-sm">Rp {parseInt(o.delivery_fee||0).toLocaleString('id-ID')}</span>
                                         </div>
                                     </div>
                                 )}
                             </div>
                             )
                        })}
                    </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDIT PESANAN */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="bg-[#004aad] p-4 flex justify-between items-center">
                    <h3 className="font-black text-white text-sm">📝 Revisi Pesanan</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-white hover:text-blue-200 text-lg">&times;</button>
                </div>
                <div className="p-6">
                    {editingOrder?.status === 'hold' && (
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-5 shadow-sm">
                            <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1">💬 Kurir Lapor Kendala:</p>
                            <p className="text-xs font-mono text-orange-900 font-bold whitespace-pre-wrap">{editingOrder.kendala_info}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-end mb-3">
                      <p className="text-[10px] uppercase font-bold text-gray-500">Daftar Baris Pesanan / Alamat:</p>
                  </div>
                  
                  {/* WADAH SCROLL UNTUK BARIS DINAMIS */}
                  <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-2 custom-scroll">
                      {editLines.map((line, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-[#004aad] transition group">
                              <span className="text-[10px] font-bold text-gray-400 w-4 text-center select-none">{idx + 1}.</span>
                              <input
                                  type="text"
                                  className="flex-1 bg-transparent text-xs font-mono text-gray-800 outline-none placeholder-gray-300"
                                  placeholder="Ketik detail pesanan / format..."
                                  value={line}
                                  onChange={(e) => handleEditLineChange(idx, e.target.value)}
                              />
                              <button onClick={() => handleRemoveEditLine(idx)} className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition active:scale-95 shrink-0 ml-1 border border-red-200" title="Hapus baris ini">
                                🗑️ Hapus
                            </button>
                          </div>
                      ))}
                  </div>

                  {/* TOMBOL TAMBAH BARIS */}
                  <button onClick={handleAddEditLine} className="w-full mt-3 border border-dashed border-[#004aad] text-[#004aad] bg-blue-50 hover:bg-blue-100 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]">
                     ➕ Tambah Baris Baru
                  </button>

                  {/* 🌟 INTEGRASI BARU: FIELD KHUSUS CATATAN / NOTE 🌟 */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                      <label className="text-[10px] font-black text-gray-500 uppercase block mb-1.5">
                          📝 Catatan Khusus Pesanan (Note):
                      </label>
                      <textarea
                          rows="2"
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans outline-none focus:border-[#004aad] shadow-sm placeholder-gray-400"
                          placeholder="Contoh: Belinya di toko kelontong depan masjid ya, kalau ga ada ganti merk lain..."
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                      />
                  </div>
                    <div className="flex gap-3 mt-5">
                        <button onClick={submitCancelOrder} className="flex-1 bg-[#FF0000] hover:bg-red-500 text-white border border-gray-200 font-bold py-3 rounded-xl shadow-sm text-xs transition">Cancel Orderan</button>
                        <button onClick={submitEditOrder} className="flex-[2] bg-[#004aad] text-white font-bold py-3 rounded-xl shadow-md text-xs transition hover:bg-[#003b8a]">Update & Lanjutkan 🚀</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL TAMBAH PEGAWAI (HRD) KHUSUS ADMIN */}
      {isHrModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-[#004aad] p-4 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-white text-sm">➕ Daftarkan Anggota Baru</h3>
                    <button onClick={() => setIsHrModalOpen(false)} className="text-white hover:text-blue-200 text-xl font-bold">&times;</button>
                </div>
                <div className="p-5 space-y-3 overflow-y-auto">
                    <div className="flex gap-2">
                        <div className="flex-1"><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Role / Jabatan</label><select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.role} onChange={(e) => setHrForm({...hrForm, role: e.target.value})}><option value="courier">Mitra Kurir</option><option value="admin">Pusat Admin</option></select></div>
                        <div className="flex-[2]"><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nama Lengkap</label><input type="text" placeholder="Kang Asep..." className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.full_name} onChange={(e) => setHrForm({...hrForm, full_name: e.target.value})} /></div>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-[1.5]"><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Alamat Email (Untuk Login)</label><input type="email" placeholder="kurir1@tutahtitah.com" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.email} onChange={(e) => setHrForm({...hrForm, email: e.target.value})} /></div>
                        <div className="flex-1"><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">PIN Login</label><input type="password" placeholder="Min 6 Angka" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.pin} onChange={(e) => setHrForm({...hrForm, pin: e.target.value})} /></div>
                    </div>

                    <div><label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nomor WhatsApp</label><input type="text" placeholder="08..." className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.phone} onChange={(e) => setHrForm({...hrForm, phone: e.target.value})} /></div>
                    
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <label className="text-[10px] font-bold text-gray-800 uppercase mb-2 block border-b border-gray-200 pb-1">Informasi Rekening Bank / E-Wallet</label>
                        <div className="flex gap-2 mb-2">
                            <div className="flex-1"><input type="text" placeholder="Nama Bank 1 (BCA)" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.bank_name} onChange={(e) => setHrForm({...hrForm, bank_name: e.target.value})} /></div>
                            <div className="flex-[1.5]"><input type="text" placeholder="No Rekening 1" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.account_number} onChange={(e) => setHrForm({...hrForm, account_number: e.target.value})} /></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1"><input type="text" placeholder="Nama Bank 2 (DANA)" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.bank_name_2} onChange={(e) => setHrForm({...hrForm, bank_name_2: e.target.value})} /></div>
                            <div className="flex-[1.5]"><input type="text" placeholder="No Rekening 2" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={hrForm.account_number_2} onChange={(e) => setHrForm({...hrForm, account_number_2: e.target.value})} /></div>
                        </div>
                    </div>

                    <button onClick={() => submitRegisterEmployee(false)} disabled={isSubmittingHr} className="w-full mt-2 bg-[#004aad] hover:bg-[#003b8a] text-white font-bold py-3 rounded-xl shadow-md text-xs transition disabled:opacity-50">
                        {isSubmittingHr ? 'Mendaftarkan...' : 'Simpan Karyawan'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL INPUT MANUAL (DENGAN DATALIST AUTO-SUGGESTION CUSTOMER) */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-gray-900 p-4 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-white text-sm">➕ Input Order Manual</h3>
                    <button onClick={() => { setIsManualModalOpen(false); setManualImages([]); }} className="text-white font-bold text-xl">&times;</button>
                </div>
                <div className="p-5 space-y-3 overflow-y-auto">
                    {/* HIGHLIGHT JENIS LAYANAN & COPY FORMAT (PALING ATAS) */}
                    <div className="bg-yellow-50 border border-blue-200 p-3 rounded-xl flex gap-2 items-end shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#004aad] opacity-5 rounded-bl-full pointer-events-none"></div>
                        <div className="flex-[2] relative z-10">
                            <label className="text-[10px] font-black text-[#004aad] uppercase mb-1 flex items-center gap-1">
                                📌 Tentukan Layanan Dulu!
                            </label>
                            <select className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-[#004aad] outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] shadow-inner" value={manualForm.type} onChange={(e) => setManualForm({...manualForm, type: e.target.value})}>
                                <option value="Belanja">🛒 Belanja/Jastip</option>
                                <option value="Antar Jemput">🛵 Antar Jemput</option>
                                <option value="Kirim Barang">📦 Kirim Barang</option>
                            </select>
                        </div>
                        <div className="flex-1 relative z-10">
                            <button onClick={() => {
                                let t = 'jastip';
                                if(manualForm.type === 'Antar Jemput') t = 'ojek';
                                if(manualForm.type === 'Kirim Barang') t = 'kirim';
                                copyFormat(t);
                            }} className="w-full bg-white text-[#004aad] border border-blue-300 hover:bg-[#004aad] hover:text-white font-bold py-2.5 rounded-lg text-[10px] shadow-sm transition h-[38px] flex items-center justify-center gap-1">
                                📋 Copy Format
                            </button>
                        </div>
                    </div>

                    {/* BARIS KEDUA: NAMA & WA (BERDAMPINGAN) */}
                    <div className="flex gap-2">
                        <div className="relative flex-[1.2]">
                            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 flex justify-between">
                                <span>Nama Customer</span>
                                <span className="text-blue-500 text-[9px] font-normal italic">*Pilih / Ketik</span>
                            </label>
                            <input 
                                type="text" 
                                placeholder="Contoh: Budi" 
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" 
                                value={manualForm.name} 
                                onChange={(e) => {
                                    setManualForm({...manualForm, name: e.target.value});
                                    setShowCustSuggestions(true);
                                }}
                                onFocus={() => setShowCustSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowCustSuggestions(false), 200)}
                            />
                            {showCustSuggestions && manualForm.name && (
                                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1">
                                    {customersList.filter(c => (c.name.toLowerCase().includes(manualForm.name.toLowerCase()) || c.phone.includes(manualForm.name))).map(c => (
                                        <div key={c.id} className="p-3 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex flex-col" onMouseDown={() => {
                                            setManualForm({...manualForm, name: c.name, wa: c.phone, address: c.address || ''});
                                            setShowCustSuggestions(false);
                                        }}>
                                            <span className="font-bold text-gray-800">{c.name}</span> 
                                            <span className="text-blue-600 font-medium">{c.phone}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex-[0.8]">
                            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">No. WA</label>
                            <input type="text" placeholder="08..." className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={manualForm.wa} onChange={(e) => setManualForm({...manualForm, wa: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">
                            {manualForm.type === 'Belanja' ? 'Alamat Tujuan / Pengantaran (Khusus Belanja)' : 'Alamat Utama'}
                        </label>
                        <input type="text" placeholder="Alamat lengkap..." className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={manualForm.address} onChange={(e) => setManualForm({...manualForm, address: e.target.value})} />
                    </div>
                    
                    {/* BAGIAN UPLOAD FOTO MULTIPLE (DENGAN PREVIEW & HAPUS) */}
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <label className="text-[10px] font-bold text-[#004aad] uppercase mb-2 flex items-center gap-1">
                            📸 Lampirkan Foto (Bisa Pilih Lebih Dari 1)
                        </label>
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={(e) => {
                                // FIX SAKTI: Pengecekan aman & Reset memori browser pakai string kosong
                                if (e.target.files && e.target.files.length > 0) {
                                    const newFiles = Array.from(e.target.files);
                                    setManualImages(prev => [...prev, ...newFiles]);
                                    e.target.value = ''; // 👈 INI KUNCINYA BRO! Harus string kosong biar browser nggak nge-bug
                                }
                            }} 
                            className="w-full text-xs text-gray-600 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-[#004aad] file:text-white hover:file:bg-[#003b8a] transition cursor-pointer" 
                        />
                        
                        {/* List Foto yang Dipilih */}
                        {manualImages.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {manualImages.map((file, idx) => (
                                    <div key={idx} className="bg-white border border-blue-200 text-[#004aad] text-[10px] font-bold pl-2 pr-1 py-1 rounded shadow-sm flex items-center gap-2">
                                        <span 
                                            className="cursor-pointer hover:text-blue-700 hover:underline flex items-center gap-1"
                                            onClick={() => setLightboxData({ urls: [URL.createObjectURL(file)], index: 0 })}
                                            title="Klik untuk lihat foto"
                                        >
                                            🖼️ {file.name.substring(0, 12)}{file.name.length > 12 ? '...' : ''}
                                        </span>
                                        <button 
                                            onClick={() => {
                                                const newImages = [...manualImages];
                                                newImages.splice(idx, 1);
                                                setManualImages(newImages);
                                            }}
                                            className="text-red-500 hover:text-white hover:bg-red-500 bg-red-50 rounded-full w-5 h-5 flex items-center justify-center transition focus:outline-none shrink-0"
                                            title="Hapus foto ini"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Detail Pesanan (Jika pakai foto, isi 'Sesuai Foto')</label>
                        <textarea rows="3" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-[#004aad]" value={manualForm.text} onChange={(e) => setManualForm({...manualForm, text: e.target.value})}></textarea>
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Ongkir (Opsional)</label>
                            <input type="number" placeholder="Rp" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={manualForm.fee} onChange={(e) => setManualForm({...manualForm, fee: e.target.value})} />
                        </div>
                        <div className="flex-[1.5]">
                            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Tugaskan Kurir (Langsung Jalan)</label>
                            <CustomCourierSelect 
                                value={manualForm.courier} 
                                onChange={(val) => setManualForm({...manualForm, courier: val})} 
                                placeholder="-- Masuk ke Order Pending --" 
                            />
                        </div>
                    </div>

                    <button onClick={submitManualOrder} disabled={isUploadingManual} className="w-full mt-4 bg-[#004aad] hover:bg-[#003b8a] text-white font-bold py-3 rounded-xl shadow-md text-xs transition disabled:opacity-50">
                        {isUploadingManual ? 'Mengupload & Menyimpan...' : 'Simpan ke Sistem'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL LAPOR KENDALA */}
      {isKendalaModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-orange-500 p-4 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-white text-sm">⚠️ Lapor Kendala</h3>
                    <button onClick={() => setIsKendalaModalOpen(false)} className="text-white hover:text-orange-200 text-lg">&times;</button>
                </div>
                <div className="p-5 overflow-y-auto">
                    {kendalaForm.type === 'Belanja' ? (
                        <div className="space-y-4 mb-4">
                            <p className="text-xs text-gray-600 font-medium border-b border-gray-100 pb-2">Centang barang yang kosong/bermasalah, dan beri catatan:</p>
                            {kendalaForm.jastipItems.map((item, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <div className="flex items-start gap-2 mb-2">
                                        <input type="checkbox" className="mt-1 w-4 h-4 rounded text-orange-500 focus:ring-orange-500" checked={item.isKendala} onChange={(e) => {
                                            const newItems = [...kendalaForm.jastipItems];
                                            newItems[idx].isKendala = e.target.checked;
                                            setKendalaForm({...kendalaForm, jastipItems: newItems});
                                        }}/>
                                        <span className="text-xs font-bold text-gray-800 line-clamp-2">{item.text}</span>
                                    </div>
                                    {item.isKendala && (
                                        <input type="text" placeholder="Catatan (Misal: Habis, sisa rasa coklat)" className="w-full text-[10px] p-2 rounded bg-white border border-orange-200 focus:outline-none focus:border-orange-500" value={item.note} onChange={(e) => {
                                            const newItems = [...kendalaForm.jastipItems];
                                            newItems[idx].note = e.target.value;
                                            setKendalaForm({...kendalaForm, jastipItems: newItems});
                                        }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-gray-600 font-medium mb-3">Tuliskan kendala yang dialami di lapangan:</p>
                            <textarea rows="3" placeholder="Contoh: Customer tidak bisa dihubungi, ban bocor..." className="w-full p-3 bg-gray-50 border border-orange-200 rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500 mb-4" value={kendalaForm.text} onChange={(e) => setKendalaForm({...kendalaForm, text: e.target.value})}></textarea>
                        </>
                    )}
                    <button onClick={submitKendala} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-md text-xs shrink-0 transition">Lapor ke Admin Pusat</button>
                </div>
            </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL BUAT PIN BARU (DARI LINK RESET EMAIL)              */}
      {/* ========================================================= */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-[#004aad] p-5 text-center">
              <h3 className="font-black text-white text-base tracking-tight">🔑 Buat PIN Baru</h3>
              <p className="text-blue-100 text-xs mt-1">Masukkan PIN rahasia baru untuk akun kamu</p>
            </div>
            <form onSubmit={handleSaveNewResetPin} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">PIN Baru (Min. 6 Digit)</label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan PIN Baru"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-[#004aad] transition"
                  value={resetPinForm.new_pin}
                  onChange={(e) => setResetPinForm({ ...resetPinForm, new_pin: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Konfirmasi PIN Baru</label>
                <input
                  type="password"
                  required
                  placeholder="Ulangi PIN Baru"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-[#004aad] transition"
                  value={resetPinForm.confirm_pin}
                  onChange={(e) => setResetPinForm({ ...resetPinForm, confirm_pin: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingResetPin}
                className="w-full mt-2 bg-[#004aad] hover:bg-[#003b8a] text-white font-black py-3.5 rounded-xl shadow-lg text-xs tracking-wider uppercase transition active:scale-95 disabled:opacity-50"
              >
                {isSubmittingResetPin ? 'Simpan PIN...' : 'Simpan PIN Baru 🚀'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PENGATURAN PROFIL & PIN MANDIRI UNTUK KURIR         */}
      {/* ========================================================= */}
      {isCourierSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-[#004aad] p-4 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-white text-sm">⚙️ Pengaturan Profil & PIN</h3>
                    <button onClick={() => setIsCourierSettingsOpen(false)} className="text-white hover:text-blue-200 text-xl font-bold">&times;</button>
                </div>
                <form onSubmit={submitCourierSettings} className="p-5 space-y-3 overflow-y-auto">
                    <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nomor WhatsApp</label>
                        <input type="text" required className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={courierSettingsForm.phone} onChange={(e) => setCourierSettingsForm({...courierSettingsForm, phone: e.target.value})} />
                    </div>

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <label className="text-[10px] font-bold text-gray-800 uppercase mb-2 block border-b border-gray-200 pb-1">Rekening Bank / E-Wallet Saya</label>
                        
                        {/* Input Bank 1 - Dibikin responsive numpuk ke bawah di HP */}
                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                            <input type="text" placeholder="Bank 1 (misal BCA)" className="w-full sm:flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={courierSettingsForm.bank_name} onChange={(e) => setCourierSettingsForm({...courierSettingsForm, bank_name: e.target.value})} />
                            <input type="text" placeholder="No Rekening 1" className="w-full sm:flex-[1.5] p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={courierSettingsForm.account_number} onChange={(e) => setCourierSettingsForm({...courierSettingsForm, account_number: e.target.value})} />
                        </div>
                        
                        {/* Input Bank 2 */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input type="text" placeholder="Bank 2 (misal DANA)" className="w-full sm:flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={courierSettingsForm.bank_name_2} onChange={(e) => setCourierSettingsForm({...courierSettingsForm, bank_name_2: e.target.value})} />
                            <input type="text" placeholder="No Rekening 2" className="w-full sm:flex-[1.5] p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={courierSettingsForm.account_number_2} onChange={(e) => setCourierSettingsForm({...courierSettingsForm, account_number_2: e.target.value})} />
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mt-3">
                        <label className="text-[10px] font-black text-[#004aad] uppercase mb-1 block">🔐 Ubah PIN Rahasia (Opsional)</label>
                        <p className="text-[9px] text-gray-500 mb-2">Kosongkan jika tidak ingin mengganti PIN saat ini.</p>
                        
                        {/* Input PIN - Dibikin responsive numpuk ke bawah di HP */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input type="password" placeholder="PIN Baru (min 6 digit)" className="w-full sm:flex-1 p-2.5 bg-white border border-blue-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={courierSettingsForm.new_pin} onChange={(e) => setCourierSettingsForm({...courierSettingsForm, new_pin: e.target.value})} />
                            <input type="password" placeholder="Konfirmasi PIN" className="w-full sm:flex-1 p-2.5 bg-white border border-blue-200 rounded-lg text-xs outline-none focus:border-[#004aad]" value={courierSettingsForm.confirm_pin} onChange={(e) => setCourierSettingsForm({...courierSettingsForm, confirm_pin: e.target.value})} />
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmittingCourierSettings} className="w-full mt-2 bg-[#004aad] hover:bg-[#003b8a] text-white font-bold py-3 rounded-xl shadow-md text-xs transition disabled:opacity-50">
                        {isSubmittingCourierSettings ? 'Memperbarui...' : 'Simpan Perubahan'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* LIGHTBOX UNTUK FOTO BELANJAAN MULTIPLE */}
      {lightboxData.urls.length > 0 && (
          <div onClick={() => setLightboxData({urls: [], index: 0})} className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out select-none">
              <button className="absolute top-6 right-6 text-white text-4xl hover:text-red-500 z-50 transition transform hover:scale-110">&times;</button>
              
              {lightboxData.urls.length > 1 && (
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-full text-sm font-bold z-50 tracking-widest border border-white/20">
                      {lightboxData.index + 1} / {lightboxData.urls.length}
                  </div>
              )}

              {lightboxData.urls.length > 1 && (
                  <>
                      <button onClick={(e) => { e.stopPropagation(); setLightboxData(prev => ({...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length})); }} className="absolute left-2 sm:left-6 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-3 rounded-full text-2xl sm:text-4xl hover:bg-[#004aad] transition z-50 border border-white/20 hover:scale-110">
                          ◀
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setLightboxData(prev => ({...prev, index: (prev.index + 1) % prev.urls.length})); }} className="absolute right-2 sm:right-6 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-3 rounded-full text-2xl sm:text-4xl hover:bg-[#004aad] transition z-50 border border-white/20 hover:scale-110">
                          ▶
                      </button>
                  </>
              )}

              <img src={lightboxData.urls[lightboxData.index]} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl relative z-40" alt="Lampiran" onClick={(e) => e.stopPropagation()} />
              
              <p className="absolute bottom-6 text-white/50 text-xs">Sentuh area hitam di luar gambar untuk menutup</p>
          </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Clock, Package, MapPin, Receipt, Navigation, ShoppingCart, ShoppingBag, XCircle, AlertCircle, Check, Copy, MessageSquare, Star, Store, Motorbike, Flag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import RatingModal from '../components/RatingModal';
import ReportModal from '../components/ReportModal';

const parseOjekDetails = (rawText) => {
  if (!rawText) return null;
  const jemputMatch = rawText.match(/Alamat Jemput:\s*([\s\S]*?)(?=Alamat Tujuan:|$)/i);
  const tujuanMatch = rawText.match(/Alamat Tujuan:\s*([\s\S]*?)(?=Note\/Patokan Titik Jemput:|$)/i);
  const noteMatch = rawText.match(/Note\/Patokan Titik Jemput:\s*([\s\S]*)/i);
  if (!jemputMatch && !tujuanMatch) return null;
  return {
    jemput: jemputMatch && jemputMatch[1].trim() ? jemputMatch[1].trim() : "-",
    tujuan: tujuanMatch && tujuanMatch[1].trim() ? tujuanMatch[1].trim() : "-",
    note: noteMatch && noteMatch[1].trim() ? noteMatch[1].trim() : "",
  };
};

const parseKirimDetails = (rawText) => {
  if (!rawText) return null;
  const barangMatch = rawText.match(/Nama\/Jenis Barang:\s*([\s\S]*?)(?=Alamat Pengambilan:|$)/i);
  const ambilMatch = rawText.match(/Alamat Pengambilan:\s*([\s\S]*?)(?=Alamat Tujuan:|$)/i);
  const tujuanMatch = rawText.match(/Alamat Tujuan:\s*([\s\S]*?)(?=Nama Penerima:|$)/i);
  const penerimaMatch = rawText.match(/Nama Penerima:\s*([\s\S]*?)(?=Note:|$)/i);
  const noteMatch = rawText.match(/Note:\s*([\s\S]*)/i);
  if (!barangMatch && !ambilMatch && !tujuanMatch) return null;
  return {
    barang: barangMatch && barangMatch[1].trim() ? barangMatch[1].trim() : "-",
    ambil: ambilMatch && ambilMatch[1].trim() ? ambilMatch[1].trim() : "-",
    tujuan: tujuanMatch && tujuanMatch[1].trim() ? tujuanMatch[1].trim() : "-",
    penerima: penerimaMatch && penerimaMatch[1].trim() ? penerimaMatch[1].trim() : "-",
    note: noteMatch && noteMatch[1].trim() ? noteMatch[1].trim() : "",
  };
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prevVisualStatus, setPrevVisualStatus] = useState(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showAllStatus, setShowAllStatus] = useState(false);

  const [user, setUser] = useState(null);
  const [customerProfileId, setCustomerProfileId] = useState(null);
  const [orderRatings, setOrderRatings] = useState([]);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTargetId, setRatingTargetId] = useState(null);
  const [ratingTargetType, setRatingTargetType] = useState(null);
  const [ratingTargetName, setRatingTargetName] = useState('');
  const [ratingInitialValue, setRatingInitialValue] = useState(0);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetId, setReportTargetId] = useState(null);
  const [reportTargetType, setReportTargetType] = useState(null);
  const [reportTargetName, setReportTargetName] = useState('');

  const openRatingModal = (targetId, targetType, targetName, initialVal = 0) => {
    setRatingTargetId(targetId);
    setRatingTargetType(targetType);
    setRatingTargetName(targetName);
    setRatingInitialValue(initialVal);
    setShowRatingModal(true);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        supabase.from('customers').select('id').eq('auth_id', authUser.id).maybeSingle().then(({ data }) => {
          if (data) setCustomerProfileId(data.id);
        });
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchOrder();
    const channel = setupRealtime();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (!order) return;

    let mappedStatus = order.status;
    const isJasaOnly = ['Antar Jemput', 'Kirim Barang'].includes(order.tipe_layanan);

    if (mappedStatus === 'pending' && order.assigned_courier_id) {
      mappedStatus = 'process';
    }

    if (isJasaOnly) {
      if (['admin_accepted', 'on_delivery', 'delivering', 'process', 'processing'].includes(mappedStatus)) {
        mappedStatus = 'process';
      }
    } else {
      if (['admin_accepted', 'merchant_accepted', 'process', 'processing'].includes(mappedStatus)) {
        mappedStatus = 'process';
      } else if (['on_delivery', 'delivering'].includes(mappedStatus)) {
        mappedStatus = 'on_delivery';
      }
    }

    if (prevVisualStatus && prevVisualStatus !== mappedStatus) {
      let msg = "Status pesanan diperbarui!";
      if (mappedStatus === 'process') msg = "Pesananmu sedang diproses kurir!";
      else if (mappedStatus === 'on_delivery') msg = "Pesananmu sedang dalam pengiriman!";
      else if (mappedStatus === 'completed') msg = "Pesanan telah selesai!";
      else if (mappedStatus === 'cancelled') msg = "Pesanan dibatalkan.";

      toast.success(msg, { id: 'status-update' });
    }
    setPrevVisualStatus(mappedStatus);
  }, [order]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, employees!assigned_courier_id(full_name, phone, bank_name, account_number, bank_name_2, account_number_2), merchants(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data.is_deleted) {
        toast.error('Pesanan tidak ditemukan atau telah dihapus.');
        navigate('/activity');
        return;
      }
      setOrder(data);

      const { data: ratingData } = await supabase
        .from('ratings')
        .select('*')
        .eq('order_id', id);
      if (ratingData) setOrderRatings(ratingData);
    } catch (error) {
      console.error("Fetch order detail error:", error);
      toast.error('Gagal memuat detail pesanan');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        async (payload) => {
          if (payload.new.is_deleted === true) {
            toast.error('Pesanan telah dihapus oleh Admin.');
            navigate('/activity');
          } else {
            fetchOrder();
          }
        }
      )
      .subscribe();
    return channel;
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Berhasil disalin');
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancelOrder = async () => {
    if (order.status !== 'pending') {
      toast.error('Pesanan sudah diproses, hubungi admin untuk pembatalan.');
      return;
    }

    setShowCancelModal(true);
  };

  const submitCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Mohon masukkan alasan pembatalan');
      return;
    }

    try {
      setCancelLoading(true);
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          kendala_info: `Dibatalkan Customer: ${cancelReason}`
        })
        .eq('id', id);

      if (error) throw error;

      setShowCancelModal(false);
      fetchOrder();
    } catch (error) {
      toast.error('Gagal membatalkan pesanan');
      console.error(error);
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading && !order) {
    return <div className="min-h-screen bg-gray-50 flex justify-center items-center"><div className="animate-spin text-primary"><Clock size={32} /></div></div>;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Package size={48} className="text-gray-300 mb-4" />
        <h2 className="text-lg font-bold text-gray-800">Pesanan Tidak Ditemukan</h2>
        <button onClick={() => navigate('/activity')} className="mt-4 px-4 py-2 bg-white text-primary border border-primary hover:bg-blue-50 rounded-xl font-bold transition-colors">Kembali ke Aktivitas</button>
      </div>
    );
  }

  const isJasaOnly = ['Antar Jemput', 'Kirim Barang'].includes(order.tipe_layanan);
  const isCancelled = ['cancelled', 'rejected'].includes(order.status);




  const getTimelineSteps = () => {
    if (isJasaOnly) {
      return [
        { id: 'pending', label: 'Menunggu Konfirmasi', desc: 'Pesanan sedang ditinjau oleh admin', time: order.created_at },
        { id: 'process', label: 'Pesanan Diproses', desc: 'Kurir sedang menuju lokasi penjemputan', time: order.dispatched_at },
        { id: 'completed', label: 'Selesai', desc: 'Pesanan telah selesai', time: order.completed_at },
      ];
    }
    return [
      { id: 'pending', label: 'Menunggu Konfirmasi', desc: 'Pesanan sedang ditinjau oleh admin', time: order.created_at },
      { id: 'process', label: 'Pesanan Diproses', desc: 'Kurir sedang menuju toko untuk mengambil pesanan', time: order.dispatched_at },
      { id: 'on_delivery', label: 'Dalam Pengiriman', desc: 'Belanjaan sedang diantar ke rumahmu', time: (order.bill_sent && order.updated_at) ? order.updated_at : null },
      { id: 'completed', label: 'Selesai', desc: 'Pesanan telah diterima', time: order.completed_at },
    ];
  };

  const steps = getTimelineSteps();
  let mappedStatus = order.status;
  if (mappedStatus === 'pending' && order.assigned_courier_id) {
    mappedStatus = 'process';
  }

  // Jasa Saja (Ojek/Kirim): Tidak ada step "on_delivery", langsung "process" lalu "completed"
  if (isJasaOnly) {
    if (['admin_accepted', 'on_delivery', 'delivering', 'process', 'processing'].includes(mappedStatus)) {
      mappedStatus = 'process';
    }
  } else {
    // Belanja/Jastip: Ada step "on_delivery"
    if (['admin_accepted', 'merchant_accepted', 'process', 'processing'].includes(mappedStatus)) {
      mappedStatus = 'process';
    } else if (['on_delivery', 'delivering'].includes(mappedStatus)) {
      mappedStatus = 'on_delivery';
    }
  }

  // Determine active step index
  const statusHierarchy = steps.map(s => s.id);
  let currentIndex = statusHierarchy.indexOf(mappedStatus);

  // If status is not in the normal flow (e.g. cancelled)
  if (isCancelled) currentIndex = -1;

  const getServiceIcon = () => {
    switch (order.tipe_layanan) {
      case 'Belanja': return <img src="/icon-belanja.webp" alt="Belanja" className="w-8 h-8 object-contain drop-shadow-sm" />;
      case 'Jastip': return <ShoppingBag size={28} className="text-gray-800" />;
      case 'Antar Jemput': return <img src="/icon-ojek.webp" alt="Antar Jemput" className="w-8 h-8 object-contain drop-shadow-sm" />;
      case 'Kirim Barang': return <img src="/icon-kirim-barang.webp" alt="Kirim Barang" className="w-8 h-8 object-contain drop-shadow-sm" />;
      default: return <Package size={28} className="text-gray-800" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' pukul', ',');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32 font-sans">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full active:scale-95 transition-all text-gray-700">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">Detail Pesanan</h1>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">#{order.id.toString().substring(0, 8)}</div>
      </div>

      <div className="pb-4 space-y-3">
        {/* Banner Info */}
        <div className="bg-white px-5 py-4 border-b-8 border-gray-50 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center border border-blue-100/50 shrink-0">
                {getServiceIcon()}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Layanan</p>
                <h2 className="text-base font-bold text-gray-900 leading-none">{order.tipe_layanan}</h2>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-800 mb-0.5">
                {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[11px] font-medium text-gray-500">
                {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </p>
            </div>
          </div>
        </div>

        {/* Tracking Timeline */}
        {isCancelled ? (() => {
          const isCancelledByCustomer = order.kendala_info?.toLowerCase().startsWith('dibatalkan customer:');
          const isCancelledByAdmin = order.kendala_info?.toLowerCase().startsWith('dibatalkan admin:');

          let cancelTitle = "Pesanan Dibatalkan";
          let cancelSubtitle = "Pesanan ini telah dibatalkan atau ditolak.";

          if (isCancelledByCustomer) {
            cancelTitle = "Kamu telah membatalkan pesanan ini";
            cancelSubtitle = null;
          } else if (isCancelledByAdmin) {
            cancelTitle = "Pesananmu dibatalkan admin";
            cancelSubtitle = null;
          }

          return (
            <div className="mx-4 bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3 shadow-sm">
              <XCircle size={24} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-red-600">{cancelTitle}</p>
                {cancelSubtitle && (
                  <p className="text-xs text-red-500 mt-1">{cancelSubtitle}</p>
                )}
                {order.kendala_info && (
                  <div className="mt-3 p-3 bg-red-100/50 rounded-xl border border-red-200">
                    <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider mb-1">Alasan Pembatalan:</p>
                    <p className="text-xs text-red-700 italic">"{order.kendala_info.replace(/^Dibatalkan Customer:\s*/i, '').replace(/^Dibatalkan Admin:\s*/i, '')}"</p>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <div className="bg-white mx-4 rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Status Pesanan</h3>
            <div className="relative pl-2 space-y-6">
              {showAllStatus && (
                <>
                  {/* Vertical Line */}
                  <div className="absolute left-4 top-2 bottom-4 w-0.5 bg-gray-100 -z-0"></div>
                  {/* Progress Line */}
                  {currentIndex >= 0 && (
                    <div
                      className="absolute left-4 top-2 w-0.5 bg-primary -z-0 transition-all duration-500"
                      style={{ height: `${(currentIndex / Math.max(1, steps.length - 1)) * 100}%` }}
                    ></div>
                  )}
                </>
              )}

              {(showAllStatus ? steps : [steps[Math.max(0, currentIndex)]]).map((step) => {
                const idx = steps.indexOf(step);
                const isActive = currentIndex === idx;
                const isPassed = currentIndex > idx;
                const isPending = currentIndex < idx;

                let iconBg = 'bg-gray-100 border-gray-200 text-gray-400';
                if (isActive) iconBg = 'bg-primary border-primary text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]';
                if (isPassed) iconBg = 'bg-blue-100 border-blue-500 text-primary';

                let timeText = '';
                if (isPassed || isActive) {
                  if (step.time) timeText = formatDate(step.time);
                  else if (isActive && order.updated_at) timeText = formatDate(order.updated_at);
                }

                return (
                  <div key={step.id} className="relative z-10 flex gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${iconBg}`}>
                      {(isPassed || isActive) && <Check size={10} strokeWidth={4} />}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm font-bold ${isActive ? 'text-primary' : isPassed ? 'text-gray-800' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                        {timeText && <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap ml-2">{timeText}</span>}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {steps.length > 1 && (
              <button
                onClick={() => setShowAllStatus(!showAllStatus)}
                className="w-full mt-5 py-2 border border-blue-200 rounded-xl text-primary font-bold text-sm bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all"
              >
                {showAllStatus ? 'Sembunyikan Detail Status' : 'Lihat Semua Status'}
              </button>
            )}
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white px-4 py-5 shadow-sm border-y border-gray-100">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-50">
            <Receipt size={18} className="text-primary" />
            <h3 className="font-bold text-gray-800 text-sm">Rincian Pesanan</h3>
          </div>

          <div className="space-y-4">
            {(() => {
              if (isJasaOnly) {
                if (order.tipe_layanan === 'Antar Jemput') {
                  const details = parseOjekDetails(order.raw_order_text);
                  return details ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                        <div className="flex gap-3 relative">
                          <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-gray-200 -z-0"></div>
                          <div className="flex flex-col justify-between py-1 shrink-0 z-10">
                            <div className="w-6 h-6 bg-white rounded-full border-[3px] border-primary flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            </div>
                            <div className="w-6 h-6 bg-white rounded-full border-[3px] border-red-500 flex items-center justify-center">
                              <MapPin size={10} strokeWidth={3} className="text-red-500" />
                            </div>
                          </div>
                          <div className="flex-1 space-y-5 pb-1">
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Titik Jemput</p>
                              <p className="text-sm font-medium text-gray-800 leading-snug">{details.jemput}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Titik Tujuan</p>
                              <p className="text-sm font-medium text-gray-800 leading-snug">{details.tujuan}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {details.note && details.note !== '-' && (
                        <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider mb-1">Catatan / Patokan</p>
                          <p className="text-[11px] text-orange-800 leading-relaxed italic">"{details.note}"</p>
                        </div>
                      )}
                    </div>
                  ) : <p className="text-sm text-gray-500 italic">Detail tidak tersedia</p>;
                } else if (order.tipe_layanan === 'Kirim Barang') {
                  const details = parseKirimDetails(order.raw_order_text);
                  return details ? (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                          <Package size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Barang Dikirim</p>
                          <p className="text-sm font-bold text-gray-800">{details.barang}</p>
                        </div>
                      </div>

                      <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                        <div className="flex gap-3 relative">
                          <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-gray-200 -z-0"></div>
                          <div className="flex flex-col justify-between py-1 shrink-0 z-10">
                            <div className="w-6 h-6 bg-white rounded-full border-[3px] border-primary flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            </div>
                            <div className="w-6 h-6 bg-white rounded-full border-[3px] border-red-500 flex items-center justify-center">
                              <MapPin size={10} strokeWidth={3} className="text-red-500" />
                            </div>
                          </div>
                          <div className="flex-1 space-y-5 pb-1">
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Lokasi Pengambilan</p>
                              <p className="text-sm font-medium text-gray-800 leading-snug">{details.ambil}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Lokasi Tujuan</p>
                              <p className="text-sm font-medium text-gray-800 leading-snug">{details.tujuan}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Penerima</p>
                          <p className="text-sm font-medium text-gray-800">{details.penerima}</p>
                        </div>
                        {details.note && details.note !== '-' && (
                          <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider mb-1">Catatan</p>
                            <p className="text-[11px] text-orange-800 leading-relaxed italic">"{details.note}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : <p className="text-sm text-gray-500 italic">Detail tidak tersedia</p>;
                }
              }

              // Hitung harga implicit untuk custom item jika backend belum update JSON items
              const items = order.items || [];
              const isItemCustom = (item) => item.is_custom || !item.price || item.price === 0;

              const getFinalPrice = (item) => {
                let price = item.price;
                if (item.variants && item.selectedVariants) {
                  let variantTotalPrice = 0;
                  let hasPricedVariant = false;
                  item.variants.forEach(group => {
                    if (group.has_price) {
                      const selectedLabel = item.selectedVariants[group.name];
                      const option = group.options.find(opt => opt.label === selectedLabel);
                      if (option) {
                        variantTotalPrice += (parseFloat(option.price) || 0);
                        hasPricedVariant = true;
                      }
                    }
                  });
                  if (hasPricedVariant) {
                    price = variantTotalPrice;
                  }
                }
                return parseFloat(price) || 0;
              };

              const totalNonCustom = items.reduce((acc, item) => !isItemCustom(item) ? acc + (getFinalPrice(item) * item.qty) : acc, 0);

              // Ambil harga custom dari bill_details yang diisi kurir (karena kurir tidak update order.items)
              const getCustomPriceFromBill = (itemName) => {
                if (!order.bill_details) return null;
                const lines = order.bill_details.split('\n');
                for (const line of lines) {
                  const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  // Jangan pakai ^\s*-\s* karena ternyata stringnya bisa diawali nomor urut seperti '- 2. - '
                  const regex = new RegExp(`${escapedName}.*?:\\s*Rp\\s*([\\d.,]+)`, 'i');
                  const match = line.match(regex);
                  if (match) {
                    return parseFloat(match[1].replace(/\./g, '').replace(/,/g, ''));
                  }
                }
                return null;
              };

              const itemsToShow = showAllItems ? items : items.slice(0, 3);
              const groupedItems = itemsToShow.reduce((acc, item) => {
                const mId = item.merchant_id || order.merchant_id || 'unknown';
                const mName = item.merchant_name || order.merchants?.name || 'Toko Lainnya';
                const mPhoto = item.merchant_image_url || order.merchants?.logo_url || null;
                if (!acc[mId]) acc[mId] = { id: mId, name: mName, photo: mPhoto, items: [] };
                acc[mId].items.push(item);
                return acc;
              }, {});

              const renderedGroups = Object.values(groupedItems).map((group, groupIdx) => (
                <div key={group.id !== 'unknown' ? group.id : groupIdx} className="mb-6 last:mb-0">
                  {/* Merchant Header */}
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      {group.photo ? (
                        <img src={group.photo} alt={group.name} className="w-5 h-5 rounded-md object-cover border border-gray-100" />
                      ) : (
                        <Store size={16} className="text-primary" />
                      )}
                      <span className="font-bold text-gray-800 text-sm">{group.name}</span>
                    </div>
                    {/* Rating Button / Stars */}
                    {order.status === 'completed' && group.id !== 'unknown' && (
                      (() => {
                        const merchantRating = orderRatings.find(r => r.target_id === group.id && r.target_type === 'merchant');
                        return merchantRating ? (
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={16} className={i < (merchantRating.rating || 5) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 cursor-pointer">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={20}
                                className="text-gray-300 hover:fill-yellow-400 hover:text-yellow-400 transition-colors"
                                onClick={() => openRatingModal(group.id, 'merchant', group.name, i + 1)}
                              />
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>

                  <div className="space-y-4">
                    {group.items.map((item, idx) => {
                      const isCustom = isItemCustom(item);
                      // Jika isCustom dan harga di JSON 0, kita ambil dari bill_details
                      let displayPrice = getFinalPrice(item);
                      if (isCustom && displayPrice === 0) {
                        const billPrice = getCustomPriceFromBill(item.name);
                        if (billPrice !== null) {
                          displayPrice = billPrice;
                        }
                      }

                      const priceIsWaiting = isCustom && displayPrice === 0;
                      const productRating = orderRatings.find(r => r.target_type === 'product' && r.target_id === item.id);

                      return (
                        <div key={idx} className="flex gap-3 items-start">
                          {!isJasaOnly && (!isCustom || (isCustom && item.image_url)) && (
                            <div className="w-14 h-14 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100 relative group">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Package size={16} />
                                </div>
                              )}
                              {order.status === 'completed' && !isCustom && (
                                <div
                                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  onClick={() => {
                                    if (!productRating) {
                                      openRatingModal(item.id, 'product', item.name);
                                    }
                                  }}
                                >
                                  <Star size={20} className={productRating ? "fill-yellow-400 text-yellow-400" : "text-white"} />
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="pr-3">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                                  {productRating && (
                                    <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-600">
                                      <Star size={10} className="fill-yellow-500" />
                                      {productRating.rating}
                                    </div>
                                  )}
                                </div>
                                {isCustom && (
                                  <div className="mt-0.5">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${priceIsWaiting ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                      {priceIsWaiting ? "Harga akan diinput kurir" : "Kurir sudah update harga barang"}
                                    </span>
                                  </div>
                                )}
                                {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                  <p className="text-[10px] text-gray-500 mt-1">Varian: {Object.values(item.selectedVariants).join(', ')}</p>
                                )}
                                {!isJasaOnly && (
                                  <p className="text-[11px] text-gray-500 mt-1">
                                    {priceIsWaiting ? `${item.qty}x` : `${item.qty}x Rp ${displayPrice.toLocaleString('id-ID')}`}
                                  </p>
                                )}
                              </div>
                              <p className="font-bold text-gray-900 text-sm whitespace-nowrap">
                                {!isJasaOnly && (priceIsWaiting ? <span className="text-orange-500 text-[11px] italic">Menyusul</span> : `Rp ${(displayPrice * item.qty).toLocaleString('id-ID')}`)}
                              </p>
                            </div>
                            {/* {isCustom && !priceIsWaiting && (
                              <p className="text-[10px] text-green-600 italic mt-0.5">Harga sudah diupdate kurir</p>
                            )} */}
                            {item.note && (
                              <div className="mt-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                                <p className="text-[10px] text-gray-600 italic">" {item.note} "</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));

              return (
                <>
                  {renderedGroups}
                  {items.length > 3 && (
                    <button
                      onClick={() => setShowAllItems(!showAllItems)}
                      className="w-full mt-4 py-2 border border-blue-200 rounded-xl text-primary font-bold text-sm bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all"
                    >
                      {showAllItems ? 'Sembunyikan' : `Lihat Semua (${items.length} Produk)`}
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Delivery & Address */}
          {!isJasaOnly && (
            <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
              <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Lokasi Pengiriman</h4>
              <div className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed">{order.customer_address || 'Tidak ada alamat'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Billing Summary */}
        <div className="bg-white mx-4 rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-3">Ringkasan Pembayaran</h3>
          {(() => {
            const items = order.items || [];
            const isItemCustom = (item) => item.is_custom || !item.price || item.price === 0;
            const customItemsCount = items.filter(item => isItemCustom(item)).length;
            const totalNonCustom = items.reduce((acc, item) => !isItemCustom(item) ? acc + ((item.price || 0) * item.qty) : acc, 0);

            return (
              <>
                <div className="space-y-2 mb-3 pb-3 border-b border-gray-50">
                  {!isJasaOnly && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal Produk</span>
                      <span className="font-semibold">
                        {order.total_price
                          ? `Rp ${parseFloat(order.total_price).toLocaleString('id-ID')}`
                          : (customItemsCount > 0 && totalNonCustom === 0)
                            ? <span className="text-orange-500 italic text-[11px]">Menyusul</span>
                            : `Rp ${totalNonCustom.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Ongkos Kirim</span>
                    <span className="font-semibold">{order.delivery_fee ? `Rp ${order.delivery_fee.toLocaleString('id-ID')}` : <span className="text-orange-500 italic text-[11px]">Dihitung Kurir</span>}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">Total Pembayaran</span>
                  <span className="font-bold text-primary text-lg">
                    {order.total_price && order.total_price > 0
                      ? `Rp ${(parseFloat(order.total_price) + (order.delivery_fee || 0)).toLocaleString('id-ID')}`
                      : (customItemsCount === 0 && totalNonCustom > 0)
                        ? `Rp ${(totalNonCustom + (order.delivery_fee || 0)).toLocaleString('id-ID')}`
                        : <span className="text-orange-500 text-sm italic">Menyusul</span>}
                  </span>
                </div>
              </>
            );
          })()}
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
            <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 leading-relaxed">
              {isJasaOnly
                ? "Pembayaran dilakukan secara tunai (CASH) atau Transfer ke akun kurir."
                : "Pembayaran dilakukan secara tunai (CASH) atau Transfer ke akun kurir. Lakukan saat kurir tiba di lokasi anda dan pastikan periksa terlebih dahulu kelengkapan belanjaannya."}
            </p>
          </div>
        </div>

        {/* Courier Info */}
        {!isCancelled && order.assigned_courier_id && (
          <div className="bg-white mx-4 rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Informasi Kurir</h3>
              {order.status === 'completed' && (
                (() => {
                  const courierRating = orderRatings.find(r => r.target_type === 'courier');
                  return courierRating ? (
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className={i < (courierRating.rating || 5) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 cursor-pointer">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={20}
                          className="text-gray-300 hover:fill-yellow-400 hover:text-yellow-400 transition-colors"
                          onClick={() => openRatingModal(order.assigned_courier_id, 'courier', order.employees?.full_name || 'Kurir', i + 1)}
                        />
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-gray-200 bg-gray-100 relative">
                <img src="/icon-avatar-kurir.webp" alt="Kurir" className="w-full h-full object-cover relative z-10" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                <Motorbike size={20} className="text-gray-400 absolute" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{order.employees?.full_name || 'Menunggu Kurir...'}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                    Mitra TutahTitah
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReportTargetId(order.assigned_courier_id);
                    setReportTargetType('courier');
                    setReportTargetName(order.employees?.full_name || 'Kurir');
                    setShowReportModal(true);
                  }}
                  className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center border border-red-100 hover:bg-red-100 active:scale-90 transition-all shrink-0"
                  title="Laporkan Kurir"
                >
                  <Flag size={18} />
                </button>
                <button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      toast.error("Silakan login dulu untuk chat");
                      return;
                    }

                    const { data: existingChat } = await supabase
                      .from('chats')
                      .select('id')
                      .eq('customer_id', user.id)
                      .eq('participant_id', order.assigned_courier_id)
                      .eq('order_id', order.id)
                      .eq('chat_type', 'courier')
                      .limit(1)
                      .maybeSingle();

                    if (existingChat) {
                      navigate(`/chat/${existingChat.id}`);
                    } else {
                      const { data: newChat, error } = await supabase
                        .from('chats')
                        .insert({
                          chat_type: 'courier',
                          customer_id: user.id,
                          participant_id: order.assigned_courier_id,
                          order_id: order.id
                        })
                        .select()
                        .single();

                      if (newChat && !error) {
                        navigate(`/chat/${newChat.id}`);
                      } else {
                        toast.error("Gagal membuat obrolan dengan kurir");
                      }
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-blue-50 text-primary flex items-center justify-center border border-blue-100 hover:bg-blue-100 active:scale-90 transition-all shrink-0"
                >
                  <MessageSquare size={18} />
                </button>
              </div>
            </div>

            {order.employees && (order.employees.bank_name || order.employees.bank_name_2) && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2">Informasi Transfer Rekening / E-Wallet</p>
                <div className="space-y-2">
                  {order.employees.bank_name && order.employees.account_number && (
                    <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">{order.employees.bank_name}</p>
                        <p className="text-xs font-bold text-gray-800 tracking-wide">{order.employees.account_number}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(order.employees.account_number);
                          toast.success(`Nomor ${order.employees.bank_name} disalin!`, { id: 'copy-1' });
                        }}
                        className="text-primary hover:bg-blue-50 p-1.5 rounded-md transition-colors flex items-center gap-1 border border-transparent hover:border-blue-100"
                      >
                        <Copy size={14} />
                        <span className="text-[10px] font-bold">Salin</span>
                      </button>
                    </div>
                  )}
                  {order.employees.bank_name_2 && order.employees.account_number_2 && (
                    <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">{order.employees.bank_name_2}</p>
                        <p className="text-xs font-bold text-gray-800 tracking-wide">{order.employees.account_number_2}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(order.employees.account_number_2);
                          toast.success(`Nomor ${order.employees.bank_name_2} disalin!`, { id: 'copy-2' });
                        }}
                        className="text-primary hover:bg-blue-50 p-1.5 rounded-md transition-colors flex items-center gap-1 border border-transparent hover:border-blue-100"
                      >
                        <Copy size={14} />
                        <span className="text-[10px] font-bold">Salin</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {order.status === 'pending' && !isCancelled && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40">
          <button
            onClick={handleCancelOrder}
            disabled={loading}
            className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl border border-red-200 transition-colors active:scale-95"
          >
            Batalkan Pesanan
          </button>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg">Batalkan Pesanan</h3>
              <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Alasan Pembatalan</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ceritain dong kenapa pesanannya dibatalin..."
                  className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all resize-none h-24"
                ></textarea>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={submitCancelOrder}
                  disabled={cancelLoading}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                >
                  {cancelLoading ? (
                    <div className="animate-spin text-white">
                      <Clock size={18} />
                    </div>
                  ) : 'Batalkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={(success) => {
          setShowRatingModal(false);
          if (success) {
            fetchOrder();
          }
        }}
        orderId={order.id}
        targetId={ratingTargetId}
        targetType={ratingTargetType}
        targetName={ratingTargetName}
        customerId={customerProfileId || user?.id}
        initialRating={ratingInitialValue}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetId={reportTargetId}
        targetType={reportTargetType}
        customerId={user?.id}
        targetName={reportTargetName}
      />
    </div>
  );
}

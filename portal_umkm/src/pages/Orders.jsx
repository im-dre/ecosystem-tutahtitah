 import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import OrderDetailModal from '../components/modals/OrderDetailModal';

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
const PRODUCT_IMAGE_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='8' fill='%23f3f4f6'/%3E%3Cpath d='M12 16h24v18H12z' fill='%23d1d5db'/%3E%3Ccircle cx='19' cy='22' r='3' fill='%239ca3af'/%3E%3Cpath d='m14 31 7-7 5 5 3-3 5 5z' fill='%239ca3af'/%3E%3C/svg%3E";

const getVariantLabel = (orderItems, productId) => {
  const matchingItem = Array.isArray(orderItems)
    ? orderItems.find((item) => item.product_id === productId || item.id === productId)
    : null;
  const selections = matchingItem?.selectedVariants || matchingItem?.selected_variants?.selections;

  if (!selections || typeof selections !== 'object' || Array.isArray(selections)) return null;

  const variants = Object.entries(selections)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}: ${value}`);

  return variants.length > 0 ? variants.join(', ') : null;
};

export default function Orders() {
  const { merchant } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [unreadChats, setUnreadChats] = useState({});
  const [modalMode, setModalMode] = useState('detail');
  const [activeTab, setActiveTab] = useState('proses');

  useEffect(() => {
    if (!merchant) return;

    const fetchOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, merchant_id, status, is_deleted, created_at, customer_name, customer_wa, customer_address, raw_order_text, items, image_url, tipe_layanan, total_price, total_amount, delivery_fee, assigned_courier_id, bill_details, bill_sent, completed_at, dispatched_at, failed_couriers, is_favorite, kendala_info, order_items(id, product_id, quantity, subtotal, products(name, image_url))')
        .eq('merchant_id', merchant.id)
        .neq('is_deleted', true)
        .order('id', { ascending: false })
        .limit(100);

      if (error) {
        toast.error('Gagal mengambil pesanan');
        console.error(error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };

    const fetchUnreadCounts = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('chat_id, chats!inner(order_id, participant_id)')
        .eq('is_read', false)
        .eq('sender_type', 'customer')
        .eq('chats.participant_id', merchant.id)
        .limit(1000);

      if (error) {
        console.error('Gagal mengambil jumlah chat belum dibaca:', error);
        return;
      }

      const counts = {};
      (data || []).forEach((message) => {
        const orderId = message.chats?.order_id;
        if (orderId) counts[orderId] = (counts[orderId] || 0) + 1;
      });
      setUnreadChats(counts);
    };

    fetchOrders();
    fetchUnreadCounts();

    // Set up real-time subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new, ...prev]);
            toast.success(`Pesanan Baru Masuk! (ID: ${payload.new.id.toString().substring(0,8)})`, {
              icon: '🛎️',
              style: { borderRadius: '12px', background: '#333', color: '#fff' }
            });
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_deleted === true) {
              setOrders((prev) => prev.filter((order) => order.id !== payload.new.id));
              return;
            }
            setOrders((prev) =>
              prev.map((order) => (order.id === payload.new.id ? payload.new : order))
            );
            toast.success(`Status Pesanan ${payload.new.id.toString().substring(0,8)} berubah jadi ${payload.new.status}`);
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`merchant-unread-messages-${merchant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => { void fetchUnreadCounts(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(messagesChannel);
    };
  }, [merchant]);

  const handleOpenOrderModal = (order, mode) => {
    setSelectedOrder(order);
    setModalMode(mode);

    if (mode !== 'chat' || unreadChats[order.id] <= 0) return;

    setUnreadChats((previous) => ({ ...previous, [order.id]: 0 }));
  };

  const handleAcceptOrder = async (order) => {
    if (order.status !== 'pending' || processingOrderId === order.id) return;

    const { isConfirmed } = await Swal.fire({
      title: 'Terima pesanan ini?',
      text: 'Pesanan akan dipindahkan ke tahap persiapan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Terima & Siapkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#94a3b8'
    });

    if (!isConfirmed) return;

    setProcessingOrderId(order.id);
    setOrders((previous) => previous.map((item) => (
      item.id === order.id ? { ...item, status: 'processing' } : item
    )));

    const { error } = await supabase.rpc('merchant_accept_order', {
      p_order_id: order.id
    });

    if (error) {
      setOrders((previous) => previous.map((item) => (
        item.id === order.id ? { ...item, status: 'pending' } : item
      )));
      toast.error(error.message || 'Gagal menerima pesanan');
    } else {
      toast.success('Pesanan diterima dan siap diproses.');
    }
    setProcessingOrderId(null);
  };

  const handleRejectOrder = async (order) => {
    if (order.status !== 'pending' || processingOrderId === order.id) return;

    const { value: alasanTolak } = await Swal.fire({
      title: 'Tolak pesanan?',
      text: 'Berikan alasan agar pelanggan mendapat informasi yang jelas.',
      input: 'textarea',
      inputPlaceholder: 'Contoh: Stok habis',
      inputAttributes: { 'aria-label': 'Alasan penolakan pesanan' },
      showCancelButton: true,
      confirmButtonText: 'Tolak Pesanan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#94a3b8',
      inputValidator: (value) => {
        if (!value?.trim()) return 'Alasan penolakan wajib diisi.';
        return undefined;
      }
    });

    if (!alasanTolak?.trim()) return;

    setProcessingOrderId(order.id);
    setOrders((previous) => previous.map((item) => (
      item.id === order.id ? { ...item, status: 'cancelled' } : item
    )));

    const { error } = await supabase.rpc('merchant_reject_order', {
      p_order_id: order.id,
      p_alasan: alasanTolak.trim()
    });

    if (error) {
      setOrders((previous) => previous.map((item) => (
        item.id === order.id ? { ...item, status: 'pending' } : item
      )));
      toast.error(error.message || 'Gagal menolak pesanan');
    } else {
      toast.success('Pesanan ditolak dengan alasan yang tersimpan.');
    }
    setProcessingOrderId(null);
  };

  const filteredOrders = orders.filter((order) => {
    const processStatuses = ['pending', 'processing', 'delivering', 'hold', 'waiting_customer'];
    const completedStatuses = ['completed', 'cancelled'];

    return activeTab === 'proses'
      ? processStatuses.includes(order.status)
      : completedStatuses.includes(order.status);
  });

  if (merchant?.status !== 'approved') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-full">
        <i className="ph-fill ph-lock-key text-6xl text-gray-300 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Fitur Terkunci</h3>
        <p className="text-gray-500 max-w-sm">Halaman pesanan hanya dapat diakses oleh toko yang telah diverifikasi oleh admin.</p>
      </div>
    );
  }

  return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-50/90 backdrop-blur-md pb-4 pt-4 mb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-gray-100 flex flex-col md:flex-row md:justify-between md:items-end gap-2 shadow-sm md:shadow-none">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Daftar Pesanan</h2>
          <p className="text-sm text-gray-500 mt-1">Pantau pesanan masuk secara real-time.</p>
          <div className="mt-4 inline-flex rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Status pesanan">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'proses'}
              onClick={() => setActiveTab('proses')}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-all sm:px-4 ${activeTab === 'proses'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Sedang Proses
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'selesai'}
              onClick={() => setActiveTab('selesai')}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-all sm:px-4 ${activeTab === 'selesai'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Riwayat Selesai
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full w-fit">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Live Update Aktif
        </div>
      </div>
      
      {/* Order List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ph ph-spinner-gap animate-spin text-4xl text-brand-500 mb-4"></i>
          <p className="text-gray-500 font-medium">Memuat pesanan...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
             <i className="ph-fill ph-receipt text-5xl text-gray-300"></i>
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-2">
             {activeTab === 'proses' ? 'Belum ada pesanan yang diproses' : 'Belum ada riwayat pesanan'}
           </h3>
           <p className="text-gray-500 max-w-sm mx-auto">
             {activeTab === 'proses'
               ? 'Pesanan yang masuk akan otomatis muncul di sini tanpa perlu me-refresh halaman.'
               : 'Pesanan yang sudah selesai atau dibatalkan akan muncul di sini.'}
           </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'pending';
            const isCompleted = order.status === 'completed';
            const isCancelled = order.status === 'cancelled';
            const statusColor = isPending ? 'text-accent-600 bg-accent-100' : isCompleted ? 'text-green-600 bg-green-100' : isCancelled ? 'text-red-600 bg-red-100' : 'text-gray-600 bg-gray-100';
            const statusIcon = isPending ? 'ph-clock-countdown' : isCompleted ? 'ph-check-circle' : isCancelled ? 'ph-x-circle' : 'ph-question';
            const statusText = isPending ? 'Menunggu' : isCompleted ? 'Selesai' : isCancelled ? 'Dibatalkan' : order.status;
            const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
            const itemsTotal = orderItems.reduce((total, item) => total + Number(item.subtotal || 0), 0);

            return (
              <div key={order.id} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden transition-all hover:border-brand-200">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-400 mb-1">ID Pesanan</span>
                    <span className="text-sm font-black text-gray-900 uppercase">#{order.id.toString().substring(0,8)}...</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusColor}`}>
                    <i className={`ph-fill ${statusIcon}`}></i>
                    <span>{statusText}</span>
                  </div>
                </div>
                
                <div className="border-t border-dashed border-gray-200 pt-3 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                  <div className="w-full space-y-2">
                    {orderItems.length > 0 ? (
                      <>
                        {orderItems.map((item) => {
                          const variantLabel = getVariantLabel(order.items, item.product_id);

                          return (
                            <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
                              <div className="flex min-w-0 items-start gap-3">
                                <img
                                  src={item.products?.image_url || PRODUCT_IMAGE_FALLBACK}
                                  alt={item.products?.name ? `Produk ${item.products.name}` : 'Produk tidak tersedia'}
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = PRODUCT_IMAGE_FALLBACK;
                                  }}
                                  className="h-12 w-12 shrink-0 rounded-md object-cover bg-gray-100"
                                />
                                <div className="min-w-0">
                                <p className="font-bold text-gray-800">{item.products?.name || 'Produk tidak tersedia'}</p>
                                {variantLabel && <p className="mt-0.5 text-gray-500">Varian: {variantLabel}</p>}
                                <p className="mt-0.5 text-gray-500">x{item.quantity}</p>
                                </div>
                              </div>
                              <p className="shrink-0 font-bold text-gray-800">{formatCurrency(item.subtotal)}</p>
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm">
                          <span className="font-bold text-gray-500">Total Pesanan</span>
                          <span className="font-black text-brand-600">{formatCurrency(itemsTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs font-medium text-gray-500">Belum ada item produk pada pesanan ini.</p>
                    )}
                  </div>
                  {isPending ? (
                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => handleAcceptOrder(order)}
                          disabled={processingOrderId === order.id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-sm shadow-green-200"
                        >
                          {processingOrderId === order.id && <i className="ph ph-spinner-gap animate-spin"></i>}
                          Terima & Siapkan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectOrder(order)}
                          disabled={processingOrderId === order.id}
                          className="bg-red-50 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed text-red-600 border border-red-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <i className="ph ph-x-circle"></i>
                          Tolak Pesanan
                        </button>
                      </div>
                      <div className="flex w-full gap-2 sm:w-auto">
                        <button type="button" onClick={() => handleOpenOrderModal(order, 'chat')} className="relative flex-1 rounded-xl border border-brand-100 bg-blue-50 py-2 text-xs font-bold text-brand-600 transition-colors hover:bg-blue-100 sm:px-4">
                          <i className="ph-fill ph-chat-teardrop-text mr-1.5 text-sm"></i>
                          Chat
                          {unreadChats[order.id] > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-sm animate-pulse">{unreadChats[order.id]}</span>}
                        </button>
                        <button type="button" onClick={() => { setSelectedOrder(order); setModalMode('detail'); }} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50">
                          Detail
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full gap-2 sm:w-auto">
                      <button type="button" onClick={() => handleOpenOrderModal(order, 'chat')} className="relative flex-1 rounded-xl border border-brand-100 bg-blue-50 py-2 text-xs font-bold text-brand-600 transition-colors hover:bg-blue-100 sm:px-4">
                        <i className="ph-fill ph-chat-teardrop-text mr-1.5 text-sm"></i>
                        Chat
                        {unreadChats[order.id] > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-sm animate-pulse">{unreadChats[order.id]}</span>}
                      </button>
                      <button type="button" onClick={() => { setSelectedOrder(order); setModalMode('detail'); }} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50">
                        Detail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} viewMode={modalMode} />
    </div>
  );
}

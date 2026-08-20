import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function Orders() {
  const { merchant } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchant) return;

    const fetchOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', merchant.id)
        .neq('is_deleted', true)
        .order('id', { ascending: false });

      if (error) {
        toast.error('Gagal mengambil pesanan');
        console.error(error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };

    fetchOrders();

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchant]);

  if (merchant?.status !== 'VERIFIED') {
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
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
             <i className="ph-fill ph-receipt text-5xl text-gray-300"></i>
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-2">Belum ada pesanan</h3>
           <p className="text-gray-500 max-w-sm mx-auto">Pesanan yang masuk akan otomatis muncul di sini tanpa perlu me-refresh halaman.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isPending = order.status === 'pending';
            const isCompleted = order.status === 'completed';
            const isCancelled = order.status === 'cancelled';
            const statusColor = isPending ? 'text-accent-600 bg-accent-100' : isCompleted ? 'text-green-600 bg-green-100' : isCancelled ? 'text-red-600 bg-red-100' : 'text-gray-600 bg-gray-100';
            const statusIcon = isPending ? 'ph-clock-countdown' : isCompleted ? 'ph-check-circle' : isCancelled ? 'ph-x-circle' : 'ph-question';
            const statusText = isPending ? 'Menunggu' : isCompleted ? 'Selesai' : isCancelled ? 'Dibatalkan' : order.status;

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
                
                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-end">
                  <p className="text-xs text-gray-500 font-medium">Detail pesanan akan segera tersedia</p>
                  <button className="bg-brand-50 hover:bg-brand-100 text-brand-600 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                    Lihat Detail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

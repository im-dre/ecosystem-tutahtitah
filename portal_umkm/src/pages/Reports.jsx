import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, parseISO, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

export default function Reports() {
  const { merchant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rawOrders, setRawOrders] = useState([]);

  // Native Android States
  const [filterType, setFilterType] = useState('7');
  const [showModal, setShowModal] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');

  // 1. DYNAMIC SERVER-SIDE FETCHING
  useEffect(() => {
    if (!merchant?.id || merchant.status !== 'approved') return;
    if (filterType === 'custom' && (!appliedCustomStart || !appliedCustomEnd)) return;

    const fetchReportData = async () => {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select('id, created_at, status, total_price, total_amount, order_items(id, product_id, quantity, subtotal, products(name))')
        .eq('merchant_id', merchant.id);

      if (filterType === '7') {
        query = query.gte('created_at', startOfDay(subDays(new Date(), 7)).toISOString());
      } else if (filterType === '30') {
        query = query.gte('created_at', startOfDay(subDays(new Date(), 30)).toISOString());
      } else if (filterType === 'custom') {
        query = query
          .gte('created_at', startOfDay(new Date(appliedCustomStart)).toISOString())
          .lte('created_at', endOfDay(new Date(appliedCustomEnd)).toISOString());
      }

      const { data, error } = await query;
      if (error) console.error('Gagal mengambil data laporan:', error);
      else setRawOrders(data || []);

      setLoading(false);
    };

    fetchReportData();
  }, [merchant?.id, merchant?.status, filterType, appliedCustomStart, appliedCustomEnd]);

  // 2. DATA PROCESSING (DYNAMIC DATES)
  const { metrics, chartData, topProducts } = useMemo(() => {
    const completedOrders = rawOrders.filter((order) => order.status === 'completed');
    const cancelledOrders = rawOrders.filter((order) => order.status === 'cancelled');

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total_price || order.total_amount || 0),
      0
    );
    const totalOrders = completedOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const dailyData = {};
    completedOrders.forEach((order) => {
      const rawDate = parseISO(order.created_at);
      const dateLabel = filterType === 'all' || filterType === 'custom'
        ? format(rawDate, 'dd MMM yy', { locale: id })
        : format(rawDate, 'dd MMM', { locale: id });

      if (!dailyData[dateLabel]) {
        dailyData[dateLabel] = {
          date: dateLabel,
          omset: 0,
          pesanan: 0,
          rawTimestamp: rawDate.getTime()
        };
      }
      dailyData[dateLabel].omset += Number(order.total_price || order.total_amount || 0);
      dailyData[dateLabel].pesanan += 1;
    });

    const sortedChartData = Object.values(dailyData).sort((a, b) => a.rawTimestamp - b.rawTimestamp);

    const productMap = {};
    completedOrders.forEach((order) => {
      if (Array.isArray(order.order_items)) {
        order.order_items.forEach((item) => {
          const productName = item.products?.name || 'Produk Tidak Dikenal';
          if (!productMap[productName]) {
            productMap[productName] = { name: productName, qty: 0, revenue: 0 };
          }
          productMap[productName].qty += Number(item.quantity || 0);
          productMap[productName].revenue += Number(item.subtotal || 0);
        });
      }
    });

    const sortedTopProducts = Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      metrics: {
        revenue: totalRevenue,
        orders: totalOrders,
        cancelled: cancelledOrders.length,
        aov: avgOrderValue
      },
      chartData: sortedChartData,
      topProducts: sortedTopProducts
    };
  }, [rawOrders, filterType]);

  const handleApplyCustomDate = () => {
    if (customStart && customEnd) {
      setAppliedCustomStart(customStart);
      setAppliedCustomEnd(customEnd);
      setFilterType('custom');
      setShowModal(false);
    }
  };

  if (merchant?.status !== 'approved') return null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-2xl">
          <p className="font-bold text-gray-800 text-xs mb-1">{label}</p>
          <p className="text-brand-600 font-black text-sm">{formatCurrency(payload[0].value)}</p>
          <p className="text-gray-500 text-xs mt-0.5">{payload[0].payload.pesanan} Pesanan</p>
        </div>
      );
    }
    return null;
  };

  // 3. UI RENDER (MATERIAL DESIGN VIBES)
  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-24 md:p-8 space-y-6 overflow-x-hidden w-full">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Performa Toko</h2>
          <p className="text-sm text-gray-500 mt-1">Pantau omset dan produk terlaris Anda.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: '7', label: '7 Hari' },
            { id: '30', label: '30 Hari' },
            { id: 'all', label: 'Semua' },
            { id: 'custom', label: 'Custom' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.id === 'custom' ? setShowModal(true) : setFilterType(tab.id)}
              className={`shrink-0 rounded-full px-5 py-2 text-xs font-bold transition-all active:scale-95 ${
                filterType === tab.id
                  ? 'bg-gray-900 text-white shadow-md shadow-gray-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.id === 'custom' && filterType === 'custom' && appliedCustomStart
                ? `${format(new Date(appliedCustomStart), 'dd/MM/yy')} - ${format(new Date(appliedCustomEnd), 'dd/MM/yy')}`
                : tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold text-sm">Menarik data server...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] active:scale-[0.98] transition-transform">
              <div className="flex flex-col gap-1"><span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Omset</span><div className="text-lg md:text-2xl font-black text-gray-900 leading-tight truncate">{formatCurrency(metrics.revenue)}</div></div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] active:scale-[0.98] transition-transform">
              <div className="flex flex-col gap-1"><span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Pesanan</span><div className="text-lg md:text-2xl font-black text-gray-900 leading-tight truncate">{metrics.orders}</div></div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] active:scale-[0.98] transition-transform">
              <div className="flex flex-col gap-1"><span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Rata-rata</span><div className="text-lg md:text-2xl font-black text-gray-900 leading-tight truncate">{formatCurrency(metrics.aov)}</div></div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-red-50 shadow-[0_2px_10px_rgb(239,68,68,0.05)] active:scale-[0.98] transition-transform">
              <div className="flex flex-col gap-1"><span className="text-[10px] md:text-xs font-bold text-red-400 uppercase tracking-wider">Batal</span><div className="text-lg md:text-2xl font-black text-red-600 leading-tight truncate">{metrics.cancelled}</div></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] min-w-0">
              <h3 className="text-sm font-black text-gray-900 mb-6">Tren Pendapatan</h3>
              <div className="h-[250px] w-full overflow-hidden">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="99%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} tickFormatter={(value) => `Rp ${value / 1000}k`} width={60} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 2, strokeDasharray: '4 4' }} />
                      <Line type="monotone" dataKey="omset" stroke="#0ea5e9" strokeWidth={4} dot={false} activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold">Belum ada data di rentang ini.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col">
              <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><i className="ph-fill ph-fire text-orange-500 text-lg"></i>Produk Terlaris</h3>
              {topProducts.length > 0 ? (
                <div className="space-y-4 flex-1">
                  {topProducts.map((prod, index) => (
                    <div key={index} className="flex justify-between items-center gap-3 active:scale-95 transition-transform bg-gray-50/50 p-2.5 rounded-2xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] font-black text-gray-600">{index + 1}</div>
                        <div className="min-w-0"><p className="text-xs font-bold text-gray-800 truncate max-w-[120px] sm:max-w-[150px]">{prod.name}</p><p className="text-[10px] text-gray-500 font-medium">{prod.qty} Terjual</p></div>
                      </div>
                      <div className="text-xs font-black text-brand-600 whitespace-nowrap">{formatCurrency(prod.revenue)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center pb-4"><i className="ph-fill ph-package text-4xl text-gray-200 mb-2"></i><p className="text-xs text-gray-500 font-medium">Belum ada data penjualan.</p></div>
              )}
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl transform transition-transform animate-slide-up">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden"></div>
            <h3 className="text-lg font-black text-gray-900 mb-6">Pilih Rentang Waktu</h3>
            <div className="space-y-4 mb-8">
              <div><label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Dari Tanggal</label><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium transition-all" /></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Sampai Tanggal</label><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium transition-all" /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Batal</button>
              <button onClick={handleApplyCustomDate} disabled={!customStart || !customEnd} className="flex-1 px-4 py-3.5 bg-brand-600 disabled:bg-gray-300 text-white rounded-2xl font-bold text-sm shadow-[0_4px_12px_rgb(0,74,173,0.2)] active:scale-95 transition-transform">Terapkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
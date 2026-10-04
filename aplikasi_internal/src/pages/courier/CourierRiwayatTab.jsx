import { useMemo } from "react";
import ServiceBadge from "../../components/ui/ServiceBadge";
import { calculateDuration, formatDateTime, parseKirimDetails, parseOjekDetails } from "../../utils/helpers";

// [LEVEL 3 #14] Tab Riwayat Kurir di-extract dari App.jsx.
// State filter, pagination, data riwayat, dan handler tetap di App.jsx.
export default function CourierRiwayatTab({ courierFilterPeriod, setCourierFilterPeriod, courierFilterService, setCourierFilterService, courierFilterStartDate, setCourierFilterStartDate, courierFilterEndDate, setCourierFilterEndDate, courierHistoryOrders, user, courierHistoryLimit, setCourierHistoryLimit, isFetchingHistory, loading, orderRatings }) {
    const flattenedHistory = useMemo(() => {
        if (!courierHistoryOrders || !user) return [];
        const filtered = courierHistoryOrders.filter(o => {
            if (courierFilterService !== 'all' && o.tipe_layanan !== courierFilterService) return false;
            return true;
        });

        const arr = [];
        filtered.forEach(o => {
            if (o.failed_couriers && Array.isArray(o.failed_couriers)) {
                o.failed_couriers.filter(fc => fc.id === user.id).forEach(fc => {
                    arr.push({
                        ...o,
                        _viewMode: 'failed',
                        _failedReason: fc.reason,
                        _actionTime: fc.time || o.created_at
                    });
                });
            }
            if ((o.status === 'completed' || o.status === 'cancelled') && o.assigned_courier_id === user.id) {
                arr.push({
                    ...o,
                    _viewMode: 'final',
                    _actionTime: o.completed_at || o.created_at
                });
            }
        });
        arr.sort((a, b) => new Date(b._actionTime).getTime() - new Date(a._actionTime).getTime());
        return arr;
    }, [courierHistoryOrders, courierFilterService, user]);

    return (
<div className="flex flex-col">
                                        <div className="sticky top-0 z-30 bg-[#eef3fb]/95 backdrop-blur-md border-b-2 border-[#004aad]/10 px-4 pt-4 pb-3 flex flex-col gap-2 mb-0 shadow-[0_2px_10px_rgba(0,74,173,0.08)]">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-1 h-4 rounded-full bg-[#004aad]"></div>
                                                <span className="text-[10px] font-bold text-[#004aad] uppercase tracking-widest">Filter Riwayat</span>
                                            </div>
                                            <div className="flex gap-2 w-full">
                                                <select className="flex-1 bg-white border border-[#004aad]/20 text-gray-800 text-xs rounded-xl p-2.5 font-bold outline-none focus:border-[#004aad]" value={courierFilterPeriod} onChange={(e) => setCourierFilterPeriod(e.target.value)}>
                                                    <option value="today">Hari Ini</option><option value="week">Minggu Ini</option><option value="month">Bulan Ini</option><option value="all">Semua Waktu</option><option value="custom">Rentang Waktu</option>
                                                </select>
                                                <select className="flex-1 bg-white border border-[#004aad]/20 text-gray-800 text-xs rounded-xl p-2.5 font-bold outline-none focus:border-[#004aad]" value={courierFilterService} onChange={(e) => setCourierFilterService(e.target.value)}>
                                                    <option value="all">Semua Layanan</option>
                                                    <option value="Belanja">Belanja</option>
                                                    <option value="Antar Jemput">Antar Jemput</option>
                                                    <option value="Kirim Barang">Kirim Barang</option>
                                                </select>
                                            </div>
                                            {courierFilterPeriod === 'custom' && (
                                                <div className="flex items-center gap-2">
                                                    <input type="date" className="flex-1 bg-white border border-[#004aad]/20 text-gray-800 text-xs rounded-xl px-3 py-2.5 font-bold outline-none focus:border-[#004aad]" value={courierFilterStartDate} onChange={e => setCourierFilterStartDate(e.target.value)} />
                                                    <span className="text-[#004aad] font-bold">–</span>
                                                    <input type="date" className="flex-1 bg-white border border-[#004aad]/20 text-gray-800 text-xs rounded-xl px-3 py-2.5 font-bold outline-none focus:border-[#004aad]" value={courierFilterEndDate} onChange={e => setCourierFilterEndDate(e.target.value)} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 space-y-4">
                                            {flattenedHistory.length === 0 && !loading && (
                                                <div className="text-center p-10 bg-white rounded-2xl border border-gray-200 shadow-sm mt-4"><span className="text-5xl block mb-3 opacity-30">📭</span><span className="font-bold text-gray-500 block">Riwayat kosong untuk periode ini.</span></div>
                                            )}

                                            <div className="grid grid-cols-1 gap-4">
                                                {(() => {
                                                    return (<>
                                                        {isFetchingHistory ? (
                                                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 col-span-full">
                                                                <div className="w-10 h-10 border-4 border-gray-200 border-t-[#004aad] rounded-full animate-spin mb-4"></div>
                                                                <p className="font-bold text-sm">Memuat Riwayat...</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                        {flattenedHistory.slice(0, courierHistoryLimit).map((o, idx) => {
                                                            const isFinal = o._viewMode === 'final';
                                                            const isNyerah = o._viewMode === 'failed';
                                                            const ojekDataHistory = o.tipe_layanan === 'Antar Jemput' ? parseOjekDetails(o.raw_order_text) : null;
                                                            const kirimDataHistory = o.tipe_layanan === 'Kirim Barang' ? parseKirimDetails(o.raw_order_text) : null;
                                                            let statusLabel = '';
                                                            let statusColor = '';

                                                            if (isFinal && o.status === 'completed') {
                                                                statusLabel = 'Sukses';
                                                                statusColor = 'bg-emerald-100 text-emerald-700';
                                                            } else if (isFinal && o.status === 'cancelled') {
                                                                statusLabel = 'Batal';
                                                                statusColor = 'bg-gray-100 text-gray-700';
                                                            } else if (isNyerah) {
                                                                statusLabel = 'Gagal (Nyerah)';
                                                                statusColor = 'bg-orange-100 text-orange-700';
                                                            }

                                                            return (
                                                                <div key={`${o.id}-${idx}`} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                                                                    <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                                                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${statusColor}`}>{statusLabel}</span>
                                                                        <div className="text-right">
                                                                            <span className="text-[10px] font-bold text-gray-400 block">{formatDateTime(o._actionTime)}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mb-2"><ServiceBadge type={o.tipe_layanan} /></div>
                                                                    <p className="font-bold text-gray-800 text-sm mb-1">{o.customer_name || o.customer_wa.split('-')[0]}</p>

                                                                    {o.tipe_layanan === 'Belanja' && o.bill_details ? (
                                                                        <div className="bg-blue-50 p-2.5 rounded-lg text-[10px] font-mono border border-blue-100 mb-3 whitespace-pre-wrap text-blue-800 flex-grow shadow-inner">
                                                                            <strong className="text-blue-900 block mb-1">Rincian Belanja:</strong>{o.bill_details}
                                                                        </div>
                                                                    ) : o.tipe_layanan === 'Antar Jemput' && ojekDataHistory ? (
                                                                        <div className="mb-3 space-y-1.5 flex-grow">
                                                                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 shadow-inner">
                                                                                <p className="text-[9px] font-bold text-blue-800 uppercase mb-0.5">📍 Jemput</p>
                                                                                <p className="text-[10px] text-blue-900 font-medium line-clamp-1">{ojekDataHistory.jemput}</p>
                                                                            </div>
                                                                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 shadow-inner">
                                                                                <p className="text-[9px] font-bold text-emerald-800 uppercase mb-0.5">🏁 Tujuan</p>
                                                                                <p className="text-[10px] text-emerald-900 font-medium line-clamp-1">{ojekDataHistory.tujuan}</p>
                                                                            </div>
                                                                        </div>
                                                                    ) : o.tipe_layanan === 'Kirim Barang' && kirimDataHistory ? (
                                                                        <div className="mb-3 space-y-1.5 flex-grow">
                                                                            <div className="bg-gray-100 p-2 rounded-lg border border-gray-200 text-center shadow-inner">
                                                                                <p className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">📦 Barang</p>
                                                                                <p className="text-[10px] font-bold text-gray-800 line-clamp-1">{kirimDataHistory.barang}</p>
                                                                            </div>
                                                                            <div className="flex gap-1.5">
                                                                                <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 flex-1 shadow-inner">
                                                                                    <p className="text-[9px] font-bold text-blue-800 uppercase mb-0.5">📍 Ambil</p>
                                                                                    <p className="text-[10px] text-blue-900 font-medium line-clamp-1">{kirimDataHistory.ambil}</p>
                                                                                </div>
                                                                                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex-1 shadow-inner">
                                                                                    <p className="text-[9px] font-bold text-emerald-800 uppercase mb-0.5">🏁 Antar</p>
                                                                                    <p className="text-[10px] text-emerald-900 font-medium line-clamp-1">{kirimDataHistory.tujuan}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-gray-50 p-2.5 rounded-lg text-[10px] font-mono border border-gray-100 mb-3 flex-grow line-clamp-3 whitespace-pre-wrap shadow-inner">{o.raw_order_text}</div>
                                                                    )}

                                                                    {isFinal && o.status === 'cancelled' && (
                                                                        <div className="bg-red-50 p-2 rounded text-[9px] text-red-700 border border-red-100 mb-2 italic line-clamp-2">
                                                                            <strong>Alasan Batal:</strong> {o.kendala_info || '-'}
                                                                        </div>
                                                                    )}
                                                                    {isNyerah && (
                                                                        <div className="bg-orange-50 p-2 rounded text-[9px] text-orange-700 border border-orange-100 mb-2">
                                                                            <strong>Alasan Nyerah:</strong> {o._failedReason || '-'}
                                                                        </div>
                                                                    )}

                                                                    {isFinal && o.status === 'completed' && (
                                                                        <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-gray-100">
                                                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                                                <span className="text-gray-500">⏱️ Durasi Pengerjaan:</span>
                                                                                <span className="text-gray-800 bg-gray-100 px-2 py-0.5 rounded notranslate">{calculateDuration(o.dispatched_at, o.completed_at)}</span>
                                                                            </div>
                                                                            {o.tipe_layanan === 'Belanja' && (
                                                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                                                    <span className="text-gray-500">Total Belanja (Talangan):</span>
                                                                                    <span className="text-red-500 text-sm notranslate">Rp {parseInt(o.total_price || 0).toLocaleString('id-ID')}</span>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                                                <span className="text-gray-500">Ongkir/Jasa (Diterima):</span>
                                                                                <span className="text-emerald-600 text-sm notranslate">Rp {parseInt(o.delivery_fee || 0).toLocaleString('id-ID')}</span>
                                                                            </div>
                                                                            
                                                                            {orderRatings[o.id] && (
                                                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                                                    <div className="flex items-center gap-1 mb-1.5">
                                                                                        <span className="text-[10px] font-bold text-gray-500 mr-1">Rating Customer:</span>
                                                                                        <span className="text-yellow-400 text-xs">{"⭐".repeat(orderRatings[o.id].rating)}</span>
                                                                                        <span className="text-gray-300 text-xs">{"⭐".repeat(5 - orderRatings[o.id].rating)}</span>
                                                                                    </div>
                                                                                    {orderRatings[o.id].review && (
                                                                                        <details className="text-[10px] text-gray-600 bg-gray-50 rounded border border-gray-100 group transition-all">
                                                                                            <summary className="cursor-pointer font-medium text-[#004aad] hover:bg-blue-50 p-2 outline-none select-none list-none relative flex justify-between items-center">
                                                                                                <span><span className="group-open:hidden">Lihat</span><span className="hidden group-open:inline">Tutup</span> Ulasan</span>
                                                                                                <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                                                                                            </summary>
                                                                                            <div className="p-2 pt-1 italic border-t border-gray-100">"{orderRatings[o.id].review}"</div>
                                                                                        </details>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                            </>
                                                        )}
                                                    </>)
                                                })()}
                                            </div>

                                            {flattenedHistory.length === courierHistoryLimit && !isFetchingHistory ? (
                                                <div className="flex flex-col items-center mt-6 mb-10 gap-3">
                                                    <button onClick={() => setCourierHistoryLimit(prev => prev + 10)} className="bg-white text-[#004aad] px-6 py-2.5 rounded-xl font-bold shadow-sm border border-[#004aad] hover:bg-blue-50 transition w-full max-w-sm">
                                                        Muat Lebih Banyak Orderan ⬇️
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center mt-6 mb-10">
                                                    <p className="text-gray-400 text-xs font-semibold">Tidak ada orderan lebih lanjut untuk periode ini.</p>
                                                </div>
                                            )}
                                        </div>{/* end p-4 content */}
                                    </div>
    );
}

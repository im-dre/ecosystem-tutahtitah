import ServiceBadge from "../../components/ui/ServiceBadge";
import { formatDateTime, calculateDuration } from "../../utils/helpers";

// ? [LEVEL 3 #12] Tab Riwayat Admin � di-extract dari App.jsx
// Semua state filter, pencarian, pagination, dan handler tetap di App.jsx (lift-state-stays).
export default function AdminRiwayatTab({
    adminFilterPeriod, setAdminFilterPeriod,
    adminFilterStartDate, setAdminFilterStartDate,
    adminFilterEndDate, setAdminFilterEndDate,
    adminFilterService, setAdminFilterService,
    adminFilterStatus, setAdminFilterStatus,
    adminFilterCourier, setAdminFilterCourier,
    adminHistorySearch, setAdminHistorySearch,
    adminHistoryLimit, setAdminHistoryLimit,
    adminHistoricalOrders,
    couriersList,
    isFetchingHistory,
    orderRatings,
    user,
    setLightboxImg,
    onDeleteOrder
}) {
    return (                                <div className="space-y-4">
                                    <div className="bg-white pt-4 pb-3 px-4 sm:px-6 md:px-3 md:rounded-2xl shadow-sm border-b md:border border-gray-200 flex flex-col sticky top-[65px] z-30 -mx-4 sm:-mx-6 md:mx-0">
                                        <div className="relative w-full">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                                            <input type="text" placeholder="Cari Nama Customer..." className="bg-gray-100 border-none text-gray-800 text-sm rounded-full pl-9 pr-4 py-2 font-medium outline-none w-full focus:ring-2 focus:ring-[#004aad]/20 transition-all" value={adminHistorySearch} onChange={(e) => setAdminHistorySearch(e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-3 py-2 outline-none" value={adminFilterPeriod} onChange={(e) => setAdminFilterPeriod(e.target.value)}>
                                                <option value="today">Hari Ini</option><option value="week">7 Hari Terakhir</option><option value="month">Bulan Ini</option><option value="year">Tahun Ini</option><option value="all">Semua Waktu</option><option value="custom">Pilih Rentang Tanggal</option>
                                            </select>
                                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-3 py-2 outline-none" value={adminFilterService} onChange={(e) => setAdminFilterService(e.target.value)}>
                                                <option value="all">Semua Layanan</option><option value="Belanja">Belanja</option><option value="Antar Jemput">Antar Jemput</option><option value="Kirim Barang">Kirim Barang</option>
                                            </select>
                                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-3 py-2 outline-none" value={adminFilterStatus} onChange={(e) => setAdminFilterStatus(e.target.value)}>
                                                <option value="all">Semua Status</option><option value="completed">Sukses</option><option value="cancelled">Batal</option><option value="failed">Gagal / Nyerah</option>
                                            </select>
                                            <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-3 py-2 outline-none" value={adminFilterCourier} onChange={(e) => setAdminFilterCourier(e.target.value)}>
                                                <option value="all">Semua Kurir</option>
                                                {couriersList.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                            </select>
                                        </div>
                                        {/* BLOK KALENDER (MUNCUL KALAU MILIH CUSTOM) */}
                                        {adminFilterPeriod === 'custom' && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input type="date" className="bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg px-3 py-2 font-semibold outline-none w-full" value={adminFilterStartDate} onChange={e => setAdminFilterStartDate(e.target.value)} />
                                                <span className="text-gray-400 font-bold">-</span>
                                                <input type="date" className="bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg px-3 py-2 font-semibold outline-none w-full" value={adminFilterEndDate} onChange={e => setAdminFilterEndDate(e.target.value)} />
                                            </div>
                                        )}
                                    </div>

                                    {(() => {
                                        const filteredOrders = adminHistoricalOrders
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
                                            .filter(o => (o.customer_name || o.customer_wa || '').toLowerCase().includes(adminHistorySearch.toLowerCase()));

                                        return (<>
                                            {isFetchingHistory ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                                    <div className="w-10 h-10 border-4 border-gray-200 border-t-[#004aad] rounded-full animate-spin mb-4"></div>
                                                    <p className="font-bold text-sm">Memuat Data Riwayat...</p>
                                                </div>
                                            ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 -mx-4 md:mx-0">
                                                {filteredOrders.slice(0, adminHistoryLimit).map(o => {
                                                    const isFailed = o.failed_couriers && o.failed_couriers.length > 0;
                                                    const statusLabel = o.status === 'completed' ? 'Sukses' : (isFailed ? 'Gagal' : 'Batal');
                                                    const statusColor = o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : (isFailed ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700');

                                                    return (
                                                        <div key={o.id} className="bg-white p-4 md:rounded-xl border-y md:border border-x-0 md:border-x border-gray-200 shadow-none md:shadow-sm flex flex-col hover:border-blue-200 transition">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${statusColor}`}>{statusLabel}</span>
                                                                <span className="text-[9px] font-bold text-gray-400">{formatDateTime(o.created_at)}</span>
                                                            </div>
                                                            {o.inputted_by && (
                                                                <div className="flex items-center gap-1 mb-1.5 text-[10px] text-gray-500 font-medium">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 256 256" fill="currentColor"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path></svg>
                                                                    Diinput oleh: {o.inputted_by}
                                                                </div>
                                                            )}
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
                                                                        <span className="text-gray-800 bg-gray-100 px-2 py-0.5 rounded notranslate">{calculateDuration(o.dispatched_at, o.completed_at)}</span>
                                                                    </div>
                                                                    {o.tipe_layanan === 'Belanja' && (
                                                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                                                            <span className="text-gray-500">Total Belanja (Talangan):</span>
                                                                            <span className="text-red-500 text-sm notranslate">Rp {parseInt(o.total_price || 0).toLocaleString('id-ID')}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                                                        <span className="text-gray-500">Ongkir/Jasa:</span>
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
                                                            <div className="text-[9px] text-gray-400 mt-3 font-bold text-right uppercase">Mitra Terakhir: {couriersList.find(c => c.id === o.assigned_courier_id)?.full_name || 'Tidak ada'}</div>
                                                              {user?.is_super_admin && (
                                                                  <button onClick={() => onDeleteOrder(o.id)} className="mt-3 w-full bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2 rounded-lg text-[10px] transition border border-red-200 shadow-sm flex items-center justify-center gap-1">
                                                                      🗑️ Hapus Permanen
                                                                  </button>
                                                              )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            )}
                                            {adminHistoricalOrders.length === adminHistoryLimit && !isFetchingHistory ? (
                                                <div className="flex flex-col items-center mt-6 mb-10 gap-3">
                                                    <button onClick={() => setAdminHistoryLimit(prev => prev + 10)} className="bg-white text-[#004aad] px-6 py-2.5 rounded-xl font-bold shadow-sm border border-[#004aad] hover:bg-blue-50 transition w-full max-w-sm">
                                                        Muat Lebih Banyak Orderan ⬇️
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center mt-6">
                                                    <p className="text-gray-400 text-xs font-semibold">Tidak ada orderan lebih lanjut untuk periode ini.</p>
                                                </div>
                                            )}
                                        </>)
                                    })()}
                                </div>
    );
}
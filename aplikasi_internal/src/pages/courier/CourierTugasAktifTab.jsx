import React from "react";
import ServiceBadge from "../../components/ui/ServiceBadge";
import { formatDateTime, parseJastipItemsObjects, parseJastipNote, parseKirimDetails, parseOjekDetails } from "../../utils/helpers";

// [LEVEL 4 #16] Tab Tugas Aktif Kurir diekstrak dari App.jsx.
// Seluruh state global, realtime Supabase, dan handler bisnis tetap di App.jsx.
export default function CourierTugasAktifTab({
    courierActiveOrders,
    courierTugasSubTab,
    setCourierTugasSubTab,
    loading,
    user,
    jastipPrices,
    jastipChecked,
    calculateJastipTotal,
    updateJastipPrice,
    updateJastipChecked,
    dispatchInputs,
    setDispatchInputs,
    onSetLightboxImg,
    onOpenEditOrder,
    onOpenKendala,
    onSendBillToAdmin,
    onCompleteOrder,
    onGiveUp,
    onContinueAfterIssue
}) {
    return (
                                    <div className="space-y-4 pt-4 md:px-0">
                                        {/* Sub-Tabs Nav Courier */}
                                        <div className="flex overflow-x-auto hide-scrollbar gap-5 px-4 md:px-0 border-b border-gray-200 mb-2">
                                            {['Semua', 'Diproses', 'Menuju Lokasi', 'Kendala'].map(sub => (
                                                <button key={sub} onClick={() => setCourierTugasSubTab(sub)}
                                                    className={`whitespace-nowrap pb-2.5 text-[11px] uppercase tracking-wide font-bold transition-all border-b-[3px] ${courierTugasSubTab === sub ? 'text-[#004aad] border-[#004aad]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>

                                        {courierActiveOrders.length === 0 && !loading && (
                                            <div className="text-center p-10 bg-white md:rounded-2xl border-y md:border border-gray-200 shadow-sm mt-4">
                                                <img src="/dekstop-icon.webp" className="w-16 h-16 mx-auto mb-3 opacity-30 grayscale" alt="Kosong" />
                                                <span className="font-bold text-gray-500 block">Belum ada tugas baru.</span>
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-col gap-0 md:gap-4">
                                            {courierActiveOrders.filter(o => {
                                                const isHold = o.status === 'hold';
                                                const isDelivering = o.status === 'delivering';
                                                const isProcessing = o.status === 'processing';
                                                
                                                if (courierTugasSubTab === 'Semua') return true;
                                                if (courierTugasSubTab === 'Diproses') return isProcessing;
                                                if (courierTugasSubTab === 'Menuju Lokasi') return isDelivering;
                                                if (courierTugasSubTab === 'Kendala') return isHold;
                                                return true;
                                            }).map(task => {
                                                const isHold = task.status === 'hold';
                                                const isWaiting = task.failed_couriers && task.failed_couriers.some(fc => fc.id === user.id) && task.status === 'processing';
                                                const jastipItemsObj = task.tipe_layanan === 'Belanja' ? parseJastipItemsObjects(task.raw_order_text) : [];
                                                const jastipNote = task.tipe_layanan === 'Belanja' ? parseJastipNote(task.raw_order_text) : '';
                                                const ojekData = task.tipe_layanan === 'Antar Jemput' ? parseOjekDetails(task.raw_order_text) : null;
                                                const kirimData = task.tipe_layanan === 'Kirim Barang' ? parseKirimDetails(task.raw_order_text) : null;

                                                return (
                                                    <div key={task.id} className={`bg-white p-4 md:rounded-xl md:border-x border-y border-x-0 ${isHold ? 'border-orange-200 bg-orange-50/30' : (isWaiting ? 'border-red-200 bg-red-50/30' : 'border-gray-200')} shadow-none md:shadow-sm flex flex-col`}>

                                                    <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                                                        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${isHold ? 'bg-orange-100 text-orange-700' : (isWaiting ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}`}>
                                                            {isHold ? 'KENDALA (TAHAN PROSES)' : (isWaiting ? 'MENUNGGU ADMIN' : (task.status === 'delivering' ? 'MENUJU LOKASI CUSTOMER' : 'SEDANG DIKERJAKAN'))}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{formatDateTime(task.created_at)}</span>
                                                    </div>

                                                    <div className="mb-2"><ServiceBadge type={task.tipe_layanan} /></div>
                                                    <p className="font-bold text-gray-900 text-sm mb-2">{task.customer_name || task.customer_wa.split('-')[0]}</p>
                                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mb-3 text-xs flex items-start gap-1.5 shadow-inner">
                                                        <img src="/location-icon.webp" alt="Location" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
                                                        <span className="text-gray-700 font-semibold">{task.customer_address}</span>
                                                    </div>

                                                    {task.image_url && (
                                                        <button onClick={() => onSetLightboxImg(task.image_url)} className="mb-4 w-full bg-blue-50 text-[#004aad] text-[10px] font-bold py-2 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1">
                                                            📸 Lihat Foto Belanjaan
                                                        </button>
                                                    )}

                                                    {task.tipe_layanan === 'Belanja' ? (
                                                        <div className="mb-4">
                                                            {task.status === 'delivering' ? (
                                                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                                                                    <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-3">
                                                                        <p className="text-[10px] font-bold text-blue-800 uppercase">🧾 Summary Belanjaan</p>
                                                                        <button onClick={() => { onOpenEditOrder(task); }} className="text-[10px] font-bold text-[#004aad] bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition shadow-sm flex items-center gap-1">
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
                                                                    {jastipNote && (
                                                                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 mt-2 mb-3 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-yellow-800 uppercase mb-1">📝 Catatan Pelanggan:</p>
                                                                            <p className="text-xs text-yellow-900 font-medium whitespace-pre-wrap">{jastipNote}</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Subtotal Belanja:</span>
                                                                        <span className="text-sm font-bold text-blue-700">Rp {calculateJastipTotal(task.id, task.raw_order_text).toLocaleString('id-ID')}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {jastipNote && (
                                                                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 mb-3 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-yellow-800 uppercase mb-1">📝 Catatan Pelanggan:</p>
                                                                            <p className="text-xs text-yellow-900 font-medium whitespace-pre-wrap">{jastipNote}</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">List Belanjaan Secara Spesifik:</p>
                                                                        <button onClick={() => { onOpenEditOrder(task); }} className="text-[10px] font-bold text-[#004aad] bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition shadow-sm flex items-center gap-1">
                                                                            ✏️ Tambah/Edit List
                                                                        </button>
                                                                    </div>
                                                                    {jastipItemsObj.map((itemObj, idx) => {
                                                                        const userPrice = jastipPrices[`${task.id}_${idx}`];
                                                                        const displayVal = userPrice !== undefined ? userPrice : (itemObj.defaultPrice > 0 ? itemObj.defaultPrice : '');
                                                                        return (
                                                                            <div key={idx} className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex flex-col gap-2 mb-2 shadow-inner">
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
                                                                    <div className="border-t border-gray-200 pt-2 mb-1 flex justify-between items-center">
                                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subtotal Belanja:</span>
                                                                        <span className="text-sm font-bold text-[#004aad]">Rp {calculateJastipTotal(task.id, task.raw_order_text).toLocaleString('id-ID')}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : task.tipe_layanan === 'Antar Jemput' && ojekData ? (
                                                        <div className="mb-4 space-y-2">
                                                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm">
                                                                <p className="text-[10px] font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">📍 Lokasi Jemput</p>
                                                                <p className="text-xs text-blue-900 font-medium">{ojekData.jemput}</p>
                                                            </div>
                                                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm">
                                                                <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">🏁 Lokasi Tujuan</p>
                                                                <p className="text-xs text-emerald-900 font-medium">{ojekData.tujuan}</p>
                                                            </div>
                                                            {ojekData.note && ojekData.note !== '-' && (
                                                                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 shadow-sm">
                                                                    <p className="text-[10px] font-bold text-yellow-800 uppercase mb-1 flex items-center gap-1">📝 Patokan / Catatan</p>
                                                                    <p className="text-xs text-yellow-900 font-medium whitespace-pre-wrap">{ojekData.note}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : task.tipe_layanan === 'Kirim Barang' && kirimData ? (
                                                        <div className="mb-4 space-y-2">
                                                            <div className="bg-gray-100 p-3 rounded-xl border border-gray-300 shadow-sm text-center">
                                                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex justify-center items-center gap-1">📦 Barang yang Dikirim</p>
                                                                <p className="text-sm font-bold text-gray-800">{kirimData.barang}</p>
                                                            </div>
                                                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm">
                                                                <p className="text-[10px] font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">📍 Lokasi Pengambilan</p>
                                                                <p className="text-xs text-blue-900 font-medium">{kirimData.ambil}</p>
                                                            </div>
                                                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm">
                                                                <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">🏁 Lokasi Tujuan</p>
                                                                <p className="text-xs text-emerald-900 font-medium">{kirimData.tujuan}</p>
                                                            </div>
                                                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 shadow-sm">
                                                                <p className="text-[10px] font-bold text-indigo-800 uppercase mb-1 flex items-center gap-1">👤 Nama Penerima</p>
                                                                <p className="text-sm font-bold text-indigo-900">{kirimData.penerima}</p>
                                                            </div>
                                                            {kirimData.note && kirimData.note !== '-' && (
                                                                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 shadow-sm">
                                                                    <p className="text-[10px] font-bold text-yellow-800 uppercase mb-1 flex items-center gap-1">📝 Catatan Tambahan</p>
                                                                    <p className="text-xs text-yellow-900 font-medium whitespace-pre-wrap">{kirimData.note}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono border border-gray-100 mb-3 whitespace-pre-wrap shadow-inner">{task.raw_order_text}</div>
                                                    )}

                                                    {/* Info Harga Talangan & Ongkir */}
                                                    {task.status === 'delivering' ? (
                                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2 mb-4">
                                                            <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                                                                <span className="text-[10px] font-bold text-emerald-800 uppercase">Ongkos Jasa:</span>
                                                                <span className="text-sm font-bold text-emerald-700">Rp {parseInt(task.delivery_fee || 0).toLocaleString('id-ID')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center pt-1">
                                                                <span className="text-sm font-bold text-emerald-900">GRAND TOTAL:</span>
                                                                <span className="text-xl font-bold text-emerald-600">Rp {(parseInt(task.total_price || 0) + parseInt(task.delivery_fee || 0)).toLocaleString('id-ID')}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2 mt-1 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-inner">
                                                            {task.status !== 'hold' && task.status === 'processing' ? (
                                                                <div className="flex justify-between items-center text-xs font-bold">
                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Edit Ongkos Jasa (Rp)</label>
                                                                    <input type="number" placeholder="Input Ongkir" className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-[#004aad] outline-none text-right focus:border-[#004aad]" value={dispatchInputs[`${task.id}_updateFee`] !== undefined ? dispatchInputs[`${task.id}_updateFee`] : (task.delivery_fee || '')} onChange={(e) => setDispatchInputs({ ...dispatchInputs, [`${task.id}_updateFee`]: e.target.value })} />
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-between items-center text-xs font-bold">
                                                                    <span className="text-gray-600 tracking-wider">Ongkir / Jasa:</span>
                                                                    <span className="text-emerald-600 text-lg notranslate">Rp {parseInt(task.delivery_fee || 0).toLocaleString('id-ID')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Tombol Aksi */}
                                                    {!isHold && !isWaiting && (
                                                        <div className="flex flex-col gap-2">
                                                            {task.status === 'processing' && (
                                                                <>
                                                                    <button onClick={() => {
                                                                        onOpenKendala(task);
                                                                    }} className="w-full text-xs font-bold text-orange-500 hover:text-orange-700 border border-orange-200 bg-orange-50 py-3 rounded-xl transition shadow-sm">
                                                                        ⚠️ Lapor Kendala
                                                                    </button>
                                                                    <button onClick={() => onSendBillToAdmin(task)} className="w-full bg-[#004aad] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_0_#1d4ed8] active:shadow-[0_0px_0_#1d4ed8] active:translate-y-1 transition text-xs flex justify-center items-center gap-1 uppercase tracking-wider">
                                                                        🧾 Kirim Tagihan ke Admin
                                                                    </button>
                                                                </>
                                                            )}
                                                            {task.status === 'delivering' && (
                                                                <button onClick={() => onCompleteOrder(task)} className="w-full bg-[#10b981] text-white font-bold py-4 rounded-xl shadow-md transition transform hover:-translate-y-1 text-sm mt-2 flex justify-center items-center gap-1">
                                                                    ✅ Selesaikan Order (Uang Diterima)
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {isHold && (
                                                        <div className="pl-2 mt-2">
                                                            <div className="bg-orange-100 p-2.5 rounded-lg border border-orange-200 shadow-inner">
                                                                <p className="text-[10px] font-bold text-orange-800 uppercase mb-1">💬 Laporan Kendala Kamu:</p>
                                                                <p className="text-xs text-orange-900 font-bold whitespace-pre-wrap">{task.kendala_info}</p>
                                                            </div>
                                                            <div className="flex gap-2 mt-4">
                                                                <button onClick={() => onGiveUp(task.id)} className="flex-[0.8] bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-[0_4px_0_#b91c1c] active:shadow-[0_0px_0_#b91c1c] active:translate-y-1 transition text-xs flex justify-center items-center gap-1">
                                                                    Nyerah (Batal)
                                                                </button>
                                                                <button onClick={() => onContinueAfterIssue(task.id)} className="flex-[1.2] bg-[#004aad] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_0_#1d4ed8] active:shadow-[0_0px_0_#1d4ed8] active:translate-y-1 transition text-xs flex justify-center items-center gap-1">
                                                                    Lanjut Proses 🚀
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isWaiting && (
                                                        <div className="pl-2 mt-2 flex flex-col h-full">
                                                            <div className="bg-red-100 p-3 rounded-lg border border-red-200 mb-3 shadow-inner">
                                                                <p className="text-[10px] font-bold text-red-800 uppercase mb-1 flex items-center gap-1">
                                                                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                                                                    MENYERAH (MENUNGGU ADMIN)
                                                                </p>
                                                                <p className="text-[10px] text-red-700 font-bold">Admin sedang mencarikan kurir pengganti atau membatalkan orderan ini secara sistem.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    </div>
    );
}


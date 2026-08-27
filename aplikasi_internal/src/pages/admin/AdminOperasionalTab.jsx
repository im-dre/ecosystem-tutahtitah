import React from "react";
import ServiceBadge from "../../components/ui/ServiceBadge";
import CustomCourierSelect from "../../components/ui/CustomCourierSelect";
import { formatDateTime, getWaLink } from "../../utils/helpers";

// [LEVEL 4 #15] UI operasional admin. State global, realtime, dan mutasi data tetap di App.jsx.
export default function AdminOperasionalTab({ adminOperasionalTab, setAdminOperasionalTab, adminOperasionalSubTab, setAdminOperasionalSubTab, adminPendingOrders, adminProcessingOrders, dispatchInputs, setDispatchInputs, couriersList, activeCourierCounts, courierRatingStats, isCustomOrderOpen, isTogglingCustomOrder, customOrderMerchantId, onCopyFormat, onToggleCustomOrder, onSetLightboxImg, onDispatch, onCancelPendingOrder, onReplaceCourier, onEditOngkir, onSendBillToCustomer, onEditOrder, onOpenManualOrder }) {
  return (
<div className="space-y-4">
    {/* QUICK ACTIONS & TOGGLES HEADER */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 md:rounded-2xl border-y md:border border-x-0 md:border-x border-gray-200 shadow-none md:shadow-sm -mx-4 md:mx-0">
        {/* Copy Formats */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">Copy Format:</span>
            <button onClick={() => onCopyFormat('ojek')} className="shrink-0 bg-yellow-50 text-yellow-700 font-bold text-[10px] px-3 py-1.5 rounded-full border border-yellow-200 hover:bg-yellow-100 transition">🛵 Ojek</button>
            <button onClick={() => onCopyFormat('kirim')} className="shrink-0 bg-emerald-50 text-emerald-700 font-bold text-[10px] px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100 transition">📦 Kurir</button>
            <button onClick={() => onCopyFormat('jastip')} className="shrink-0 bg-blue-50 text-[#004aad] font-bold text-[10px] px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-100 transition">🛒 Jastip</button>
        </div>

        {/* Layanan Custom Order Toggle */}
        <div className="flex items-center gap-3 shrink-0 pl-1 sm:pl-3 sm:border-l border-gray-100">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-800">Custom Order</span>
                <span className={`text-[9px] font-medium ${isCustomOrderOpen ? 'text-green-600' : 'text-red-500'}`}>{isCustomOrderOpen ? 'Buka' : 'Tutup'}</span>
            </div>
            <button
                onClick={onToggleCustomOrder}
                disabled={isTogglingCustomOrder || !customOrderMerchantId}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-all duration-300 shadow-inner focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${isCustomOrderOpen ? 'bg-green-500' : 'bg-gray-300'}`}
            >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${isCustomOrderOpen ? 'left-[22px]' : 'left-0.5'}`}></div>
            </button>
        </div>
    </div>

    {/* SEGMENTED CONTROL: PENDING vs PROCESSING */}
    <div className="flex p-1 bg-gray-100 rounded-xl w-full sm:w-[350px] border border-gray-200/60 shadow-inner">
        <button onClick={() => setAdminOperasionalTab('pending')} className={`flex-1 flex justify-center items-center gap-1.5 px-2 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all duration-300 ${adminOperasionalTab === 'pending' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>
            <span className="relative">
                Masuk
                {adminPendingOrders.length > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                )}
            </span>
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md text-[10px] ml-1">{adminPendingOrders.length}</span>
        </button>
        <button onClick={() => setAdminOperasionalTab('processing')} className={`flex-1 flex justify-center items-center gap-1.5 px-2 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all duration-300 ${adminOperasionalTab === 'processing' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>
            Sedang Jalan
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md text-[10px] ml-1">{adminProcessingOrders.length}</span>
        </button>
    </div>

    {/* SUB-TAB MASUK (PENDING) */}
    {adminOperasionalTab === 'pending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminPendingOrders.map(o => (
                <div key={o.id} className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col h-full shadow-sm hover:shadow-md transition relative">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#004aad] opacity-5 rounded-bl-full pointer-events-none"></div>
                    {o.inputted_by && (
                        <div className="flex items-center gap-1 mb-1.5 text-[10px] text-gray-500 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 256 256" fill="currentColor"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path></svg>
                            Diinput oleh: {o.inputted_by}
                        </div>
                    )}
                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <ServiceBadge type={o.tipe_layanan} />
                        <span className="text-[10px] font-bold text-gray-400">{formatDateTime(o.created_at)}</span>
                    </div>
                    <p className="font-bold text-gray-900 text-lg mb-1">{o.customer_name || o.customer_wa.split('-')[0]}</p>
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-bold text-gray-500">{o.customer_wa}</p>
                        <a href={getWaLink(o.customer_wa)} target="_blank" rel="noreferrer" className="bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white px-2 py-1 rounded text-[10px] font-bold transition shadow-sm border border-[#25D366]/30 flex items-center gap-1">
                            💬 Hubungi
                        </a>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3 font-medium flex items-start gap-1">📍 <span>{o.customer_address}</span></p>

                    {o.image_url && (
                        <button onClick={() => onSetLightboxImg(o.image_url)} className="mb-3 w-full bg-blue-50 text-[#004aad] text-[10px] font-bold py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1">
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
                            couriersList={couriersList}
                            activeCourierCounts={activeCourierCounts}
                            courierRatingStats={courierRatingStats}
                        />

                        <div className="flex gap-2 mt-2">
                        <button onClick={() => onCancelPendingOrder(o.id)} className="flex-[0.8] bg-[#FF0000] hover:bg-red-500 text-white font-bold py-3 rounded-lg text-xs border border-red-200 hover:bg-red-50 transition shadow-sm">Batal</button>
                        <button onClick={() => onDispatch(o.id)} className="flex-[1.2] bg-[#004aad] hover:bg-[#003b8a] text-white py-3 rounded-lg text-sm font-bold shadow-md transition">Lanjut Proses 🚀</button>
                        </div>
                    </div>
                </div>
            ))}
            {adminPendingOrders.length === 0 && <div className="col-span-full p-10 text-center bg-white rounded-2xl border border-gray-200 shadow-sm"><span className="text-4xl block mb-2 opacity-50">☕</span><span className="font-bold text-gray-500">Belum ada orderan baru.</span></div>}
        </div>
    )}

    {/* SUB-TAB SEDANG JALAN (PROCESSING / HOLD / WAITING / DELIVERING) */}
    {adminOperasionalTab === 'processing' && (
        <div className="flex flex-col gap-4">
            {/* Sub-Tabs Nav Admin */}
            <div className="flex overflow-x-auto hide-scrollbar gap-5 px-4 md:px-0 border-b border-gray-200 sticky top-[65px] z-30 bg-gray-50 pt-3 -mx-4 md:mx-0">
                {['Semua', 'Diproses', 'Menuju Lokasi', 'Kendala', 'Nyerah'].map(sub => {
                    let count = 0;
                    if (sub === 'Semua') {
                        count = adminProcessingOrders.length;
                    } else {
                        count = adminProcessingOrders.filter(o => {
                            const isHold = o.status === 'hold';
                            const isWaiting = o.status === 'waiting_customer' || (o.failed_couriers && o.failed_couriers.length > 0 && o.status === 'processing');
                            const isDelivering = o.status === 'delivering';

                            if (sub === 'Diproses') return o.status === 'processing' && !isWaiting;
                            if (sub === 'Menuju Lokasi') return isDelivering;
                            if (sub === 'Kendala') return isHold;
                            if (sub === 'Nyerah') return isWaiting;
                            return false;
                        }).length;
                    }

                    return (
                        <button key={sub} onClick={() => setAdminOperasionalSubTab(sub)}
                            className={`flex items-center whitespace-nowrap pb-2.5 text-[11px] uppercase tracking-wide font-bold transition-all border-b-[3px] ${adminOperasionalSubTab === sub ? 'text-[#004aad] border-[#004aad]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                            {sub}
                            {count > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1.5">
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 -mx-4 md:mx-0">
                {adminProcessingOrders.filter(o => {
                    const isHold = o.status === 'hold';
                    const isWaiting = o.status === 'waiting_customer' || (o.failed_couriers && o.failed_couriers.length > 0 && o.status === 'processing');
                    const isDelivering = o.status === 'delivering';

                    if (adminOperasionalSubTab === 'Semua') return true;
                    if (adminOperasionalSubTab === 'Diproses') return o.status === 'processing' && !isWaiting;
                    if (adminOperasionalSubTab === 'Menuju Lokasi') return isDelivering;
                    if (adminOperasionalSubTab === 'Kendala') return isHold;
                    if (adminOperasionalSubTab === 'Nyerah') return isWaiting;
                    return true;
                }).map(o => {
                    const isHold = o.status === 'hold';
                    const isWaiting = o.status === 'waiting_customer' || (o.failed_couriers && o.failed_couriers.length > 0 && o.status === 'processing');
                    const isDelivering = o.status === 'delivering';

                    return (
                        <div key={o.id} className={`p-4 md:p-5 border-y md:border-x border-gray-200 md:rounded-2xl flex flex-col h-full relative overflow-hidden ${isHold ? 'bg-orange-50 border-orange-200' : isWaiting ? 'bg-red-50 border-red-200' : isDelivering ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${isHold ? 'bg-orange-400' : isWaiting ? 'bg-red-500 animate-pulse' : isDelivering ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
                            {o.inputted_by && (
                                <div className="flex items-center gap-1 mb-1.5 pl-2 text-[10px] text-gray-500 font-medium relative z-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 256 256" fill="currentColor"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path></svg>
                                    Diinput oleh: {o.inputted_by}
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-2 pl-2 relative z-10">
                                <ServiceBadge type={o.tipe_layanan} />
                                <span className="text-[10px] font-bold text-gray-400">{formatDateTime(o.created_at)}</span>
                            </div>
                        <div className="pl-2">
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-bold text-gray-900 text-sm truncate">{o.customer_name || o.customer_wa.split('-')[0]}</p>
                                <a href={getWaLink(o.customer_wa)} target="_blank" rel="noreferrer" className="bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white px-2 py-1 rounded text-[10px] font-bold transition shadow-sm border border-[#25D366]/30 flex items-center gap-1 shrink-0">
                                    💬 WA
                                </a>
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 mb-1">{o.customer_wa}</p>
                            <p className="text-[10px] text-gray-500 mb-2 font-medium flex items-start gap-1">📍 <span>{o.customer_address}</span></p>

                            {o.image_url && (
                            <button onClick={() => onSetLightboxImg(o.image_url)} className="mb-2 w-max px-2 py-1 bg-blue-50 text-[#004aad] text-[9px] font-bold rounded border border-blue-200 flex items-center gap-1">
                                    📸 Lihat Foto
                                </button>
                            )}

                            {isDelivering && o.tipe_layanan === 'Belanja' && o.bill_details ? (
                                <div className="bg-white p-3 rounded-lg text-[10px] font-mono border border-blue-100 my-2 flex-grow whitespace-pre-wrap text-blue-900 shadow-inner">
                                    <p className="font-bold uppercase border-b border-blue-200 pb-1 mb-1 text-center">🧾 Struk Belanjaan & Tagihan</p>
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
                                    <p className="text-[10px] font-bold text-orange-800 uppercase mb-1">💬 Kurir Lapor Kendala:</p>
                                    <p className="text-xs text-orange-900 font-bold whitespace-pre-wrap">{o.kendala_info}</p>
                                </div>
                            </div>
                        )}

                        {/* Kurir Nyerah -> Admin Take Action */}
                        {isWaiting && (
                            <div className="pl-2 mt-2 flex flex-col h-full">
                                <div className="bg-red-100 p-3 rounded-lg border border-red-200 mb-3 shadow-inner">
                                    <p className="text-[10px] font-bold text-red-800 uppercase mb-1 flex items-center gap-1">
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
                                        couriersList={couriersList}
                                        activeCourierCounts={activeCourierCounts}
                                        courierRatingStats={courierRatingStats}
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => onCancelPendingOrder(o.id)}
                                            className="flex-1 bg-white text-red-600 font-bold py-2.5 rounded-lg text-xs border border-red-200 hover:bg-red-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => onReplaceCourier(o)}
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
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Total Belanjaan:</span>
                                            <span className="text-sm font-bold text-gray-700 notranslate">Rp {parseFloat(o.total_price || 0).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                                Total Ongkir: 
                                                <button onClick={() => onEditOngkir(o)} className="text-blue-500 hover:text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded ml-1 text-[8px] flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"></path></svg> Edit</button>
                                            </span>
                                            <span className="text-sm font-bold text-orange-600 notranslate">Rp {parseFloat(o.delivery_fee || 0).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2 pt-1 border-t border-dashed border-gray-200">
                                            <span className="text-[11px] font-extrabold text-gray-800 uppercase">Grand Total:</span>
                                            <span className="text-sm font-extrabold text-blue-700 notranslate">Rp {(parseFloat(o.total_price || 0) + parseFloat(o.delivery_fee || 0)).toLocaleString('id-ID')}</span>
                                        </div>
                                        <button onClick={() => onSendBillToCustomer(o)} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-2.5 rounded-lg text-[11px] font-bold shadow-md transition flex items-center justify-center gap-1.5">
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
                                        <button onClick={() => onCancelPendingOrder(o.id)} className="font-bold text-[10px] px-2 py-1.5 rounded-lg border shadow-sm transition whitespace-nowrap bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                                            ❌ Batal
                                        </button>
                                        <button onClick={() => onEditOrder(o)} className="font-bold text-[10px] px-3 py-1.5 rounded-lg border shadow-sm transition whitespace-nowrap bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100">
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
    </div>
    )}

    {/* FAB INPUT MANUAL */}
    <button 
        onClick={onOpenManualOrder}
        className="fixed bottom-24 right-4 md:right-8 z-40 bg-[#004aad] hover:bg-[#003b8a] text-white w-14 h-14 rounded-full shadow-[0_4px_15px_rgba(0,74,173,0.4)] flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
    >
        <span className="text-3xl font-light mb-1">+</span>
    </button>
</div>
  );
}

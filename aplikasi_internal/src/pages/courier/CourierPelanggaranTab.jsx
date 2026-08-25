import React from "react";

// ✅ [LEVEL 2 #9] Tab Pelanggaran Kurir — di-extract dari App.jsx
// Props:
// - courierProfile: profil kurir login (untuk warning_points)
// - courierReports: array laporan yang diteruskan admin ke kurir ini
// - onSubmitFeedback: (reportId, feedbackText) => void — kirim klarifikasi kurir
// - onOpenAttachment: (order) => void — buka modal lampiran order terkait di App.jsx
export default function CourierPelanggaranTab({ courierProfile, courierReports, onSubmitFeedback, onOpenAttachment }) {
    return (
        <div className="pb-4">
            <div className="sticky top-0 z-30 bg-[#eef3fb]/95 backdrop-blur-md border-b-2 border-[#004aad]/10 px-4 pt-4 pb-3 flex flex-col gap-2 mb-4 shadow-[0_2px_10px_rgba(0,74,173,0.08)]">
                <h2 className="text-xl font-black text-[#004aad] tracking-tight">🚩 Pusat Pelanggaran</h2>
                <p className="text-xs text-gray-500 font-medium">Laporan customer yang diteruskan admin ke kamu.</p>
            </div>

            <div className="px-4 space-y-4">
                {/* Kartu Total Peringatan */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-yellow-200 flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                        ⚠️
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total Peringatan</p>
                        <p className="text-2xl font-black text-yellow-600 leading-none">
                            {courierProfile?.warning_points || 0}
                            <span className="text-sm font-bold text-gray-400 ml-1">Poin</span>
                        </p>
                    </div>
                </div>

                {courierReports.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <span className="text-5xl block mb-3 opacity-30">✅</span>
                        <span className="font-bold text-gray-500 block">Bersih! Tidak ada laporan pelanggaran.</span>
                    </div>
                ) : (
                    courierReports.map(report => {
                        const displayStatus = report.orders?.is_deleted ? 'resolved' : report.status;
                        return (
                        <div key={report.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-red-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">
                                        Teguran Admin
                                    </span>
                                    <p className="text-xs text-gray-400 font-bold mt-2">
                                        Diteruskan: {report.forwarded_at ? new Date(report.forwarded_at).toLocaleString('id-ID') : new Date(report.created_at).toLocaleString('id-ID')}
                                    </p>
                                    {report.order_id && (
                                        <p className="text-xs text-gray-500 mt-1 font-medium">
                                            Terkait Order: {' '}
                                            <button
                                                onClick={() => {
                                                    if (report.orders) {
                                                        onOpenAttachment({
                                                            id: report.orders.id,
                                                            text: report.orders.raw_order_text,
                                                            status: report.orders.status,
                                                            kendala_info: report.orders.kendala_info
                                                        });
                                                    }
                                                }}
                                                className="font-bold text-[#004aad] hover:underline"
                                            >
                                                #INV-{report.order_id.toString().substring(0, 8).toUpperCase()}
                                            </button>
                                        </p>
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${displayStatus === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {report.orders?.is_deleted ? '✅ Selesai (Dihapus)' : displayStatus === 'resolved' ? '✅ Selesai' : '⏳ Pending'}
                                </span>
                            </div>

                            <div className="bg-red-50 p-3 rounded-xl mb-4 border border-red-100">
                                <p className="text-xs font-bold text-red-800 mb-1">Catatan dari Admin:</p>
                                <p className="text-sm text-red-900 leading-relaxed italic">"{report.admin_notes || 'Ada laporan masuk terkait pelayanan kamu. Harap segera berikan klarifikasi.'}"</p>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold text-[#004aad] mb-2">Tanggapan / Klarifikasi Kamu:</p>
                                {report.target_feedback ? (
                                    <div className="bg-[#eef3fb] p-3 rounded-xl border border-blue-100">
                                        <p className="text-sm text-gray-800">{report.target_feedback}</p>
                                        <p className="text-[10px] text-gray-500 mt-2 font-medium">Dikirim: {new Date(report.feedback_at).toLocaleString('id-ID')}</p>
                                    </div>
                                ) : (
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        onSubmitFeedback(report.id, e.target.feedback.value);
                                    }} className="flex flex-col gap-2">
                                        <textarea
                                            name="feedback"
                                            rows="3"
                                            placeholder="Tuliskan klarifikasi atau permintaan maaf kamu di sini..."
                                            className="w-full text-sm p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] outline-none resize-none"
                                            required
                                        ></textarea>
                                        <button
                                            type="submit"
                                            className="bg-[#004aad] text-white font-bold py-3 rounded-xl text-sm transition hover:bg-blue-800 active:scale-95 shadow-md flex items-center justify-center gap-2"
                                        >
                                            <span>Kirim Tanggapan</span>
                                            <span>🚀</span>
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    )})
                )}
            </div>
        </div>
    );
}

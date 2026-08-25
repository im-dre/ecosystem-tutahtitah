import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";

// [LEVEL 3 #14] Tab Analitik Kurir di-extract dari App.jsx.
// State filter dan kalkulasi analitik tetap di App.jsx.
export default function CourierAnalitikTab({ courierFilterPeriod, setCourierFilterPeriod, courierFilterService, setCourierFilterService, courierFilterStartDate, setCourierFilterStartDate, courierFilterEndDate, setCourierFilterEndDate, courierChartPeriod, setCourierChartPeriod, courierAnalytics, courierRatingStats, user }) {
    return (
<div className="flex flex-col">
                                        <div className="sticky top-0 z-30 bg-[#eef3fb]/95 backdrop-blur-md border-b-2 border-[#004aad]/10 px-4 pt-4 pb-3 flex flex-col gap-2 mb-0 shadow-[0_2px_10px_rgba(0,74,173,0.08)]">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-1 h-4 rounded-full bg-[#004aad]"></div>
                                                <span className="text-[10px] font-bold text-[#004aad] uppercase tracking-widest">Filter Analitik</span>
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
                                            <div className="bg-[#004aad] text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
                                                <div className="absolute bottom-0 right-0 -mb-4 -mr-4 w-24 h-24 bg-white/10 rounded-full opacity-50 blur-xl pointer-events-none"></div>
                                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-blue-100">
                                                    💰 Laporan Keuangan
                                                </h3>
                                                <div className="space-y-3 relative z-10">
                                                    <div className="flex justify-between items-end border-b border-white/20 pb-2">
                                                        <span className="text-[11px] font-medium text-blue-200">Pendapatan Kotor</span>
                                                        <span className="text-lg font-bold text-[#ffde59] notranslate">Rp {courierAnalytics.pendapatan.toLocaleString('id-ID')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-blue-300 flex items-center gap-1.5">
                                                            Potongan Admin & Kas
                                                            <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">{courierAnalytics.potonganPersen}%</span>
                                                        </span>
                                                        <span className="text-[11px] font-bold text-red-300 notranslate">- Rp {courierAnalytics.potongan.toLocaleString('id-ID')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-b border-white/20 pb-3">
                                                        <span className="text-[10px] text-blue-300">Denda Target Mingguan</span>
                                                        <span className="text-[11px] font-bold text-red-300 notranslate">- Rp {courierAnalytics.denda.toLocaleString('id-ID')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-end pt-1">
                                                        <span className="text-xs font-bold text-white">Pendapatan Bersih</span>
                                                        <span className="text-2xl font-bold text-[#ffde59] notranslate">Rp {courierAnalytics.bersih.toLocaleString('id-ID')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RATING SUMMARY CARD */}
                                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden flex items-center justify-between">
                                                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-yellow-50 rounded-full opacity-50 pointer-events-none"></div>
                                                <div className="relative z-10 flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center shadow-inner">
                                                        <span className="text-2xl">⭐</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Rating Keseluruhan</h3>
                                                        <div className="flex items-end gap-1.5">
                                                            <span className="text-2xl font-black text-gray-900 leading-none">{courierRatingStats[user?.id]?.average || '0.0'}</span>
                                                            <span className="text-[10px] font-bold text-gray-400 mb-1">/ 5.0</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="relative z-10 text-right">
                                                    <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                                        {courierRatingStats[user?.id]?.count || 0} Ulasan
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-50 rounded-full opacity-50 pointer-events-none"></div>
                                                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 relative z-10">
                                                    <img src="/chart-icon.webp" className="w-5 h-5" alt="Icon" /> Ringkasan Performa
                                                </h3>
                                                <div className="grid grid-cols-2 gap-3 relative z-10">
                                                    <div className="col-span-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-emerald-700 mb-0.5">Sukses Diselesaikan</p>
                                                            <p className="text-2xl font-bold text-emerald-600">{courierAnalytics.sukses}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-xl font-bold text-emerald-500">{courierAnalytics.persenSukses}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                                        <p className="text-[10px] uppercase font-bold text-orange-700 mb-0.5">Batal (Cust/Admin)</p>
                                                        <div className="flex items-end justify-between">
                                                            <p className="text-lg font-bold text-orange-600">{courierAnalytics.batal}</p>
                                                            <span className="text-[10px] font-bold text-orange-500 mb-0.5">{courierAnalytics.persenBatal}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                                        <p className="text-[10px] uppercase font-bold text-red-700 mb-0.5">Menyerah Kendala</p>
                                                        <div className="flex items-end justify-between">
                                                            <p className="text-lg font-bold text-red-600">{courierAnalytics.gagal}</p>
                                                            <span className="text-[10px] font-bold text-red-500 mb-0.5">{courierAnalytics.persenGagal}%</span>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-center gap-1.5 mt-1">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rincian Layanan Sukses</p>
                                                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-600">🛒 Belanja</span> <span className="text-[10px] font-bold text-gray-600">{courierAnalytics.belanjaSks}</span></div>
                                                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-600">🛵 Ojek</span> <span className="text-[10px] font-bold text-gray-600">{courierAnalytics.ojekSks}</span></div>
                                                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-600">📦 Kirim Barang</span> <span className="text-[10px] font-bold text-gray-600">{courierAnalytics.kirimSks}</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-sm font-bold text-gray-900">Tren Performa</h3>
                                                    <select className="bg-gray-50 border border-gray-200 text-gray-700 text-[10px] font-bold rounded-lg px-2 py-1 outline-none focus:border-[#004aad]" value={courierChartPeriod} onChange={(e) => setCourierChartPeriod(e.target.value)}>
                                                        <option value="daily">Harian</option>
                                                        <option value="weekly">Mingguan</option>
                                                        <option value="monthly">Bulanan</option>
                                                        <option value="yearly">Tahunan</option>
                                                    </select>
                                                </div>
                                                <div className="h-48 w-full">
                                                    {courierAnalytics.trendDataTime && courierAnalytics.trendDataTime.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={courierAnalytics.trendDataTime} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                                                <XAxis dataKey="timeLabel" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                                                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                                <RechartsTooltip
                                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                                                    cursor={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                                                                />
                                                                <Line type="monotone" name="Sukses" dataKey="success" stroke="#059669" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                                                <Line type="monotone" name="Gagal/Batal" dataKey="failed" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold">Belum ada data untuk ditampilkan</div>
                                                    )}
                                                </div>
                                            </div>

                                        </div>{/* end p-4 content */}
                                    </div>
    );
}

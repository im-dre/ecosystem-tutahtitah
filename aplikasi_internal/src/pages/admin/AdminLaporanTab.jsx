import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import SimpleTooltip from "../../components/ui/SimpleTooltip";

// [LEVEL 3 #13] Tab Laporan & Analitik Admin di-extract dari App.jsx.
// Semua state filter, kalkulasi analitik, dan handler tetap di App.jsx (lift-state-stays).
export default function AdminLaporanTab({
    adminFilterPeriod,
    setAdminFilterPeriod,
    adminFilterStartDate,
    setAdminFilterStartDate,
    adminFilterEndDate,
    setAdminFilterEndDate,
    adminProfitShare,
    kasShare,
    adminChartGrouping,
    setAdminChartGrouping,
    adminAnalytics,
    onUpdateGlobalSettings
}) {
    return (
<div id="analytics-export-area" className="space-y-6 bg-gray-50 min-h-screen">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <h2 className="text-xl font-bold text-gray-800 print-break">Dashboard Analitik Eksekutif</h2>
        <button onClick={() => window.print()} className="no-print bg-gray-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-gray-900 transition flex items-center gap-2">
            🖨️ Export PDF (Print)
        </button>
    </div>

    {/* CONTROLS */}
    <div className="no-print bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
        <select className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-2 font-bold outline-none flex-grow md:flex-none" value={adminFilterPeriod} onChange={(e) => setAdminFilterPeriod(e.target.value)}>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
            <option value="all">Semua Waktu</option>
            <option value="custom">Custom (Pilih Rentang Tanggal)</option>
        </select>

        {adminFilterPeriod === 'custom' && (
            <div className="flex items-center gap-2 flex-grow md:flex-none">
                <input type="date" className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 font-bold outline-none" value={adminFilterStartDate} onChange={e => setAdminFilterStartDate(e.target.value)} />
                <span className="text-gray-400 font-bold">-</span>
                <input type="date" className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 font-bold outline-none" value={adminFilterEndDate} onChange={e => setAdminFilterEndDate(e.target.value)} />
            </div>
        )}

        <div className="flex items-center gap-2 ml-auto w-full md:w-auto">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 flex-1 md:flex-none">
                <label className="text-[10px] font-bold text-[#004aad] uppercase leading-tight">Hak<br />Admin:</label>
                <div className="flex items-center relative">
                    <input type="number" className="w-12 bg-white border border-blue-200 text-[#004aad] text-sm rounded-md font-bold py-1 text-center outline-none" value={adminProfitShare} onChange={(e) => onUpdateGlobalSettings('admin', e.target.value)} />
                    <span className="absolute right-1 text-[10px] font-bold text-[#004aad] pointer-events-none">%</span>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 flex-1 md:flex-none">
                <label className="text-[10px] font-bold text-emerald-700 uppercase leading-tight">Uang<br />Kas:</label>
                <div className="flex items-center relative">
                    <input type="number" className="w-12 bg-white border border-emerald-200 text-emerald-700 text-sm rounded-md font-bold py-1 text-center outline-none" value={kasShare} onChange={(e) => onUpdateGlobalSettings('kas', e.target.value)} />
                    <span className="absolute right-1 text-[10px] font-bold text-emerald-700 pointer-events-none">%</span>
                </div>
            </div>
        </div>
    </div>

    {/* KPI TOTAL ORDERS */}
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 print-break">
        <div className="text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6 w-full md:w-auto">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Order Masuk</p>
            <h3 className="text-4xl font-bold text-[#004aad]">{adminAnalytics.totalOrdersPeriod} <span className="text-sm font-bold text-gray-400">Order</span></h3>
        </div>

        <div className="flex-1 w-full grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Sukses</p>
                <p className="text-2xl font-bold text-emerald-700">{adminAnalytics.suksesOrders}</p>
                <p className="text-[10px] font-bold text-emerald-500">{adminAnalytics.persenSukses}%</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Batal</p>
                <p className="text-2xl font-bold text-gray-700">{adminAnalytics.batalOrders}</p>
                <p className="text-[10px] font-bold text-gray-500">{adminAnalytics.persenBatal}%</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Gagal (Nyerah)</p>
                <p className="text-2xl font-bold text-red-700">{adminAnalytics.gagalOrders}</p>
                <p className="text-[10px] font-bold text-red-500">{adminAnalytics.persenGagal}%</p>
            </div>
        </div>
    </div>

    {/* RATA RATA DURASI (SLA) */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-break">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 text-center">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rata-Rata Pengerjaan Global</p>
            <h3 className="text-xl font-bold text-gray-900 notranslate">{adminAnalytics.avgDurationAll}</h3>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl shadow-sm border border-blue-100 text-center">
            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Rata-Rata Pengerjaan Belanja</p>
            <h3 className="text-xl font-bold text-blue-800 notranslate">{adminAnalytics.avgDurationBelanja}</h3>
        </div>
        <div className="bg-yellow-50 p-4 rounded-2xl shadow-sm border border-yellow-100 text-center">
            <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1">Rata-Rata Pengerjaan Antar Jemput</p>
            <h3 className="text-xl font-bold text-yellow-800 notranslate">{adminAnalytics.avgDurationOjek}</h3>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl shadow-sm border border-emerald-100 text-center">
            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Rata-Rata Pengerjaan Kirim Barang</p>
            <h3 className="text-xl font-bold text-emerald-800 notranslate">{adminAnalytics.avgDurationKirim}</h3>
        </div>
    </div>

    {/* FINANCIALS */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print-break">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-gray-400 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Omset Jasa</p>
            <h3 className="text-xl font-bold text-gray-900 notranslate">Rp {adminAnalytics.totalOngkirPeriode.toLocaleString('id-ID')}</h3>
            <p className="text-[9px] font-bold text-gray-500 mt-1">Dari {adminAnalytics.analitikSelesai.length} Order Sukses</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-emerald-400">
            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Hak Kurir (Netto)</p>
            <h3 className="text-xl font-bold text-emerald-700 notranslate">Rp {adminAnalytics.totalHakKurirGlobal.toLocaleString('id-ID')}</h3>
        </div>
        <div className="bg-[#004aad] text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
            <p className="text-[10px] font-bold text-blue-200 uppercase mb-1">Hak Admin ({adminProfitShare}%)</p>
            <h3 className="text-xl font-bold text-white notranslate">Rp {adminAnalytics.hakAdminPure.toLocaleString('id-ID')}</h3>
        </div>
        <div className="bg-[#10b981] text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
            <p className="text-[10px] font-bold text-emerald-100 uppercase mb-1">Uang Kas ({kasShare}% + Denda)</p>
            <h3 className="text-xl font-bold text-[#ffde59] notranslate">Rp {adminAnalytics.totalKasTermasukDenda.toLocaleString('id-ID')}</h3>
        </div>
    </div>

    {/* TREN ORDER WAKTU (LINE CHART) */}
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 print-break">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">📈 Tren Orderan per Waktu</h3>
            <select className="no-print bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg px-2 py-1 font-bold outline-none" value={adminChartGrouping} onChange={(e) => setAdminChartGrouping(e.target.value)}>
                <option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option>
            </select>
        </div>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adminAnalytics.trendDataTime} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<SimpleTooltip label="Periode" />} />
                    <Line type="monotone" name="Belanja" dataKey="Belanja" stroke="#004aad" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" name="Antar Jemput" dataKey="Antar Jemput" stroke="#ffde59" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" name="Kirim Barang" dataKey="Kirim Barang" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-4 text-[10px] font-bold">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#004aad]"></div> Belanja</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#ffde59]"></div> Antar Jemput</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Kirim Barang</span>
        </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-break">
        {/* TREN ORDER JAM (LINE CHART) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-xs font-bold text-gray-600 mb-6 uppercase tracking-wider text-center">⏰ Tren Jam Orderan (24 Jam)</h3>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={adminAnalytics.trendDataHour} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip content={<SimpleTooltip label="Jam Order" />} />
                        <Line type="monotone" name="Belanja" dataKey="Belanja" stroke="#004aad" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" name="Antar Jemput" dataKey="Antar Jemput" stroke="#ffde59" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" name="Kirim Barang" dataKey="Kirim Barang" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4 text-[10px] font-bold">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#004aad]"></div> Belanja</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#ffde59]"></div> Ojek</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Kirim</span>
            </div>
        </div>

        {/* DISTRIBUSI LAYANAN (BAR CHART) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-xs font-bold text-gray-600 mb-6 uppercase tracking-wider text-center">📦 Komposisi Layanan</h3>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={adminAnalytics.serviceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 'bold' }} width={80} />
                        <RechartsTooltip content={<SimpleTooltip />} cursor={{ fill: '#f3f4f6' }} />
                        <Bar dataKey="value" name="Total Order" radius={[0, 8, 8, 0]}>
                            {adminAnalytics.serviceData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>

    {/* LEADERBOARD */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print-break">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">🏆 Leaderboard & Evaluasi Kurir</h3>
            <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-1 border border-gray-200 rounded">Target {adminAnalytics.targetOrders > 0 ? `${adminAnalytics.targetOrders} Order / ${adminFilterPeriod}` : 'Off'}</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        <th className="p-4 sm:p-5 font-bold">Nama Mitra</th>
                        <th className="p-4 sm:p-5 font-bold text-center">Order Sukses</th>
                        <th className="p-4 sm:p-5 font-bold text-center">Batal / Cancel</th>
                        <th className="p-4 sm:p-5 font-bold text-center text-orange-500">Gagal / Nyerah</th>
                        <th className="p-4 sm:p-5 font-bold text-right">Pendapatan Kotor</th>
                        <th className="p-4 sm:p-5 font-bold text-right text-red-500">Potongan Admin & Kas</th>
                        {/* KOLOM DENDA HANYA MUNCUL JIKA BUKAN FILTER HARI INI */}
                        {adminFilterPeriod !== 'today' && (
                            <th className="p-4 sm:p-5 font-bold text-right text-red-500">Denda Target</th>
                        )}
                        <th className="p-4 sm:p-5 font-bold text-right text-emerald-600">Pendapatan Bersih</th>
                    </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                    {adminAnalytics.courierPerformance.map((c, index) => (
                        <tr key={c.id} className="hover:bg-blue-50/30 transition">
                            <td className="p-4 sm:p-5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                                        {index + 1}
                                    </div>
                                    <span className="font-bold text-gray-900">{c.nama}</span>
                                </div>
                            </td>
                            <td className="p-4 sm:p-5 text-center">
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{c.totalSelesai}</span>
                                    <span className="text-[10px] font-bold text-emerald-500 mt-1">{c.successRate}%</span>
                                </div>
                            </td>
                            <td className="p-4 sm:p-5 text-center">
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">{c.totalBatal}</span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-1">{c.cancelRate}%</span>
                                </div>
                            </td>
                            <td className="p-4 sm:p-5 text-center">
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">{c.totalGagal}</span>
                                    <span className="text-[10px] font-bold text-orange-500 mt-1">{c.failRate}%</span>
                                </div>
                            </td>
                            <td className="p-4 sm:p-5 text-right font-bold text-gray-700 notranslate">Rp {c.ongkir.toLocaleString('id-ID')}</td>
                            <td className="p-4 sm:p-5 text-right font-bold text-red-500 notranslate">- Rp {c.potonganKasAdmin.toLocaleString('id-ID')}</td>
                            {adminFilterPeriod !== 'today' && (
                                <td className="p-4 sm:p-5 text-right font-bold text-red-500 notranslate">- Rp {c.denda.toLocaleString('id-ID')}</td>
                            )}
                            <td className="p-4 sm:p-5 text-right font-bold text-emerald-600 notranslate">Rp {c.hakKurir.toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
</div>
    );
}

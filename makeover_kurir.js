const fs = require('fs');

let code = fs.readFileSync('c:/tutahtitah-ecosystem/aplikasi_internal/src/App.jsx', 'utf-8');

// 1. Change initial state from 'aktif' to 'tugas'
code = code.replace(/const \[courierMainTab, setCourierMainTab\] = useState\('aktif'\);/, "const [courierMainTab, setCourierMainTab] = useState('tugas');");

// 2. Insert trendDataTime calculation into courierAnalytics
const courierAnalyticsTarget = `
          const belanjaSks = successOrders.filter(o => o.tipe_layanan === 'Belanja').length;
          const ojekSks = successOrders.filter(o => o.tipe_layanan === 'Antar Jemput').length;
          const kirimSks = successOrders.filter(o => o.tipe_layanan === 'Kirim Barang').length;

          return { 
              total: totalAction, sukses: countSukses, `;

const courierAnalyticsReplacement = `
          const belanjaSks = successOrders.filter(o => o.tipe_layanan === 'Belanja').length;
          const ojekSks = successOrders.filter(o => o.tipe_layanan === 'Antar Jemput').length;
          const kirimSks = successOrders.filter(o => o.tipe_layanan === 'Kirim Barang').length;

          const groupedByDate = {};
          flattenedHistory.forEach(o => {
              const dateObj = new Date(o._actionTime || o.created_at);
              const dateStr = dateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
              if (!groupedByDate[dateStr]) groupedByDate[dateStr] = { timeLabel: dateStr, success: 0, failed: 0, cancelled: 0 };
              
              if (o._viewMode === 'final' && o.status === 'completed') groupedByDate[dateStr].success += 1;
              else if (o._viewMode === 'final' && o.status === 'cancelled') groupedByDate[dateStr].cancelled += 1;
              else if (o._viewMode === 'failed') groupedByDate[dateStr].failed += 1;
          });
          const trendDataTime = Object.values(groupedByDate);

          return { 
              trendDataTime,
              total: totalAction, sukses: countSukses, `;

code = code.replace(courierAnalyticsTarget, courierAnalyticsReplacement);

// 3. Replace the Courier UI Block
const courierUIStartRegex = /{\/\* ===================================== \*\/\}\s*{\/\* COURIER VIEW \*\/\}\s*{\/\* ===================================== \*\/\}\s*{user\.role === "courier" && \(/;

const courierUIBlockIndex = code.search(courierUIStartRegex);

if (courierUIBlockIndex === -1) {
    console.error("Courier UI start not found");
    process.exit(1);
}

// Find the end of the courier block
let openBraces = 0;
let foundStart = false;
let endIndex = -1;

for (let i = courierUIBlockIndex + 140; i < code.length; i++) { // offset by roughly the length of the regex match
    if (code[i] === '{') openBraces++;
    else if (code[i] === '}') {
        if (openBraces === 0) {
            endIndex = i;
            break;
        }
        openBraces--;
    }
}

if (endIndex === -1) {
    console.error("Courier UI end not found");
    process.exit(1);
}

// We will replace everything from courierUIBlockIndex to endIndex.
const newCourierUI = `{/* ===================================== */}
        {/* COURIER VIEW */}
        {/* ===================================== */}
        {user.role === "courier" && (
          <div className="max-w-md mx-auto pb-24">
            
            {/* Sederhanakan Header Kurir */}
            <div className="bg-[#004aad] text-white px-6 pt-6 pb-6 rounded-b-3xl shadow-lg relative overflow-hidden mb-4">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-blue-600 rounded-full opacity-50 blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-center relative z-10">
                  <h2 className="text-xl font-black tracking-tight">Siap Narik, {user.name}! 🛵</h2>
                  <div className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded shadow-sm border border-white/30 backdrop-blur-sm">
                      {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </div>
              </div>
            </div>

            {/* Bottom Navigation PWA Style */}
            <div className="no-print fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-around items-end md:relative md:justify-start md:border-t-0 md:border-b md:px-4 md:pt-2 md:gap-2 overflow-x-auto hide-scrollbar shadow-[0_-4px_15px_rgba(0,0,0,0.05)] md:shadow-none pb-2 pt-1 md:pb-0 md:pt-0">
                
                {/* TUGAS - Lebih besar */}
                <button onClick={() => setCourierMainTab('tugas')} className={\`flex flex-col md:flex-row items-center justify-center gap-1 py-1 md:px-4 md:py-3 font-bold text-[10px] md:text-sm w-full md:w-auto transition md:border-b-2 whitespace-nowrap relative \${courierMainTab === 'tugas' ? 'text-[#004aad] md:border-[#004aad] flex-[1.2] -mt-2' : 'text-gray-400 md:text-gray-500 md:border-transparent hover:text-gray-700 hover:bg-gray-50 flex-1'}\`}>
                    <div className={\`\${courierMainTab === 'tugas' ? 'bg-blue-50 p-2 rounded-full border border-blue-100 shadow-sm' : ''}\`}>
                        <img src="/dekstop-icon.webp" className={\`w-6 h-6 md:w-5 md:h-5 object-contain \${courierMainTab === 'tugas' ? 'scale-110' : 'grayscale opacity-60'}\`} alt="Tugas" />
                    </div>
                    {courierActiveOrders.length > 0 && (
                        <span className="absolute top-0 right-1/4 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
                            {courierActiveOrders.length}
                        </span>
                    )}
                    <span className={\`leading-none mt-1 md:mt-0 md:hidden \${courierMainTab === 'tugas' ? 'text-[11px]' : ''}\`}>Tugas</span>
                    <span className="hidden md:inline">Tugas Aktif</span>
                </button>
                
                {/* RIWAYAT */}
                <button onClick={() => setCourierMainTab('riwayat')} className={\`flex flex-col md:flex-row items-center justify-center gap-1 py-1 md:px-4 md:py-3 font-bold text-[10px] md:text-sm w-full md:w-auto transition md:border-b-2 whitespace-nowrap flex-1 \${courierMainTab === 'riwayat' ? 'text-[#004aad] md:border-[#004aad]' : 'text-gray-400 md:text-gray-500 md:border-transparent hover:text-gray-700 hover:bg-gray-50'}\`}>
                    <img src="/clock-icon.webp" className={\`w-6 h-6 md:w-5 md:h-5 object-contain \${courierMainTab === 'riwayat' ? '' : 'grayscale opacity-60'}\`} alt="Riwayat" />
                    <span className="leading-none mt-1 md:mt-0 md:hidden">Riwayat</span>
                    <span className="hidden md:inline">Riwayat Order</span>
                </button>

                {/* ANALITIK */}
                <button onClick={() => setCourierMainTab('analitik')} className={\`flex flex-col md:flex-row items-center justify-center gap-1 py-1 md:px-4 md:py-3 font-bold text-[10px] md:text-sm w-full md:w-auto transition md:border-b-2 whitespace-nowrap flex-1 \${courierMainTab === 'analitik' ? 'text-[#004aad] md:border-[#004aad]' : 'text-gray-400 md:text-gray-500 md:border-transparent hover:text-gray-700 hover:bg-gray-50'}\`}>
                    <img src="/chart-icon.webp" className={\`w-6 h-6 md:w-5 md:h-5 object-contain \${courierMainTab === 'analitik' ? '' : 'grayscale opacity-60'}\`} alt="Analitik" />
                    <span className="leading-none mt-1 md:mt-0 md:hidden">Analitik</span>
                    <span className="hidden md:inline">Laporan Analitik</span>
                </button>

                {/* PROFIL */}
                <button onClick={() => setCourierMainTab('profil')} className={\`flex flex-col md:flex-row items-center justify-center gap-1 py-1 md:px-4 md:py-3 font-bold text-[10px] md:text-sm w-full md:w-auto transition md:border-b-2 whitespace-nowrap flex-1 \${courierMainTab === 'profil' ? 'text-[#004aad] md:border-[#004aad]' : 'text-gray-400 md:text-gray-500 md:border-transparent hover:text-gray-700 hover:bg-gray-50'}\`}>
                    <img src="/avatar-icon.webp" className={\`w-6 h-6 md:w-5 md:h-5 object-contain \${courierMainTab === 'profil' ? '' : 'grayscale opacity-60'}\`} alt="Profil" />
                    <span className="leading-none mt-1 md:mt-0 md:hidden">Profil</span>
                    <span className="hidden md:inline">Profil Kurir</span>
                </button>
            </div>

            <div className="p-4 mt-2 space-y-4">
                
                {/* TAB TUGAS */}
                {courierMainTab === 'tugas' && (
                    <>
                    {courierActiveOrders.length === 0 && !loading && (
                        <div className="text-center p-10 bg-white rounded-2xl border border-gray-200 shadow-sm mt-4">
                            <img src="/dekstop-icon.webp" className="w-16 h-16 mx-auto mb-3 opacity-30 grayscale" alt="Kosong" />
                            <span className="font-bold text-gray-500 block">Belum ada tugas baru.</span>
                        </div>
                    )}
                    {courierActiveOrders.map(task => {
                        const isHold = task.status === 'hold';
                        const isWaiting = task.failed_couriers && task.failed_couriers.some(fc => fc.id === user.id) && task.status === 'processing';
                        
                        return (
                        <div key={task.id} className={\`bg-white p-4 rounded-xl border \${isHold ? 'border-orange-300 shadow-orange-100' : (isWaiting ? 'border-red-300 shadow-red-100' : 'border-blue-200 shadow-blue-50')} shadow-sm flex flex-col\`}>
                            
                            <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                                <span className={\`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider \${isHold ? 'bg-orange-100 text-orange-700' : (isWaiting ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}\`}>
                                    {isHold ? 'KENDALA (HOLD)' : (isWaiting ? 'MENUNGGU ADMIN' : 'Aktif (Sedang Jalan)')}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{formatDateTime(task.created_at)}</span>
                            </div>
                            
                            <div className="mb-2"><ServiceBadge type={task.tipe_layanan} /></div>
                            <p className="font-black text-gray-900 text-sm mb-1">{task.customer_name || task.customer_wa.split('-')[0]}</p>
                            <p className="text-xs font-bold text-[#004aad] mb-1 flex items-center gap-1">
                                <a href={\`https://wa.me/\${task.customer_wa.replace(/\\D/g, '')}\`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                    <span className="bg-green-100 text-green-700 p-0.5 rounded">💬</span> {task.customer_wa}
                                </a>
                            </p>
                            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mb-3 text-xs flex items-start gap-1.5 shadow-inner">
                                <span>📍</span>
                                <span className="text-gray-700 font-semibold">{task.customer_address}</span>
                            </div>

                            {task.image_url && (
                                <button onClick={() => setLightboxImg(task.image_url)} className="mb-3 w-max px-2.5 py-1.5 bg-blue-50 text-[#004aad] text-[10px] font-bold rounded-lg border border-blue-200 flex items-center gap-1 hover:bg-blue-100 transition shadow-sm">
                                    📸 Buka Foto List Belanja/Barang
                                </button>
                            )}

                            {task.tipe_layanan === 'Belanja' && task.bill_details ? (
                                <div className="bg-blue-50/50 p-3 rounded-lg text-xs font-mono border border-blue-100 mb-3 whitespace-pre-wrap text-blue-900 shadow-inner">
                                    <strong className="text-[#004aad] block mb-1 uppercase tracking-wider text-[10px]">Rincian Belanja:</strong>
                                    {task.bill_details}
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono border border-gray-100 mb-3 whitespace-pre-wrap shadow-inner">{task.raw_order_text}</div>
                            )}

                            {/* Info Harga Talangan & Ongkir */}
                            <div className="flex flex-col gap-2 mt-1 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-inner">
                                {task.tipe_layanan === 'Belanja' && (
                                    <div className="flex justify-between items-center text-xs font-bold border-b border-gray-200 pb-2">
                                        <span className="text-gray-500">Estimasi Belanja (Talangan):</span>
                                        <span className="text-red-500 text-sm notranslate">Rp {parseInt(task.total_price||0).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs font-black">
                                    <span className="text-gray-600">Ongkir / Jasa:</span>
                                    <span className="text-emerald-600 text-lg notranslate">Rp {parseInt(task.delivery_fee||0).toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            {/* Tombol Aksi */}
                            {!isHold && !isWaiting && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleHoldOrder(task.id)} className="flex-[0.8] bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-[0_4px_0_#c2410c] active:shadow-[0_0px_0_#c2410c] active:translate-y-1 transition text-xs flex justify-center items-center gap-1">
                                        ⚠️ Kendala
                                    </button>
                                    <button onClick={() => openCompleteModal(task)} className="flex-[1.2] bg-emerald-500 text-white font-black py-3.5 rounded-xl shadow-[0_4px_0_#047857] active:shadow-[0_0px_0_#047857] active:translate-y-1 transition text-xs flex justify-center items-center gap-1 uppercase tracking-wider">
                                        ✅ Selesai
                                    </button>
                                </div>
                            )}
                            
                            {isHold && (
                                <div className="pl-2 mt-2">
                                    <div className="bg-orange-100 p-2.5 rounded-lg border border-orange-200 shadow-inner">
                                        <p className="text-[10px] font-black text-orange-800 uppercase mb-1">💬 Laporan Kendala Kamu:</p>
                                        <p className="text-xs text-orange-900 font-bold whitespace-pre-wrap">{task.kendala_info}</p>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => submitTidakBisaLanjut(task.id)} className="flex-[0.8] bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-[0_4px_0_#b91c1c] active:shadow-[0_0px_0_#b91c1c] active:translate-y-1 transition text-xs flex justify-center items-center gap-1">
                                            Nyerah (Batal)
                                        </button>
                                        <button onClick={() => handleLanjutProsesKendala(task.id)} className="flex-[1.2] bg-[#004aad] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_0_#1d4ed8] active:shadow-[0_0px_0_#1d4ed8] active:translate-y-1 transition text-xs flex justify-center items-center gap-1">
                                            Lanjut Proses 🚀
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isWaiting && (
                                <div className="pl-2 mt-2 flex flex-col h-full">
                                    <div className="bg-red-100 p-3 rounded-lg border border-red-200 mb-3 shadow-inner">
                                        <p className="text-[10px] font-black text-red-800 uppercase mb-1 flex items-center gap-1">
                                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                                            MENYERAH (MENUNGGU ADMIN)
                                        </p>
                                        <p className="text-[10px] text-red-700 font-bold">Admin sedang mencarikan kurir pengganti atau membatalkan orderan ini secara sistem.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )})}
                    </>
                )}

                {/* TAB RIWAYAT */}
                {courierMainTab === 'riwayat' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2 mb-2">
                            <select className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 font-bold outline-none" value={courierFilterPeriod} onChange={(e) => setCourierFilterPeriod(e.target.value)}>
                                <option value="today">Hari Ini</option><option value="week">Minggu Ini</option><option value="month">Bulan Ini</option><option value="all">Semua Waktu</option><option value="custom">Pilih Rentang Waktu</option>
                            </select>
                            {courierFilterPeriod === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input type="date" className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 font-bold outline-none" value={courierFilterStartDate} onChange={e => setCourierFilterStartDate(e.target.value)} />
                                    <span className="text-gray-400 font-bold">-</span>
                                    <input type="date" className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 font-bold outline-none" value={courierFilterEndDate} onChange={e => setCourierFilterEndDate(e.target.value)} />
                                </div>
                            )}
                        </div>
                        
                        {courierAnalytics.history.length === 0 && !loading && (
                            <div className="text-center p-10 bg-white rounded-2xl border border-gray-200 shadow-sm mt-4"><span className="text-5xl block mb-3 opacity-30">📭</span><span className="font-bold text-gray-500 block">Riwayat kosong untuk periode ini.</span></div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            {(() => {
                                return (<>
                                    {courierAnalytics.history.slice(0, adminHistoryLimit).map((o, idx) => {
                                        const isFinal = o._viewMode === 'final';
                                        const isNyerah = o._viewMode === 'failed';
                                        
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
                                        <div key={\`\${o.id}-\${idx}\`} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                                            <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                                                <span className={\`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider \${statusColor}\`}>{statusLabel}</span>
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
                                                            <span className="text-red-500 text-sm notranslate">Rp {parseInt(o.total_price||0).toLocaleString('id-ID')}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                                        <span className="text-gray-500">Ongkir/Jasa (Diterima):</span>
                                                        <span className="text-emerald-600 text-sm notranslate">Rp {parseInt(o.delivery_fee||0).toLocaleString('id-ID')}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </>)
                            })()}
                        </div>
                        
                        {courierAnalytics.history.length > adminHistoryLimit && (
                            <div className="flex justify-center mt-6 mb-10">
                                <button onClick={() => setAdminHistoryLimit(prev => prev + 20)} className="bg-white text-[#004aad] px-6 py-2.5 rounded-xl font-bold shadow-sm border border-[#004aad] hover:bg-blue-50 transition">
                                    Tampilkan Lebih Banyak ({courierAnalytics.history.length - adminHistoryLimit} tersisa)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB ANALITIK */}
                {courierMainTab === 'analitik' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2 mb-2">
                            <select className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 font-bold outline-none" value={courierFilterPeriod} onChange={(e) => setCourierFilterPeriod(e.target.value)}>
                                <option value="today">Hari Ini</option><option value="week">Minggu Ini</option><option value="month">Bulan Ini</option><option value="all">Semua Waktu</option><option value="custom">Pilih Rentang Waktu</option>
                            </select>
                            {courierFilterPeriod === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input type="date" className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 font-bold outline-none" value={courierFilterStartDate} onChange={e => setCourierFilterStartDate(e.target.value)} />
                                    <span className="text-gray-400 font-bold">-</span>
                                    <input type="date" className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 font-bold outline-none" value={courierFilterEndDate} onChange={e => setCourierFilterEndDate(e.target.value)} />
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-50 rounded-full opacity-50 pointer-events-none"></div>
                            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 relative z-10">
                                <img src="/chart-icon.webp" className="w-5 h-5" alt="Icon" /> Ringkasan Performa
                            </h3>
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Total Selesai</p>
                                    <p className="text-2xl font-black text-[#004aad]">{courierAnalytics.sukses}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-center gap-1">
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-gray-600">🛒 Belanja</span> <span className="text-[10px] font-bold text-gray-900">{courierAnalytics.belanjaSks}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-gray-600">🛵 Ojek</span> <span className="text-[10px] font-bold text-gray-900">{courierAnalytics.ojekSks}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-gray-600">📦 Kirim</span> <span className="text-[10px] font-bold text-gray-900">{courierAnalytics.kirimSks}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#004aad] text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
                            <div className="absolute bottom-0 right-0 -mb-4 -mr-4 w-24 h-24 bg-white/10 rounded-full opacity-50 blur-xl pointer-events-none"></div>
                            <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-blue-100">
                                💰 Laporan Keuangan
                            </h3>
                            <div className="space-y-3 relative z-10">
                                <div className="flex justify-between items-end border-b border-white/20 pb-2">
                                    <span className="text-[11px] font-medium text-blue-200">Pendapatan Kotor</span>
                                    <span className="text-lg font-black text-[#ffde59] notranslate">Rp {courierAnalytics.pendapatan.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-blue-300">Potongan Admin & Kas</span>
                                    <span className="text-[11px] font-bold text-red-300 notranslate">- Rp {courierAnalytics.potongan.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/20 pb-3">
                                    <span className="text-[10px] text-blue-300">Denda Target Mingguan</span>
                                    <span className="text-[11px] font-bold text-red-300 notranslate">- Rp {courierAnalytics.denda.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-end pt-1">
                                    <span className="text-xs font-bold text-white">Pendapatan Bersih</span>
                                    <span className="text-2xl font-black text-[#ffde59] notranslate">Rp {courierAnalytics.bersih.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-sm font-black text-gray-900 mb-4">Tren Performa Harian</h3>
                            <div className="h-48 w-full">
                                {courierAnalytics.trendDataTime && courierAnalytics.trendDataTime.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={courierAnalytics.trendDataTime} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                            <XAxis dataKey="timeLabel" tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <RechartsTooltip 
                                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '10px', fontWeight: 'bold'}}
                                                cursor={{stroke: '#e5e7eb', strokeWidth: 2}}
                                            />
                                            <Line type="monotone" name="Sukses" dataKey="success" stroke="#059669" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                            <Line type="monotone" name="Gagal/Batal" dataKey="failed" stroke="#ea580c" strokeWidth={2} dot={{r: 3}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold">Belum ada data untuk ditampilkan</div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* TAB PROFIL */}
                {courierMainTab === 'profil' && (
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center relative overflow-hidden">
                            <div className="absolute inset-0 h-24 bg-[#004aad]"></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-white rounded-full mx-auto shadow-md border-4 border-white overflow-hidden mb-3 p-2 flex items-center justify-center">
                                    <img src="/kurir-tutahtitah.webp" alt="Avatar" className="w-full h-full object-contain" />
                                </div>
                                <h2 className="text-xl font-black text-gray-900">{user.name}</h2>
                                <p className="text-xs font-bold text-gray-500 mb-1">{user.email}</p>
                                <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">Mitra Kurir</span>
                                
                                <div className="space-y-3 text-left">
                                    <button onClick={openCourierSettings} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold py-4 px-4 rounded-xl border border-gray-200 transition flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">⚙️</span>
                                            <span>Pengaturan Profil & PIN</span>
                                        </div>
                                        <span className="text-gray-400">❯</span>
                                    </button>
                                    <button onClick={handleLogout} className="w-full bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold py-4 px-4 rounded-xl border border-red-100 transition flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl group-hover:text-white transition">🚪</span>
                                            <span>Keluar Akun (Logout)</span>
                                        </div>
                                        <span className="text-red-300 group-hover:text-white transition">❯</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
          </div>
        )}
`;

code = code.substring(0, courierUIBlockIndex) + newCourierUI + code.substring(endIndex + 1);

fs.writeFileSync('c:/tutahtitah-ecosystem/aplikasi_internal/src/App.jsx', code);
console.log('Successfully updated Courier UI');

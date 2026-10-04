
// ✅ [LEVEL 2 #10] Tab Manajemen Tim / HRD Admin — di-extract dari App.jsx
// Props:
// - allEmployees: list seluruh karyawan (state global di App.jsx)
// - hrSearch, setHrSearch: state pencarian karyawan (global di App.jsx)
// - courierRatingStats: statistik rating kurir { [id]: { average, count } }
// - onAddEmployee: () => void — reset hrForm & buka HrModal (di App.jsx)
// - onEditEmployee: (emp) => void — isi hrForm & buka HrModal (openEditEmployee)
// - onDeleteEmployee: (id, name) => void — nonaktifkan karyawan
// - onRestoreEmployee: (id, name) => void — aktifkan kembali karyawan

// Komponen UI Kartu Karyawan (Biar kodingan nggak diulang-ulang)
const EmployeeCard = ({ emp, courierRatingStats, onEditEmployee, onDeleteEmployee, onRestoreEmployee }) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-5 relative overflow-hidden flex flex-col h-full">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-2 sm:mb-3 border-b border-gray-100 pb-2 gap-1.5">
            <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2.5 py-1 rounded uppercase tracking-wider w-max ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                {emp.role === 'admin' ? '👑 Admin' : '🛵 Kurir'}
            </span>
            {emp.pin && emp.pin.startsWith('BANNED_') ? (
                <span className="text-[8px] sm:text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-1 rounded w-max">NONAKTIF</span>
            ) : emp.auth_id ? (
                <span className="text-[8px] sm:text-[9px] font-bold text-green-700 bg-green-50 px-1.5 sm:px-2 py-1 rounded border border-green-100 w-max">Verified</span>
            ) : (
                <span className="text-[8px] sm:text-[9px] font-bold text-red-700 bg-red-50 px-1.5 sm:px-2 py-1 rounded border border-red-100 w-max">No Auth</span>
            )}
        </div>

        <div className="mb-3 flex-grow">
            <h3 className="font-bold text-gray-900 text-sm sm:text-lg leading-tight line-clamp-2">{emp.full_name}</h3>
            <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold mb-2 mt-0.5">🗓️ Join: {emp.created_at ? new Date(emp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>

            {emp.role === 'courier' && (
                <div className="flex items-center gap-1.5 mb-2 bg-yellow-50/50 w-max px-2 py-1 rounded border border-yellow-100">
                    <span className="text-yellow-400 text-xs">⭐</span>
                    <span className="text-[10px] font-bold text-gray-700">{courierRatingStats[emp.id]?.average || '0.0'}</span>
                    <span className="text-[9px] text-gray-400">({courierRatingStats[emp.id]?.count || 0})</span>
                </div>
            )}

            <div className="flex flex-col gap-0.5 mt-2">
                <p className="text-[9px] sm:text-xs text-gray-600 font-medium flex items-center gap-1.5"><span className="text-gray-400">📱</span> <span className="truncate">{emp.phone || '-'}</span></p>
                <p className="text-[9px] sm:text-xs text-gray-600 font-medium flex items-center gap-1.5"><span className="text-gray-400">📧</span> <span className="truncate">{emp.email || '-'}</span></p>
            </div>
        </div>

        <div className="bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-100 mb-3">
            <p className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase mb-1 border-b border-gray-200 pb-1">Rekening</p>
            <p className="text-[8px] sm:text-[10px] font-mono text-gray-700 truncate"><span className="font-bold text-gray-500">B1:</span> {emp.bank_name ? `${emp.bank_name}-${emp.account_number}` : '-'}</p>
            <p className="text-[8px] sm:text-[10px] font-mono text-gray-700 truncate mt-0.5"><span className="font-bold text-gray-500">B2:</span> {emp.bank_name_2 ? `${emp.bank_name_2}-${emp.account_number_2}` : '-'}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-auto pt-2 border-t border-gray-100">
            <button onClick={() => onEditEmployee(emp)} className="flex-1 bg-blue-50 text-[#004aad] hover:bg-blue-100 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border border-blue-100">
                ✏️ Edit
            </button>
            {emp.pin && emp.pin.startsWith('BANNED_') ? (
                <button onClick={() => onRestoreEmployee(emp.id, emp.full_name)} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border border-emerald-100">
                    ✅ Aktifkan
                </button>
            ) : (
                <button onClick={() => onDeleteEmployee(emp.id, emp.full_name)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border border-red-100">
                    🚫 Nonaktif
                </button>
            )}
        </div>
    </div>
);

export default function AdminTimTab({ allEmployees, hrSearch, setHrSearch, courierRatingStats, onAddEmployee, onEditEmployee, onDeleteEmployee, onRestoreEmployee }) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Manajemen Karyawan (HRD)</h2>
                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Hanya Admin yang dapat menambahkan anggota baru. Akses publik ditutup.</p>
                </div>
                <button onClick={onAddEmployee} className="w-full md:w-auto bg-[#004aad] hover:bg-[#003b8a] text-white px-6 py-3 rounded-xl font-bold shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm">
                    ➕ Daftarkan Anggota
                </button>
            </div>

            {/* BLOK PENCARIAN KARYAWAN */}
            <div className="relative w-full">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input
                    type="text"
                    placeholder="Cari Nama Anggota / Karyawan..."
                    className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl pl-11 pr-4 py-3.5 font-medium outline-none focus:border-[#004aad] shadow-sm"
                    value={hrSearch}
                    onChange={(e) => setHrSearch(e.target.value)}
                />
            </div>

            {/* LOGIKA GROUPING & SORTING KARYAWAN */}
            {(() => {
                const searched = allEmployees.filter(emp => (emp.full_name || '').toLowerCase().includes(hrSearch.toLowerCase()));

                // 1. KELOMPOK AKTIF (Admin di atas, lalu sesuai abjad)
                const activeList = searched.filter(emp => !(emp.pin && emp.pin.startsWith('BANNED_'))).sort((a, b) => {
                    if (a.role === 'admin' && b.role !== 'admin') return -1;
                    if (a.role !== 'admin' && b.role === 'admin') return 1;
                    return (a.full_name || '').localeCompare(b.full_name || '');
                });

                // 2. KELOMPOK NONAKTIF (Sesuai abjad)
                const inactiveList = searched.filter(emp => emp.pin && emp.pin.startsWith('BANNED_')).sort((a, b) => {
                    return (a.full_name || '').localeCompare(b.full_name || '');
                });

                return (
                    <div className="space-y-6">
                        {searched.length === 0 && (
                            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                                <span className="text-4xl block mb-2 opacity-50">🔍</span>
                                <p className="font-bold text-gray-500">Tidak ada anggota yang cocok dengan pencarian.</p>
                            </div>
                        )}

                        {/* SECTION ANGGOTA AKTIF */}
                        {activeList.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <h3 className="font-bold text-gray-800 text-sm">Anggota Aktif ({activeList.length})</h3>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                                    {activeList.map(emp => <EmployeeCard key={emp.id} emp={emp} courierRatingStats={courierRatingStats} onEditEmployee={onEditEmployee} onDeleteEmployee={onDeleteEmployee} onRestoreEmployee={onRestoreEmployee} />)}
                                </div>
                            </div>
                        )}

                        {/* SECTION ANGGOTA NONAKTIF (BANNED) */}
                        {inactiveList.length > 0 && (
                            <div className="pt-4 border-t border-gray-200 border-dashed">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <h3 className="font-bold text-gray-800 text-sm">Anggota Dinonaktifkan ({inactiveList.length})</h3>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 opacity-75">
                                    {inactiveList.map(emp => <EmployeeCard key={emp.id} emp={emp} courierRatingStats={courierRatingStats} onEditEmployee={onEditEmployee} onDeleteEmployee={onDeleteEmployee} onRestoreEmployee={onRestoreEmployee} />)}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

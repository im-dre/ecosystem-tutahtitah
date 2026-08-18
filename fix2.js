const fs = require('fs');
let code = fs.readFileSync('c:/tutahtitah-ecosystem/aplikasi_internal/src/App.jsx', 'utf-8');

// 1. Inject state
code = code.replace(
    /const \[adminHistorySearch, setAdminHistorySearch\] = useState\(''\);/,
    "const [adminHistorySearch, setAdminHistorySearch] = useState('');\n  const [adminHistoryLimit, setAdminHistoryLimit] = useState(20);"
);

// 2. Wrap map
const target = `{adminAnalytics.periodOrders
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
                                .filter(o => (o.customer_name || o.customer_wa || '').toLowerCase().includes(adminHistorySearch.toLowerCase()))
                                .map(o => {`;

const replacement = `{(() => {
                                const filteredOrders = adminAnalytics.periodOrders
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
                                    {filteredOrders.slice(0, adminHistoryLimit).map(o => {`;

code = code.replace(target, replacement);

const targetEnd = `)}
                        </div>
                    </div>
                )}

                {/* TAB ANALITIK ADMIN */}`;

const replaceEnd = `)}
                        </div>
                        {filteredOrders.length > adminHistoryLimit && (
                            <div className="flex justify-center mt-6">
                                <button onClick={() => setAdminHistoryLimit(prev => prev + 20)} className="bg-white text-[#004aad] px-6 py-2.5 rounded-xl font-bold shadow-sm border border-[#004aad] hover:bg-blue-50 transition">
                                    Tampilkan Lebih Banyak ({filteredOrders.length - adminHistoryLimit} tersisa)
                                </button>
                            </div>
                        )}
                        </>)
                        })()}
                    </div>
                )}

                {/* TAB ANALITIK ADMIN */}`;

code = code.replace(targetEnd, replaceEnd);

fs.writeFileSync('c:/tutahtitah-ecosystem/aplikasi_internal/src/App.jsx', code);
console.log('Done');

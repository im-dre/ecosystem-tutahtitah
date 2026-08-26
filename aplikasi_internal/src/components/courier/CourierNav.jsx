import React from "react";

const CourierNav = ({ courierMainTab, setCourierMainTab, activeOrdersCount, forwardedReportsCount, unreadChatCount = 0 }) => {
    const menuItems = [
        { key: 'tugas', icon: '/dekstop-icon.webp', label: 'Live Orderan', badge: activeOrdersCount },
        { key: 'riwayat', icon: '/clock-icon.webp', label: 'Riwayat Order' },
        { key: 'analitik', icon: '/chart-icon.webp', label: 'Laporan Analitik' },
        { key: 'pelanggaran', emoji: '🚩', label: 'Pelanggaran', badge: forwardedReportsCount },
        { key: 'chat', emoji: '💬', label: 'Chat', badge: unreadChatCount },
        { key: 'profil', icon: '/avatar-icon.webp', label: 'Profil Kurir' },
    ];

    return (
        <>
            {/* ── SIDEBAR NAVIGATION (tablet: top tabs | desktop: left sidebar) ── */}
            <div className="no-print md:shrink-0">

                {/* Tablet: top horizontal tab bar */}
                <div className="hidden md:flex lg:hidden bg-white border-b border-gray-200 shadow-sm px-2 gap-1">
                    {menuItems.map(({ key, icon, emoji, label, badge }) => (
                        <button key={key} onClick={() => setCourierMainTab(key)}
                            className={`relative flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition whitespace-nowrap flex-1 justify-center ${courierMainTab === key
                                ? 'text-[#004aad] border-[#004aad] bg-blue-50/50'
                                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                                }`}>
                            {emoji ? (
                                <span className={`text-xl ${courierMainTab === key ? '' : 'grayscale opacity-50'}`}>{emoji}</span>
                            ) : (
                                <img src={icon} className={`w-5 h-5 object-contain ${courierMainTab === key ? '' : 'grayscale opacity-50'}`} alt={label} />
                            )}
                            <span>{label}</span>
                            {badge > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow border border-white animate-pulse">{badge}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Desktop: left vertical sidebar */}
                <div className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200 shadow-sm min-h-screen sticky top-0 pt-6">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 px-5 mb-3">Menu</p>
                    {menuItems.map(({ key, icon, emoji, label, badge }) => (
                        <button key={key} onClick={() => setCourierMainTab(key)}
                            className={`relative flex items-center gap-3 mx-3 px-3 py-3 rounded-xl font-bold text-sm transition mb-1 ${courierMainTab === key
                                ? 'bg-blue-50/50 text-[#004aad] shadow-sm border border-blue-100'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                                }`}>
                            {emoji ? (
                                <span className={`text-xl ${courierMainTab === key ? '' : 'grayscale opacity-60'}`}>{emoji}</span>
                            ) : (
                                <img src={icon} className={`w-5 h-5 object-contain ${courierMainTab === key ? '' : 'grayscale opacity-60'}`} alt={label} />
                            )}
                            <span>{label}</span>
                            {badge > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow animate-pulse">{badge}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── BOTTOM NAV: mobile only ── */}
            <div className="no-print md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-around items-end shadow-[0_-8px_24px_rgba(0,0,0,0.08)] pb-safe-area-inset-bottom">
                {/* LIVE ORDERAN - FAB Protruding */}
                <button onClick={() => setCourierMainTab('tugas')} className="relative flex flex-col items-center justify-end w-full flex-1 h-14 pb-2 transition group active:scale-95">
                    <div className={`absolute -top-4 w-14 h-14 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-lg ${courierMainTab === 'tugas'
                        ? 'bg-white border-transparent scale-110 -translate-y-2 shadow-[0_4px_18px_rgba(0,74,173,0.35)]'
                        : 'bg-white border-gray-200 scale-100'
                        }`}>
                        <img src="/dekstop-icon.webp"
                            className={`w-8 h-8 object-contain transition-all duration-300 ${courierMainTab === 'tugas' ? 'opacity-100' : 'opacity-40 grayscale'
                                }`} alt="Orderan" />
                    </div>
                    {activeOrdersCount > 0 && (
                        <span className={`absolute top-0 right-1/4 translate-x-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse border-2 border-white z-10 transition-all duration-300 ${courierMainTab === 'tugas' ? '-translate-y-3' : '-translate-y-1'}`}>
                            {activeOrdersCount}
                        </span>
                    )}
                    <span className={`text-[10px] font-bold mt-1 whitespace-nowrap transition-colors ${courierMainTab === 'tugas' ? 'text-[#004aad]' : 'text-gray-400'}`}>Live Orderan</span>
                </button>

                {[{ key: 'riwayat', icon: '/clock-icon.webp', label: 'Riwayat' },
                { key: 'analitik', icon: '/chart-icon.webp', label: 'Analitik' },
                { key: 'pelanggaran', emoji: '🚩', label: 'Pelanggaran' },
                { key: 'chat', emoji: '💬', label: 'Chat' },
                { key: 'profil', icon: '/avatar-icon.webp', label: 'Profil' }].map(({ key, icon, emoji, label }) => (
                    <button key={key} onClick={() => setCourierMainTab(key)}
                        className={`relative flex flex-col items-center justify-center gap-1 py-2 font-bold text-[10px] w-full flex-1 transition-all duration-300 active:scale-95 ${courierMainTab === key ? 'text-[#004aad] -translate-y-1' : 'text-gray-400'
                            }`}>
                        {emoji ? (
                            <span className={`text-2xl ${courierMainTab === key ? 'scale-110 drop-shadow-sm' : 'grayscale opacity-50 scale-100'}`}>{emoji}</span>
                        ) : (
                            <img src={icon} className={`w-6 h-6 object-contain transition-all duration-300 ${courierMainTab === key ? 'scale-110 drop-shadow-sm' : 'grayscale opacity-50 scale-100'}`} alt={label} />
                        )}
                        {key === 'pelanggaran' && forwardedReportsCount > 0 && (
                            <span className="absolute top-1 right-1/4 translate-x-2 bg-red-500 w-2 h-2 rounded-full shadow-lg animate-pulse border-2 border-white z-10 transition-all duration-300"></span>
                        )}
                        {key === 'chat' && unreadChatCount > 0 && (
                            <span className="absolute top-1 right-1/4 translate-x-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-white animate-pulse z-10 transition-all duration-300">{unreadChatCount}</span>
                        )}
                        <span className="leading-none whitespace-nowrap">{label}</span>
                    </button>
                ))}
            </div>
        </>
    );
};

export default CourierNav;

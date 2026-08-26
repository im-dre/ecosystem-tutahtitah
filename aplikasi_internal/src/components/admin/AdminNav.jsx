import React from "react";

const ADMIN_TABS = [
    { key: 'operasional', icon: '/dekstop-icon.webp', alt: 'Live', shortLabel: 'Live Orderan', fullLabel: 'Operasional (Live)' },
    { key: 'riwayat', icon: '/clock-icon.webp', alt: 'Riwayat', shortLabel: 'Riwayat', fullLabel: 'Riwayat Order' },
    { key: 'laporan', icon: '/chart-icon.webp', alt: 'Analitik', shortLabel: 'Analitik', fullLabel: 'Laporan & Analitik' },
    { key: 'tim', icon: '/tim-icon.webp', alt: 'Tim', shortLabel: 'Tim', fullLabel: 'Manajemen Tim' },
    { key: 'portal', icon: '/globe-icon.webp', alt: 'Publik', shortLabel: 'Publik', fullLabel: 'Manajemen Publik' },
    { key: 'chat', emoji: '💬', alt: 'Chat', shortLabel: 'Chat', fullLabel: 'Live Chat' },
];

const AdminNav = ({ adminMainTab, setAdminMainTab, unreadChatCount = 0 }) => {
    return (
        <div className="no-print fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-around items-center md:relative md:justify-start md:border-t-0 md:border-b md:px-4 md:pt-2 md:gap-2 overflow-x-auto hide-scrollbar shadow-[0_-4px_15px_rgba(0,0,0,0.05)] md:shadow-none pb-2 pt-1 md:pb-0 md:pt-0">
            {ADMIN_TABS.map(({ key, icon, emoji, alt, shortLabel, fullLabel }) => (
                <button key={key} onClick={() => setAdminMainTab(key)} className={`relative flex flex-col md:flex-row items-center justify-center gap-1 py-1 md:px-4 md:py-3 font-bold text-[10px] md:text-sm w-full md:w-auto transition-all duration-300 md:border-b-2 whitespace-nowrap ${adminMainTab === key ? 'text-[#004aad] md:border-[#004aad] -translate-y-1 md:translate-y-0' : 'text-gray-400 md:text-gray-500 md:border-transparent hover:text-gray-700 hover:bg-gray-50'}`}>
                    {emoji ? (
                        <span className={`text-2xl md:text-xl transition-all duration-300 ${adminMainTab === key ? 'scale-110 drop-shadow-sm md:scale-100 md:drop-shadow-none' : 'grayscale opacity-60 scale-100'}`}>{emoji}</span>
                    ) : (
                        <img src={icon} className={`w-6 h-6 md:w-5 md:h-5 object-contain transition-all duration-300 ${adminMainTab === key ? 'scale-110 drop-shadow-sm md:scale-100 md:drop-shadow-none' : 'grayscale opacity-60 scale-100'}`} alt={alt} />
                    )}
                    {key === 'chat' && unreadChatCount > 0 && (
                        <span className="absolute top-0 right-2 md:top-1 md:-right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow border border-white animate-pulse">{unreadChatCount}</span>
                    )}
                    <span className="leading-none mt-1 md:mt-0 md:hidden">{shortLabel}</span>
                    <span className="hidden md:inline">{fullLabel}</span>
                </button>
            ))}
        </div>
    );
};

export default AdminNav;

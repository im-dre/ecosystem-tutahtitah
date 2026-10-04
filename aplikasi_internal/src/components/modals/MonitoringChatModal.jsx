import { useEffect } from 'react';
import { AlertTriangle, Eye, Lock, RefreshCw, X } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

export default function MonitoringChatModal({
  isOpen,
  chats = [],
  loading = false,
  hasMore = false,
  disablingChatId = null,
  onClose,
  onRefresh,
  onLoadMore,
  onOpenChat,
  onDisableChat,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    onRefresh?.({ signal: controller.signal });

    return () => controller.abort();
  }, [isOpen, onRefresh]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 p-0 sm:p-6 flex items-end sm:items-center" onClick={onClose}>
      <section className="w-full max-w-3xl mx-auto h-[92vh] sm:h-[80vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-slate-950 text-white">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center"><Eye size={21} /></div>
          <div className="flex-1">
            <h2 className="font-bold">Monitoring Chat</h2>
            <p className="text-xs text-slate-300">CCTV admin — pantau indikasi pelanggaran</p>
          </div>
          <button onClick={onRefresh} disabled={loading} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center disabled:opacity-50" title="Muat ulang">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center" title="Tutup"><X size={20} /></button>
        </header>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading && chats.length === 0 ? (
            <div className="h-48 flex items-center justify-center"><div className="w-7 h-7 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" /></div>
          ) : chats.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-gray-400 gap-2"><Eye size={28} /><p className="text-sm font-medium">Belum ada chat untuk dipantau</p></div>
          ) : chats.map((chat) => (
            <article key={chat.id} className="p-4 flex gap-3 items-center hover:bg-gray-50">
              <button className="flex-1 min-w-0 text-left" onClick={() => onOpenChat?.(chat.id)}>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-gray-900 truncate">{chat.displayName}</p>
                  {chat.isDisabledByAdmin && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 font-bold rounded bg-red-100 text-red-700"><Lock size={10} /> Dinonaktifkan</span>}
                  <span className="ml-auto text-[10px] text-gray-400 whitespace-nowrap">{chat.lastTime ? dayjs(chat.lastTime).format('DD MMM, HH:mm') : '-'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{chat.displaySubtitle}</p>
                <p className="text-xs text-gray-600 truncate mt-1">{chat.lastMessage || 'Belum ada pesan'}</p>
              </button>
              <button
                disabled={chat.isDisabledByAdmin || disablingChatId === chat.id}
                onClick={() => onDisableChat?.(chat)}
                className="shrink-0 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {disablingChatId === chat.id ? 'Memproses...' : chat.isDisabledByAdmin ? 'Terkunci' : 'Nonaktifkan'}
              </button>
            </article>
          ))}
        </div>

        {hasMore && <footer className="p-3 border-t border-gray-100"><button onClick={onLoadMore} disabled={loading} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold disabled:opacity-50">{loading ? 'Memuat...' : 'Muat chat lainnya'}</button></footer>}
        <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex gap-2 text-[11px] text-amber-800"><AlertTriangle size={15} className="shrink-0" />Kill Switch langsung mengunci room dan mengirim pengumuman sistem. Tindakan ini tidak dapat dibatalkan dari dashboard.</div>
      </section>
    </div>
  );
}
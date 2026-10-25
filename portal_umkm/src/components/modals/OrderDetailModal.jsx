import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import useRealtimeChat from '../../utils/chat_core/useRealtimeChat';

const formatDateTime = (value) => {
  if (!value) return 'Belum tersedia';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum tersedia';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
};

export default function OrderDetailModal({ order, onClose, viewMode = 'detail' }) {
  const [chat, setChat] = useState(null);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const {
    messages,
    isLoading: isLoadingMessages,
    addOptimisticMessage,
    removeMessage,
  } = useRealtimeChat({ supabase, chatId: chat?.id, enabled: viewMode === 'chat' });

  useEffect(() => {
    let isCancelled = false;

    const loadChat = async () => {
      if (!order?.id || viewMode !== 'chat') {
        setChat(null);
        return;
      }

      setIsLoadingChat(true);
      const { data, error } = await supabase
        .from('chats')
        .select('id')
        .eq('order_id', order.id)
        .in('chat_type', ['merchant', 'customer_merchant'])
        .limit(1)
        .maybeSingle();

      if (isCancelled) return;

      if (error) {
        console.error('Gagal memuat chat pesanan:', error);
        setChat(null);
      } else {
        setChat(data);
      }
      setIsLoadingChat(false);
    };

    void loadChat();

    return () => {
      isCancelled = true;
    };
  }, [order?.id, viewMode]);

  useEffect(() => {
    if (chat?.id && viewMode === 'chat') {
      const markAsRead = async () => {
        const { error } = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('chat_id', chat.id)
          .eq('sender_type', 'customer')
          .eq('is_read', false);

        if (error) console.error('Gagal update status read:', error);
      };

      void markAsRead();
    }
  }, [chat?.id, viewMode]);

  useEffect(() => {
    if (!order) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, onClose]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const content = messageText.trim();
    if (!content || isSendingMessage || !order?.id) return;

    setIsSendingMessage(true);
    const hasOrderCard = messages.some((message) => message.metadata?.type === 'order');
    const orderMetadata = hasOrderCard ? null : {
      type: 'order',
      order_id: order.id,
      status: order.status,
      total_price: order.total_price,
      total_amount: order.total_amount,
      delivery_fee: order.delivery_fee,
      tipe_layanan: order.tipe_layanan,
      items: Array.isArray(order.items) ? order.items : [],
      merchant_name: order.merchants?.name || order.merchant_name,
    };
    const temporaryId = `optimistic-${crypto.randomUUID()}`;
    addOptimisticMessage({
      id: temporaryId,
      chat_id: chat?.id,
      content,
      sender_type: 'merchant',
      sender_name: 'UMKM',
      created_at: new Date().toISOString(),
      metadata: orderMetadata,
    });
    setMessageText('');

    const { data: newChatId, error } = await supabase.rpc('send_order_chat_message', {
      p_order_id: order.id,
      p_chat_type: 'customer_merchant',
      p_sender_type: 'merchant',
      p_content: content,
      p_metadata: orderMetadata,
    });

    if (error) {
      console.error('Gagal mengirim pesan pesanan:', error);
      removeMessage(temporaryId);
      setMessageText(content);
      toast.error('Pesan gagal dikirim. Coba lagi ya.');
    } else {
      removeMessage(temporaryId);

      if (!chat?.id && newChatId) {
        // RPC membuat room secara atomik. Simpan ID-nya agar hook langsung
        // memuat pesan pertama dan berlangganan realtime room yang tepat.
        setChat({ id: newChatId });
      }
    }

    setIsSendingMessage(false);
  };

  if (!order) return null;

  const isCancelled = order.status === 'cancelled';
  const isCompleted = order.status === 'completed';
  const finalStatusLabel = isCancelled
    ? 'Dibatalkan'
    : isCompleted
      ? 'Selesai'
      : order.status === 'pending'
        ? 'Menunggu konfirmasi'
        : 'Sedang diproses';
  const finalStatusTime = isCompleted
    ? order.completed_at
    : isCancelled
      ? order.completed_at || order.dispatched_at
      : order.dispatched_at;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-gray-950/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {viewMode === 'chat' ? 'Chat Pembeli' : 'Detail Pesanan'}
            </p>
            <h3 id="order-detail-title" className="mt-1 text-lg font-black text-gray-900">
              #{order.id.toString().substring(0, 8)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail pesanan"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
          >
            <i className="ph ph-x text-lg" />
          </button>
        </div>

        <div className="space-y-5">
          {viewMode === 'detail' && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <i className="ph-fill ph-user-circle text-brand-500" />
              <h4 className="text-sm font-black text-gray-900">Detail Pelanggan</h4>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-bold text-gray-400">Nama</dt>
                <dd className="mt-0.5 font-bold text-gray-800">{order.customer_name || 'Tidak tersedia'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-gray-400">Alamat</dt>
                <dd className="mt-0.5 leading-relaxed text-gray-700">{order.customer_address || 'Tidak tersedia'}</dd>
              </div>
            </dl>
              </section>

              <section>
            <div className="mb-3 flex items-center gap-2">
              <i className="ph-fill ph-clock-counter-clockwise text-brand-500" />
              <h4 className="text-sm font-black text-gray-900">Riwayat Status</h4>
            </div>
            <div className="space-y-4 border-l-2 border-gray-100 pl-4">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-white" />
                <p className="text-sm font-bold text-gray-800">Pesanan dibuat</p>
                <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
              </div>
              <div className="relative">
                <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${isCancelled ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-accent-500'}`} />
                <p className="text-sm font-bold text-gray-800">{finalStatusLabel}</p>
                <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(finalStatusTime)}</p>
              </div>
            </div>
              </section>

              {isCancelled && (
                <section className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-red-700">
                <i className="ph-fill ph-warning-circle" />
                <h4 className="text-sm font-black">Info Kendala</h4>
              </div>
              <p className="text-sm leading-relaxed text-red-700">{order.kendala_info || 'Tidak ada informasi kendala yang dicatat.'}</p>
                </section>
              )}
            </div>
          )}

          {viewMode === 'chat' && (
            <section aria-labelledby="order-chat-title">
            <div className="mb-3 flex items-center gap-2">
              <i className="ph-fill ph-chat-circle-text text-brand-500" />
              <h4 id="order-chat-title" className="text-sm font-black text-gray-900">Obrolan dengan Pelanggan</h4>
            </div>

            <div className="h-64 space-y-3 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-3">
              {isLoadingChat || isLoadingMessages ? (
                <p className="pt-20 text-center text-sm text-gray-400">Memuat obrolan...</p>
              ) : messages.length === 0 ? (
                <p className="pt-20 text-center text-sm text-gray-400">Belum ada pesan untuk pesanan ini.</p>
              ) : (
                messages.map((message) => {
                  const isMerchantMessage = message.sender_type === 'merchant';

                  return (
                    <div key={message.id} className={`flex min-w-0 ${isMerchantMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] shrink-0 rounded-2xl px-3 py-2 text-sm shadow-sm ${isMerchantMessage ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-white text-gray-800'}`}>
                        <p className="break-words leading-relaxed">{message.content}</p>
                        <p className={`mt-1 text-[10px] font-semibold ${isMerchantMessage ? 'text-white/80' : 'text-gray-500'}`}>
                          {message.sender_name}
                        </p>
                        <p className={`mt-1 text-[10px] ${isMerchantMessage ? 'text-white/70' : 'text-gray-400'}`}>
                          {formatDateTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isCompleted || isCancelled ? (
              <p className="mt-3 text-center text-sm italic text-gray-400">Obrolan telah ditutup</p>
            ) : (
              <form className="mt-3 flex gap-2" onSubmit={handleSendMessage}>
                <label className="sr-only" htmlFor="order-chat-message">Tulis pesan untuk pelanggan</label>
                <input
                  id="order-chat-message"
                  type="text"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Tulis pesan..."
                  maxLength={1000}
                  disabled={isSendingMessage}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || isSendingMessage}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSendingMessage ? 'Mengirim...' : 'Kirim'}
                </button>
              </form>
            )}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
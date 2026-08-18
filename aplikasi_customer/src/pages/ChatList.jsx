import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { MessageSquare, ArrowLeft, Trash2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('id');

export default function ChatList() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedChatToDelete, setSelectedChatToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const longPressTimer = useRef(null);

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/auth');
      setUser(user);

      // Fetch chats where customer_id is current user
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          chat_type,
          participant_id,
          order_id,
          status,
          updated_at,
          orders ( status ),
          messages (
            content,
            created_at,
            is_read,
            sender_type,
            is_deleted_by_customer
          )
        `)
        .eq('customer_id', user.id)
        .eq('is_deleted_by_customer', false)
        .order('updated_at', { ascending: false });

      if (data && !error) {
        // Format the data to easily display latest message
        const formattedChats = await Promise.all(data.map(async chat => {
          // Sort messages to get the latest one (ignore soft-deleted messages)
          const validMessages = (chat.messages || []).filter(m => m.is_deleted_by_customer !== true);
          const sortedMessages = validMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const latestMessage = sortedMessages[0];

          let title = 'Customer Service';
          let avatar = '/icon-cs.webp'; // Placeholder fallback

          if (chat.chat_type === 'merchant') {
            title = 'Toko / Merchant';
            avatar = '/icon-belanja.webp';
            const { data: mData } = await supabase.from('merchants').select('name, logo_url').eq('id', chat.participant_id).maybeSingle();
            if (mData) {
              title = mData.name;
              if (mData.logo_url) avatar = mData.logo_url;
            }
          } else if (chat.chat_type === 'courier') {
            title = 'Kurir Driver';
            avatar = '/icon-ojek.webp';
            const { data: cData } = await supabase.from('employees').select('full_name').eq('id', chat.participant_id).maybeSingle();
            if (cData) {
              title = cData.full_name;
            }
          }

          if (chat.order_id) {
            title += ` (Order #${chat.order_id})`;
          }

          let isClosed = false;
          if (chat.orders && ['completed', 'cancelled', 'rejected'].includes(chat.orders.status)) {
            isClosed = true;
          }

          return {
            ...chat,
            title,
            avatar,
            isClosed,
            latestMessage,
            unreadCount: sortedMessages.filter(m => m.sender_type !== 'customer' && !m.is_read).length
          };
        }));
        
        setChats(formattedChats);
      }
      setLoading(false);
    };

    fetchChats();
  }, [navigate]);

  const handleTouchStart = (chat) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedChatToDelete(chat);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChatToDelete) return;
    setIsDeleting(true);
    const chatId = selectedChatToDelete.id;

    // Backup state for rollback
    const prevChatsState = [...chats];

    // Optimistic update
    setChats(prev => prev.filter(c => c.id !== chatId));
    setSelectedChatToDelete(null);

    // Soft delete on server
    const { error } = await supabase.from('chats').update({ is_deleted_by_customer: true }).eq('id', chatId);
    if (error) {
      console.error("Delete Chat Error:", error);
      toast.error('Gagal menghapus obrolan dari server');
      setChats(prevChatsState); // Rollback
    } else {
      toast.success('Obrolan dihapus');
    }
    setIsDeleting(false);
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    setIsDeleting(true);
    
    // Backup state for rollback
    const prevChatsState = [...chats];

    // Optimistic update
    setChats([]);
    setShowDeleteAllModal(false);

    // Soft delete all chats for this customer
    const { error } = await supabase.from('chats').update({ is_deleted_by_customer: true }).eq('customer_id', user.id);
    if (error) {
      console.error("Delete All Chats Error:", error);
      toast.error('Gagal menghapus semua obrolan dari server');
      setChats(prevChatsState); // Rollback
    } else {
      toast.success('Semua obrolan berhasil dihapus');
    }
    setIsDeleting(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto sm:border-x sm:border-gray-200">
      {/* Header */}
      <div className="bg-white px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">Pesan Masuk</h1>
        {chats.length > 0 && (
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="p-2 -mr-2 rounded-full text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 items-center bg-white p-3 rounded-2xl border border-gray-100 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : chats.length > 0 ? (
          <div className="space-y-3">
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => {
                  // Prevent navigation if long press was triggered
                  if (!selectedChatToDelete) navigate(`/chat/${chat.id}`);
                }}
                onTouchStart={() => handleTouchStart(chat)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleTouchStart(chat)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                className="flex gap-3 items-center bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all cursor-pointer select-none"
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border ${chat.isClosed ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
                    {chat.avatar ? (
                      <img src={chat.avatar} alt="Avatar" className={`w-8 h-8 object-contain ${chat.isClosed ? 'grayscale opacity-60' : ''}`} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                    ) : null}
                    <MessageSquare size={20} className={chat.isClosed ? "text-gray-400" : "text-primary"} style={{ display: chat.avatar ? 'none' : 'block' }} />
                  </div>
                  {chat.isClosed ? (
                    <div className="absolute -bottom-1 -right-2 bg-gray-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md border border-white">SELESAI</div>
                  ) : chat.status === 'open' ? (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-bold text-gray-900 text-sm truncate pr-2">{chat.title}</h3>
                    {chat.latestMessage && (
                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap mt-0.5">
                        {dayjs(chat.latestMessage.created_at).fromNow(true)}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                      {chat.latestMessage
                        ? (chat.latestMessage.sender_type === 'customer' ? 'Anda: ' : '') + chat.latestMessage.content
                        : 'Belum ada pesan'}
                    </p>
                    {chat.unreadCount > 0 && (
                      <div className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
            <div className="w-48 h-48 mx-auto mb-4 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <img src="/empty-chat.webp" alt="Belum ada pesan" className="w-full h-full object-cover" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Belum Ada Pesan</h3>
            <p className="text-sm text-gray-500">
              Obrolan Anda dengan Customer Service, Toko, atau Kurir akan muncul di sini.
            </p>
          </div>
        )}
      </div>

      {/* Tombol Chat CS Global */}
      <div className="p-4 bg-white border-t border-gray-100">
        <button
          onClick={async () => {
            if (!user) return;
            const { data: existingChat } = await supabase
              .from('chats')
              .select('id')
              .eq('customer_id', user.id)
              .eq('chat_type', 'support')
              .limit(1)
              .maybeSingle();

            if (existingChat) {
              navigate(`/chat/${existingChat.id}`);
            } else {
              const { data: newChat, error } = await supabase
                .from('chats')
                .insert({
                  chat_type: 'support',
                  customer_id: user.id,
                  participant_id: '00000000-0000-0000-0000-000000000000'
                })
                .select()
                .single();

              if (newChat && !error) {
                navigate(`/chat/${newChat.id}`);
              }
            }
          }}
          className="w-full bg-white text-primary border border-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-95 transition-all shadow-sm"
        >
          <MessageSquare size={18} />
          Hubungi Customer Service
        </button>
      </div>

      {/* Action Modal (Delete Single Chat) */}
      {selectedChatToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end animate-fadeIn" onClick={() => setSelectedChatToDelete(null)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pb-8 pt-2 px-4 flex flex-col animate-slideUp shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="flex items-center gap-3 p-4 mb-2 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                {selectedChatToDelete.avatar ? (
                  <img src={selectedChatToDelete.avatar} className="w-8 h-8 object-contain" />
                ) : (
                  <MessageSquare size={20} className="text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{selectedChatToDelete.title}</p>
                <p className="text-xs text-gray-500">Pilih tindakan untuk obrolan ini</p>
              </div>
            </div>

            <button disabled={isDeleting} onClick={handleDeleteChat} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 rounded-2xl transition-colors text-left active:bg-red-100 disabled:opacity-50">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <span className="text-base font-semibold text-red-600">Hapus Obrolan</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Modal (Delete All Chats) */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-center p-4 animate-fadeIn" onClick={() => setShowDeleteAllModal(false)}>
          <div className="bg-white w-full max-w-sm mx-auto rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Semua Pesan?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Tindakan ini akan menghapus seluruh riwayat obrolan Anda secara permanen. Apakah Anda yakin?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition-all"
              >
                Batal
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteAll}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

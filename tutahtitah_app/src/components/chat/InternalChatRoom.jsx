import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/compressImage';
import { ArrowLeft, Send, Paperclip, Image as ImageIcon, Receipt, X, Lock, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const DUMMY_ADMIN_ID = '00000000-0000-0000-0000-000000000000';

const formatDateGroup = (dateString) => {
  if (!dateString) return 'Hari ini';
  const date = dayjs(dateString);
  const today = dayjs();
  if (date.isSame(today, 'day')) return 'Hari ini';
  if (date.isSame(today.subtract(1, 'day'), 'day')) return 'Kemarin';
  return date.format('D MMMM YYYY');
};

// Render message bubble content
function MessageBubble({ msg, isMine, currentUser, onLongPress }) {
  let content = null;
  if (msg.metadata) {
    let meta;
    try { meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata; } catch { meta = null; }
    if (meta?.type === 'image') {
      content = (
        <div className="flex flex-col gap-1">
          <img
            src={meta.url}
            alt="Foto"
            className="rounded-xl max-w-[220px] max-h-[220px] object-cover cursor-pointer"
            onClick={() => window.open(meta.url, '_blank')}
          />
          {msg.content && <p className="text-sm mt-1">{msg.content}</p>}
        </div>
      );
    } else if (meta?.type === 'order') {
      const statusColors = {
        completed: 'bg-green-50 border-green-200',
        cancelled: 'bg-red-50 border-red-200',
        processing: 'bg-blue-50 border-blue-200',
      };
      const statusBg = statusColors[meta.status] || 'bg-gray-50 border-gray-200';
      content = (
        <div className={`rounded-xl border p-3 min-w-[200px] ${statusBg}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Receipt size={14} className="text-[#004aad]" />
            <span className="text-xs font-bold text-[#004aad]">Invoice Order</span>
          </div>
          <p className="font-bold text-gray-900 text-sm truncate">{meta.merchant_name || 'Order'}</p>
          <p className="text-xs text-gray-500 capitalize">{meta.tipe_layanan}</p>
          {meta.total_price > 0 && (
            <p className="text-sm font-bold text-[#004aad] mt-1">
              Rp {Number(meta.total_price).toLocaleString('id-ID')}
            </p>
          )}
          <div className="mt-2 pt-2 border-t border-gray-200/80 flex items-center justify-between">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
              meta.status === 'completed' ? 'bg-green-100 text-green-700' :
              meta.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>{meta.status}</span>
            <span className="text-[10px] text-gray-400">#{String(meta.id || '').substring(0, 8)}</span>
          </div>
        </div>
      );
    }
  }
  if (!content) {
    content = <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>;
  }
  return (
    <div
      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-1`}
      onTouchStart={() => onLongPress && onLongPress(msg)}
      onTouchEnd={() => onLongPress && onLongPress(null)}
      onContextMenu={(e) => { e.preventDefault(); onLongPress && onLongPress(msg); }}
    >
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${isMine
        ? 'bg-[#004aad] text-white rounded-br-sm'
        : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
      }`}>
        {content}
        <p className={`text-[9px] mt-1 ${isMine ? 'text-blue-200 text-right' : 'text-gray-400 text-right'}`}>
          {dayjs(msg.created_at).format('HH:mm')}
          {isMine && <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>}
        </p>
      </div>
    </div>
  );
}

export default function InternalChatRoom({ chatId, currentUser, onBack, defaultOrderId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatInfo, setChatInfo] = useState(null);
  const [participantName, setParticipantName] = useState('');
  const [participantAvatar, setParticipantAvatar] = useState(null);
  const [participantSubtitle, setParticipantSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [relevantOrders, setRelevantOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [stagedAttachment, setStagedAttachment] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const longPressTimer = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (chatId && currentUser) initChat();
  }, [chatId, currentUser]);

  const initChat = async () => {
    setLoading(true);
    try {
      // Fetch chat info
      const { data: chatData, error } = await supabase.from('chats').select('*').eq('id', chatId).single();
      if (error) throw error;
      setChatInfo(chatData);

      // Determine participant info based on chat_type
      await resolveParticipantInfo(chatData);

      // Check if chat should be closed (for courier chats with order)
      if (chatData.order_id && currentUser.role === 'courier') {
        const { data: orderData } = await supabase.from('orders').select('status').eq('id', chatData.order_id).maybeSingle();
        if (orderData && ['completed', 'cancelled', 'rejected'].includes(orderData.status)) {
          setIsChatClosed(true);
        }
      }

      // Fetch messages
      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (msgData) setMessages(msgData);
      setLoading(false);
      setTimeout(scrollToBottom, 150);

      // Mark unread as read — gunakan sender_type bukan sender_id
      // karena sender_id bisa berupa auth_id (customer) atau employee_id (tergantung pengirim)
      const senderTypesToRead = currentUser.role === 'admin'
        ? ['customer', 'merchant'] // Admin hanya perlu baca pesan dari customer/merchant
        : ['customer'];             // Kurir hanya perlu baca pesan dari customer

      const { error: markReadErr } = await supabase.from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .in('sender_type', senderTypesToRead)
        .eq('is_read', false);

      if (!markReadErr) {
        // Update local state agar UI langsung reflect is_read tanpa tunggu realtime
        setMessages(prev => prev.map(m =>
          senderTypesToRead.includes(m.sender_type) ? { ...m, is_read: true } : m
        ));
      }

    } catch (err) {
      console.error('InternalChatRoom init error:', err);
      toast.error('Gagal memuat chat');
      setLoading(false);
    }
  };

  const resolveParticipantInfo = async (chatData) => {
    const { chat_type, participant_id, customer_id, initiator_id } = chatData;
    if (chat_type === 'support') {
      // Admin ↔ Customer
      if (customer_id) {
        const { data } = await supabase.from('customers').select('name, phone').eq('auth_id', customer_id).maybeSingle();
        setParticipantName(data?.name || data?.phone || 'Customer');
        setParticipantSubtitle('👤 Customer');
      }
    } else if (chat_type === 'employee') {
      // Admin ↔ Kurir
      const targetId = initiator_id === currentUser.id ? participant_id : initiator_id;
      if (targetId && targetId !== DUMMY_ADMIN_ID) {
        const { data } = await supabase.from('employees').select('full_name, role').eq('id', targetId).maybeSingle();
        setParticipantName(data?.full_name || 'Karyawan');
        setParticipantSubtitle(data?.role === 'admin' ? '👔 Admin' : '🏍 Kurir');
      } else {
        setParticipantName('Admin TutahTitah');
        setParticipantSubtitle('👔 Manajemen');
      }
    } else if (chat_type === 'admin_merchant' || chat_type === 'courier_merchant') {
      const { data } = await supabase.from('merchants').select('name, logo_url').eq('id', participant_id).maybeSingle();
      setParticipantName(data?.name || 'Mitra');
      setParticipantSubtitle('🏪 Mitra Toko');
      if (data?.logo_url) setParticipantAvatar(data.logo_url);
    } else if (chat_type === 'courier') {
      // Kurir melihat chat dari customer ke dia
      if (customer_id) {
        const { data } = await supabase.from('customers').select('name, phone').eq('auth_id', customer_id).maybeSingle();
        setParticipantName(data?.name || data?.phone || 'Customer');
        setParticipantSubtitle('👤 Customer');
      }
    }
  };

  // Realtime subscription - INSERT (pesan baru) + UPDATE (status is_read berubah)
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`internal_chat_room_${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        setTimeout(scrollToBottom, 100);
        if (payload.new.sender_id !== currentUser.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        // Update is_read status secara realtime (untuk ceklis 1 → ceklis 2)
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, is_read: payload.new.is_read } : m));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [chatId, currentUser]);

  // Order realtime (to detect order closure for courier chats)
  useEffect(() => {
    if (!chatInfo?.order_id || currentUser?.role !== 'courier') return;
    const channel = supabase
      .channel(`internal_order_status_${chatInfo.order_id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${chatInfo.order_id}`
      }, (payload) => {
        if (['completed', 'cancelled', 'rejected'].includes(payload.new.status)) {
          setIsChatClosed(true);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [chatInfo, currentUser]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (isChatClosed) return;
    if (!newMessage.trim() && !stagedAttachment) return;

    let metadata = null;
    if (stagedAttachment) {
      metadata = stagedAttachment;
    }

    try {
      const { data: newMsg, error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: currentUser.id,
        sender_type: 'employee',
        content: newMessage.trim() || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        is_read: true, // Pengirim sendiri sudah pasti 'baca' pesannya sendiri
      }).select().single();

      if (error) throw error;

      setMessages(prev => {
        // Prevent duplicate if realtime already fired
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(scrollToBottom, 50);

      await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);

      setNewMessage('');
      setStagedAttachment(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengirim pesan');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return toast.error('Ukuran foto maksimal 15MB');

    setIsUploading(true);
    setShowAttachMenu(false);
    const loadingToast = toast.loading('Mengompres gambar...');
    try {
      // Kompres gambar sebelum upload (maks 1280px, kualitas 75%, format WebP)
      const compressed = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.75 });
      console.log(`Kompresi: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);

      const path = `chat_${chatId}_${Date.now()}.webp`;
      const { error: upError } = await supabase.storage.from('chat-images').upload(path, compressed, { contentType: 'image/webp' });
      if (upError) throw upError;
      const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path);
      setStagedAttachment({ type: 'image', url: publicUrl });
      toast.success('Foto siap dikirim', { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error('Gagal upload foto', { id: loadingToast });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTouchStart = (msg) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(msg);
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleCopyMessage = () => {
    if (!selectedMessage) return;
    navigator.clipboard.writeText(selectedMessage.content || '');
    toast.success('Pesan disalin');
    setSelectedMessage(null);
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setSelectedMessage(null);
    const prevState = [...messages];
    setMessages(prev => prev.filter(m => m.id !== msgId));
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) {
      toast.error('Gagal menghapus pesan');
      setMessages(prevState);
    } else {
      toast.success('Pesan dihapus');
    }
  };

  const handleOpenOrderPicker = async () => {
    setShowAttachMenu(false);
    setShowOrderModal(true);
    setLoadingOrders(true);
    try {
      let query = supabase.from('orders').select('id, tipe_layanan, status, total_price, created_at, customer_name, customer_wa, merchants(name)').order('created_at', { ascending: false }).limit(30);

      // Filter berdasarkan konteks chat
      if (chatInfo) {
        if (chatInfo.chat_type === 'support' && chatInfo.customer_id) {
          // Admin → Customer: tampilkan order dari customer ini
          // Cari customer_profile berdasarkan auth_id
          const { data: custData } = await supabase.from('customers').select('id').eq('auth_id', chatInfo.customer_id).maybeSingle();
          // Untuk orders, match by customer (orders punya customer_id field?)
          // Orders menggunakan customer_wa atau customer_name — filter by participant
        } else if (chatInfo.chat_type === 'employee') {
          // Admin ↔ Kurir: tampilkan order yang pernah ditangani kurir
          const targetId = chatInfo.initiator_id === currentUser.id ? chatInfo.participant_id : chatInfo.initiator_id;
          if (targetId && targetId !== DUMMY_ADMIN_ID) {
            query = query.eq('assigned_courier_id', targetId);
          }
        } else if (chatInfo.chat_type === 'admin_merchant' || chatInfo.chat_type === 'courier_merchant') {
          // Admin/Kurir ↔ Merchant: tampilkan order dari merchant ini
          query = query.eq('merchant_id', chatInfo.participant_id);
        } else if (chatInfo.chat_type === 'courier') {
          // Kurir lihat chat customer: tampilkan order yang dia handle dan berkaitan
          if (chatInfo.order_id) {
            query = query.eq('id', chatInfo.order_id);
          } else {
            query = query.eq('assigned_courier_id', currentUser.id);
          }
        }
      }

      const { data } = await query;
      setRelevantOrders(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat order');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSelectOrder = (order) => {
    setStagedAttachment({
      type: 'order',
      id: order.id,
      status: order.status,
      total_price: order.total_price || 0,
      tipe_layanan: order.tipe_layanan,
      merchant_name: order.merchants?.name || order.customer_name || '-',
    });
    setShowOrderModal(false);
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = formatDateGroup(msg.created_at);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  const getInitials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f0f2f5] overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none" 
           style={{ 
             backgroundImage: 'url("/bg-chat.webp")',
             backgroundRepeat: 'repeat',
             backgroundSize: '300px'
           }}>
      </div>

      {/* Header */}
      <div className="bg-[#004aad] text-white px-3 py-3 flex items-center gap-3 z-40 relative shadow-md rounded-b-2xl flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        {participantAvatar ? (
          <img src={participantAvatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {getInitials(participantName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{participantName || 'Memuat...'}</p>
          <p className="text-[11px] text-blue-200">{participantSubtitle}</p>
        </div>
      </div>

      {/* Chat Closed Banner */}
      {isChatClosed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 flex-shrink-0 z-10 relative">
          <Lock size={14} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-700">Chat ini ditutup karena orderan sudah selesai atau dibatalkan</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 z-10 relative">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
            <p className="text-sm text-gray-400 font-medium">Mulai percakapan dengan {participantName}</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateKey, msgs]) => (
            <div key={dateKey}>
              <div className="flex justify-center mb-3">
                <span className="bg-white/80 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-gray-100">
                  {dateKey}
                </span>
              </div>
              {msgs.map(msg => {
                const isMine = msg.sender_id === currentUser.id || (currentUser.role === 'admin' && msg.sender_id === '00000000-0000-0000-0000-000000000000');
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={isMine}
                    currentUser={currentUser}
                    onLongPress={(m) => {
                      if (m === null) { handleTouchEnd(); return; }
                      handleTouchStart(m);
                    }}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Staged Attachment Preview */}
      {stagedAttachment && (
        <div className="bg-white border-t border-gray-100 px-4 py-2 flex items-center gap-3 flex-shrink-0 z-40 relative">
          <div className="flex-1 min-w-0">
            {stagedAttachment.type === 'image' ? (
              <div className="flex items-center gap-2">
                <img src={stagedAttachment.url} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                <span className="text-xs font-medium text-gray-600">Foto siap dikirim</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                  <Receipt size={18} className="text-[#004aad]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">{stagedAttachment.merchant_name}</p>
                  <p className="text-[10px] text-gray-400">Invoice #{String(stagedAttachment.id).substring(0, 8)}</p>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setStagedAttachment(null)} className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-500">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Area */}
      {!isChatClosed ? (
        <div className="bg-white border-t border-gray-100 px-3 py-3 flex-shrink-0 z-40 relative">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            {/* Attach Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(prev => !prev)}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip size={18} />
                )}
              </button>

              {/* Attach Menu */}
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex flex-col gap-1 min-w-[150px] z-10">
                  <button
                    type="button"
                    onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                  >
                    <ImageIcon size={16} className="text-green-500" /> Foto
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenOrderPicker}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                  >
                    <Receipt size={16} className="text-[#004aad]" /> Invoice Order
                  </button>
                </div>
              )}
            </div>

            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* Message Input */}
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(null); } }}
              placeholder="Ketik pesan..."
              rows={1}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#004aad] transition-colors max-h-28 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!newMessage.trim() && !stagedAttachment}
              className="w-10 h-10 rounded-full bg-[#004aad] text-white flex items-center justify-center hover:bg-blue-700 active:scale-90 transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-center flex-shrink-0 z-40 relative">
          <p className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1">
            <Lock size={12} /> Chat ditutup
          </p>
        </div>
      )}

      {/* Order Picker Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end" onClick={() => setShowOrderModal(false)}>
          <div className="bg-white rounded-t-3xl flex flex-col max-h-[75vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Pilih Invoice / Order</h3>
              <button onClick={() => setShowOrderModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingOrders ? (
                <div className="flex items-center justify-center h-24">
                  <div className="w-5 h-5 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : relevantOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Belum ada order terkait</div>
              ) : (
                relevantOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className="w-full flex items-center gap-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl p-3 transition-all text-left active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 flex-shrink-0">
                      <Receipt size={18} className="text-[#004aad]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{order.merchants?.name || order.customer_name || 'Order'}</p>
                      <p className="text-xs text-gray-500 capitalize">{order.tipe_layanan} • <span className={`font-bold ${order.status === 'completed' ? 'text-green-600' : order.status === 'cancelled' ? 'text-red-500' : 'text-blue-600'}`}>{order.status}</span></p>
                      {order.total_price > 0 && (
                        <p className="text-xs font-bold text-[#004aad]">Rp {Number(order.total_price).toLocaleString('id-ID')}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">#{String(order.id).substring(0, 8)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Sheet - Long Press Message */}
      {selectedMessage && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex flex-col justify-end"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="bg-white w-full rounded-t-3xl pb-8 pt-2 px-4 flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />

            {/* Preview pesan */}
            {selectedMessage.content && (
              <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-3 border border-gray-100">
                <p className="text-xs text-gray-400 font-semibold mb-1">Pesan dipilih</p>
                <p className="text-sm text-gray-700 line-clamp-2">{selectedMessage.content}</p>
              </div>
            )}

            <button
              onClick={handleCopyMessage}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors text-left active:bg-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                <Copy size={18} />
              </div>
              <span className="text-base font-semibold text-gray-800">Salin Pesan</span>
            </button>

            <button
              onClick={handleDeleteMessage}
              className="w-full flex items-center gap-3 p-4 hover:bg-red-50 rounded-2xl transition-colors text-left mt-1 active:bg-red-100"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <span className="text-base font-semibold text-red-600">Hapus Pesan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

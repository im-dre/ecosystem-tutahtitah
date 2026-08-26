import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Paperclip, Image as ImageIcon, Receipt, X, Lock, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

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

export default function InternalChatRoom({ 
  currentUser,
  participantName,
  participantAvatar,
  participantSubtitle,
  messages = [],
  loading = false,
  isChatClosed = false,
  isUploading = false,
  showOrderModal = false,
  relevantOrders = [],
  loadingOrders = false,
  onBack,
  onSendMessage,
  onDeleteMessage,
  onUploadImage,
  onOpenOrderPicker,
  onCloseOrderPicker
}) {
  const [newMessage, setNewMessage] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [stagedAttachment, setStagedAttachment] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const longPressTimer = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (isChatClosed) return;
    if (!newMessage.trim() && !stagedAttachment) return;

    if (onSendMessage) {
      onSendMessage(newMessage.trim(), stagedAttachment);
    }
    
    setNewMessage('');
    setStagedAttachment(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachMenu(false);
    
    if (onUploadImage) {
      const attachment = await onUploadImage(file);
      if (attachment) {
        setStagedAttachment(attachment);
      }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleDeleteMessage = () => {
    if (!selectedMessage) return;
    if (onDeleteMessage) onDeleteMessage(selectedMessage.id);
    setSelectedMessage(null);
  };

  const handleOpenOrderPicker = () => {
    setShowAttachMenu(false);
    if (onOpenOrderPicker) onOpenOrderPicker();
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
    if (onCloseOrderPicker) onCloseOrderPicker();
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
                const isMine = msg.sender_id === currentUser?.id || (currentUser?.role === 'admin' && msg.sender_id === '00000000-0000-0000-0000-000000000000');
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
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end" onClick={onCloseOrderPicker}>
          <div className="bg-white rounded-t-3xl flex flex-col max-h-[75vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Pilih Invoice / Order</h3>
              <button onClick={onCloseOrderPicker} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
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

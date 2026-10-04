import { useState, useRef } from 'react';
import { MessageSquare, Plus, Search, X, ChevronRight, Users, Bike, Store, User, Trash2, AlertTriangle, Eye } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('id');

// Format relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = dayjs(dateString);
  const now = dayjs();
  if (now.diff(date, 'hour') < 24) return date.format('HH:mm');
  if (now.diff(date, 'day') < 7) return date.format('ddd');
  return date.format('D MMM');
};

export default function InternalChatList({ 
  currentUser,
  chats = [],
  loading = false,
  contacts = [],
  loadingContacts = false,
  isDeleting = false,
  onOpenChat,
  onFetchContacts,
  onStartNewChat,
  onDeleteChat,
  onDeleteAllChats,
  onMarkAsRead,
  onOpenMonitoring
}) {
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTab, setNewChatTab] = useState('customer'); // 'customer' | 'courier' | 'merchant'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatToDelete, setSelectedChatToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const longPressTimer = useRef(null);

  const isAdmin = currentUser?.role === 'admin';

  const handleTouchStart = (chat) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedChatToDelete(chat);
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleDeleteChat = async () => {
    if (!selectedChatToDelete) return;
    if (onDeleteChat) await onDeleteChat(selectedChatToDelete.id);
    setSelectedChatToDelete(null);
  };

  const handleDeleteAll = async () => {
    if (onDeleteAllChats) await onDeleteAllChats();
    setShowDeleteAllModal(false);
  };

  const handleOpenNewChatTab = (tab) => {
    setNewChatTab(tab);
    setSearchQuery('');
    if (onFetchContacts) onFetchContacts(tab);
  };

  const handleStartChat = async (contact) => {
    if (onStartNewChat) await onStartNewChat(contact, newChatTab);
    setShowNewChat(false);
  };

  const filteredContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    return (c.name || c.full_name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q);
  });

  const getInitials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const getAvatarColor = (id) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
    const idx = (id || '').charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-[#004aad]" />
          <h2 className="font-bold text-gray-900 text-base">Chat</h2>
          {chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {chats.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 active:scale-90 transition-all shadow-md"
              title="Hapus Semua"
            >
              <Trash2 size={16} />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onOpenMonitoring}
              className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-slate-700 active:scale-90 transition-all shadow-md"
              title="Monitoring Chat"
            >
              <Eye size={17} />
            </button>
          )}
          <button
            onClick={() => { setShowNewChat(true); handleOpenNewChatTab(isAdmin ? 'customer' : 'courier'); }}
            className="w-8 h-8 bg-[#004aad] text-white rounded-full flex items-center justify-center hover:bg-blue-700 active:scale-90 transition-all shadow-md"
            title="Chat Baru"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-center px-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <MessageSquare size={32} className="text-[#004aad] opacity-40" />
            </div>
            <p className="font-bold text-gray-500">Belum ada percakapan</p>
            <p className="text-xs text-gray-400">Mulai chat baru dengan tombol + di atas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {chats.map(chat => (
              <button
                key={chat.id}
                onTouchStart={() => handleTouchStart(chat)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleTouchStart(chat)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onClick={() => {
                  if (onMarkAsRead) onMarkAsRead(chat.id);
                  if (onOpenChat) onOpenChat(chat.id);
                }}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50/50 active:bg-blue-50 transition-colors text-left"
              >
                {/* Avatar */}
                {chat.displayAvatar ? (
                  <img src={chat.displayAvatar} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm ${getAvatarColor(chat.id)}`}>
                    {getInitials(chat.displayName)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`font-bold text-sm truncate ${chat.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                      {chat.displayName}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {formatRelativeTime(chat.lastTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate flex-1 ${chat.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {chat.lastMessage || chat.displaySubtitle || 'Mulai percakapan...'}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 bg-[#004aad] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end" onClick={() => setShowNewChat(false)}>
          <div
            className="bg-white rounded-t-3xl flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Mulai Chat Baru</h3>
              <button onClick={() => setShowNewChat(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-2 px-5 py-3 border-b border-gray-100 overflow-x-auto">
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleOpenNewChatTab('customer')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${newChatTab === 'customer' ? 'bg-[#004aad] text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <User size={12} /> Customer
                  </button>
                  <button
                    onClick={() => handleOpenNewChatTab('courier')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${newChatTab === 'courier' ? 'bg-[#004aad] text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <Bike size={12} /> Kurir
                  </button>
                  <button
                    onClick={() => handleOpenNewChatTab('merchant')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${newChatTab === 'merchant' ? 'bg-[#004aad] text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <Store size={12} /> Mitra
                  </button>
                </>
              )}
              {!isAdmin && (
                <>
                  <button
                    onClick={() => handleOpenNewChatTab('admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${newChatTab === 'admin' ? 'bg-[#004aad] text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <Users size={12} /> Admin
                  </button>
                </>
              )}
            </div>

            {/* Search */}
            <div className="px-5 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Cari ${newChatTab === 'customer' ? 'Customer' : newChatTab === 'courier' ? (isAdmin ? 'Kurir' : 'Admin') : 'Mitra'}...`}
                  className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#004aad] transition"
                />
              </div>
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 px-2 pb-6">
              {loadingContacts ? (
                <div className="flex items-center justify-center h-24">
                  <div className="w-5 h-5 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Tidak ada kontak ditemukan</div>
              ) : (
                filteredContacts.map(contact => {
                  const displayName = contact.name || contact.full_name || contact.phone || '-';
                  const sub = contact.role === 'admin' ? 'Admin' : contact.role === 'courier' ? 'Kurir' : contact.phone || '';
                  return (
                    <button
                      key={contact.id}
                      onClick={() => handleStartChat(contact)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50 active:scale-95 transition-all text-left"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${getAvatarColor(contact.id)}`}>
                        {contact.logo_url
                          ? <img src={contact.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                          : getInitials(displayName)
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{displayName}</p>
                        {sub && <p className="text-xs text-gray-400">{sub}</p>}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {/* Action Modal (Delete Single Chat) */}
      {selectedChatToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex flex-col justify-end animate-fadeIn" onClick={() => setSelectedChatToDelete(null)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pb-8 pt-2 px-4 flex flex-col animate-slideUp shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="flex items-center gap-3 p-4 mb-2 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 overflow-hidden">
                {selectedChatToDelete.displayAvatar ? (
                  <img src={selectedChatToDelete.displayAvatar} alt="" className="w-8 h-8 object-cover" />
                ) : (
                  <MessageSquare size={20} className="text-[#004aad]" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{selectedChatToDelete.displayName}</p>
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
        <div className="fixed inset-0 z-[200] bg-black/50 flex flex-col justify-center p-4 animate-fadeIn" onClick={() => setShowDeleteAllModal(false)}>
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

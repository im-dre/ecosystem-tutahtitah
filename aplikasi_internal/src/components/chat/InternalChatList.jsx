import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Plus, Search, X, ChevronRight, Users, Bike, Store, User, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('id');

const DUMMY_ADMIN_ID = '00000000-0000-0000-0000-000000000000';

// Format relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = dayjs(dateString);
  const now = dayjs();
  if (now.diff(date, 'hour') < 24) return date.format('HH:mm');
  if (now.diff(date, 'day') < 7) return date.format('ddd');
  return date.format('D MMM');
};

export default function InternalChatList({ currentUser, onOpenChat, onUnreadCountChange }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTab, setNewChatTab] = useState('customer'); // 'customer' | 'courier' | 'merchant'
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selectedChatToDelete, setSelectedChatToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const longPressTimer = useRef(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (currentUser) fetchChats();
  }, [currentUser]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel(`internal_chat_list_${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchChats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChats();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentUser]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      // Fetch all chats relevant to this employee
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id, chat_type, participant_id, customer_id, initiator_id, order_id, updated_at, status,
          messages ( id, content, sender_type, sender_id, created_at, is_read, metadata, is_deleted_by_participant )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Filter chats relevant to current user based on role
      const relevantChats = (data || []).filter(chat => {
        if (isAdmin) {
          // Admin sees: support chats, employee chats, admin_merchant chats they initiated
          return (
            chat.is_deleted_by_participant !== true &&
            (
              chat.chat_type === 'support' ||
              chat.chat_type === 'employee' ||
              chat.chat_type === 'admin_merchant' ||
              chat.initiator_id === currentUser.id ||
              chat.participant_id === currentUser.id
            )
          );
        } else {
          // Courier sees: chats where they're participant (customer→courier) OR initiator (courier→merchant/admin)
          return (
            chat.is_deleted_by_participant !== true &&
            (
              chat.participant_id === currentUser.id ||
              chat.initiator_id === currentUser.id
            )
          );
        }
      });

      // Enrich with participant info
      const enriched = await Promise.all(relevantChats.map(async (chat) => {
        let name = 'Percakapan';
        let avatar = null;
        let subtitle = '';

        if (chat.chat_type === 'support') {
          // Admin ↔ Customer via laporan
          if (chat.customer_id) {
            const { data: cData } = await supabase.from('customers').select('name, phone').eq('auth_id', chat.customer_id).maybeSingle();
            if (cData) { name = cData.name || cData.phone || 'Customer'; subtitle = '👤 Customer'; }
            else { name = 'Customer Support'; subtitle = '📣 Laporan Customer'; }
          }
        } else if (chat.chat_type === 'employee') {
          // Admin ↔ Kurir
          const targetId = chat.initiator_id === currentUser.id ? chat.participant_id : chat.initiator_id;
          if (targetId && targetId !== DUMMY_ADMIN_ID) {
            const { data: eData } = await supabase.from('employees').select('full_name, role').eq('id', targetId).maybeSingle();
            if (eData) { name = eData.full_name; subtitle = eData.role === 'admin' ? '👔 Admin' : '🏍 Kurir'; }
          } else {
            name = 'Admin TutahTitah';
            subtitle = '👔 Manajemen';
          }
        } else if (chat.chat_type === 'admin_merchant') {
          // Admin ↔ Merchant
          const { data: mData } = await supabase.from('merchants').select('name, logo_url').eq('id', chat.participant_id).maybeSingle();
          if (mData) { name = mData.name; avatar = mData.logo_url; subtitle = '🏪 Mitra Toko'; }
        } else if (chat.chat_type === 'courier_merchant') {
          // Kurir ↔ Merchant
          const { data: mData } = await supabase.from('merchants').select('name, logo_url').eq('id', chat.participant_id).maybeSingle();
          if (mData) { name = mData.name; avatar = mData.logo_url; subtitle = '🏪 Mitra Toko'; }
        } else if (chat.chat_type === 'courier') {
          // Customer → Kurir (seen by courier)
          if (chat.customer_id) {
            const { data: cData } = await supabase.from('customers').select('name, phone').eq('auth_id', chat.customer_id).maybeSingle();
            if (cData) { name = cData.name || cData.phone || 'Customer'; subtitle = '👤 Customer'; }
          }
        }

        // Count unread messages
        // Pesan dianggap "unread" hanya jika:
        // 1. is_read = false
        // 2. Bukan dari current user sendiri
        // 3. Bukan dari dummy admin ID (untuk menghindari hitung pesan lama admin sebagai unread)
        // 4. Bukan dari sesama employee (sender_type !== 'employee' dan !== 'support')
        const msgs = (chat.messages || []).filter(m => m.is_deleted_by_participant !== true);
        const unread = msgs.filter(m => {
          if (m.is_read) return false;
          if (m.sender_id === currentUser.id) return false;
          if (isAdmin && m.sender_id === DUMMY_ADMIN_ID) return false;
          // Jika sender adalah employee/support lain, jangan hitung sebagai unread untuk admin
          // (Admin hanya perlu tau kalau ada pesan dari customer/merchant yang belum dibaca)
          if (isAdmin && (m.sender_type === 'employee' || m.sender_type === 'support')) return false;
          return true;
        }).length;
        const sortedMsgs = [...msgs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const latestMsg = sortedMsgs[0];

        let lastText = '';
        if (latestMsg) {
          if (latestMsg.metadata) {
            try {
              const meta = typeof latestMsg.metadata === 'string' ? JSON.parse(latestMsg.metadata) : latestMsg.metadata;
              if (meta.type === 'image') lastText = '📷 Foto';
              else if (meta.type === 'order') lastText = '🧾 Invoice';
              else lastText = latestMsg.content || '';
            } catch { lastText = latestMsg.content || ''; }
          } else {
            lastText = latestMsg.content || '';
          }
        }

        return {
          ...chat,
          displayName: name,
          displayAvatar: avatar,
          displaySubtitle: subtitle,
          unreadCount: unread,
          lastMessage: lastText,
          lastTime: latestMsg?.created_at || chat.updated_at,
        };
      }));

      // Sort by lastTime
      enriched.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
      setChats(enriched);

      // Hitung total unread dan kirim ke parent (App.jsx) untuk update tab badge
      const totalUnread = enriched.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      if (onUnreadCountChange) onUnreadCountChange(totalUnread);
    } catch (err) {
      console.error('Error fetching internal chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (type) => {
    setLoadingContacts(true);
    try {
      if (type === 'customer') {
        const { data } = await supabase.from('customers').select('id, auth_id, name, phone').order('name');
        setContacts(data || []);
      } else if (type === 'courier') {
        const { data } = await supabase.from('employees').select('*').eq('role', 'courier');
        setContacts(data || []);
      } else if (type === 'admin') {
        const { data } = await supabase.from('employees').select('*').eq('role', 'admin');
        setContacts(data || []);
      } else if (type === 'merchant') {
        const { data } = await supabase.from('merchants').select('id, name, logo_url').in('status', ['VERIFIED', 'PENDING']).order('name');
        setContacts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContacts(false);
    }
  };

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
    setIsDeleting(true);
    const chatId = selectedChatToDelete.id;

    // Backup state
    const prevChatsState = [...chats];
    
    // Optimistic update
    setChats(prev => prev.filter(c => c.id !== chatId));
    setSelectedChatToDelete(null);

    const { error } = await supabase.from('chats').update({ is_deleted_by_participant: true }).eq('id', chatId);
    if (error) {
      toast.error('Gagal menghapus obrolan dari server');
      setChats(prevChatsState); // Rollback
    } else {
      toast.success('Obrolan dihapus');
    }
    setIsDeleting(false);
  };

  const handleDeleteAll = async () => {
    if (!currentUser) return;
    setIsDeleting(true);
    
    // Backup state
    const prevChatsState = [...chats];
    
    // Optimistic update
    setChats([]);
    setShowDeleteAllModal(false);

    const { error } = await supabase.from('chats').update({ is_deleted_by_participant: true })
      .or(`participant_id.eq.${currentUser.id},initiator_id.eq.${currentUser.id}`);
      
    if (error) {
      toast.error('Gagal menghapus semua obrolan dari server');
      setChats(prevChatsState); // Rollback
    } else {
      toast.success('Semua obrolan berhasil dihapus');
    }
    setIsDeleting(false);
  };

  const handleOpenNewChatTab = (tab) => {
    setNewChatTab(tab);
    setSearchQuery('');
    fetchContacts(tab);
  };

  const handleStartChat = async (contact) => {
    try {
      let chatType, participantId, initiatorId, customerId;

      if (newChatTab === 'customer') {
        chatType = 'support';
        customerId = contact.auth_id;
        participantId = currentUser.id;
        initiatorId = currentUser.id;
      } else if (newChatTab === 'courier' || newChatTab === 'admin') {
        chatType = 'employee';
        participantId = contact.id;
        initiatorId = currentUser.id;
        customerId = null;
      } else if (newChatTab === 'merchant') {
        chatType = isAdmin ? 'admin_merchant' : 'courier_merchant';
        participantId = contact.id;
        initiatorId = currentUser.id;
        customerId = null;
      }

      // Cek apakah sudah ada chat yang sama
      let existingQuery = supabase.from('chats').select('id').eq('chat_type', chatType).eq('initiator_id', initiatorId);
      if (chatType === 'support') {
        existingQuery = existingQuery.eq('customer_id', customerId);
      } else {
        existingQuery = existingQuery.eq('participant_id', participantId);
      }
      const { data: existing } = await existingQuery.limit(1).maybeSingle();

      if (existing) {
        setShowNewChat(false);
        onOpenChat(existing.id);
        return;
      }

      // Buat chat baru
      const insertData = {
        chat_type: chatType,
        participant_id: participantId,
        initiator_id: initiatorId,
      };
      if (customerId) insertData.customer_id = customerId;

      const { data: newChat, error } = await supabase
        .from('chats')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;
      setShowNewChat(false);
      onOpenChat(newChat.id);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memulai chat');
    }
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
                onClick={async () => {
                  // Selalu mark as read saat chat dibuka — pakai sender_type agar lebih reliable
                  const senderTypesToRead = currentUser?.role === 'admin'
                    ? ['customer', 'merchant']
                    : ['customer'];

                  supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('chat_id', chat.id)
                    .in('sender_type', senderTypesToRead)
                    .eq('is_read', false)
                    .then(() => {
                      // Hapus badge langsung di UI
                      setChats(prev => prev.map(c =>
                        c.id === chat.id ? { ...c, unreadCount: 0 } : c
                      ));
                      if (onUnreadCountChange) {
                        const newTotal = chats.reduce((sum, c) => sum + (c.id === chat.id ? 0 : (c.unreadCount || 0)), 0);
                        onUnreadCountChange(newTotal);
                      }
                    });

                  onOpenChat(chat.id);
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
                {selectedChatToDelete.avatar ? (
                  <img src={selectedChatToDelete.avatar} className="w-8 h-8 object-cover" />
                ) : (
                  <MessageSquare size={20} className="text-[#004aad]" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{selectedChatToDelete.name}</p>
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

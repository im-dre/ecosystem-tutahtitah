import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const MESSAGE_PAGE_SIZE = 50;
const MESSAGE_COLUMNS = 'id, chat_id, sender_id, sender_type, content, metadata, is_read, created_at, is_deleted_by_participant';
const sortChatsByLastMessage = (items) => [...items].sort(
  (a, b) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime(),
);
const toChatSummary = (chat) => ({
  ...chat,
  displayName: chat.display_name,
  displayAvatar: chat.display_avatar,
  displaySubtitle: chat.display_subtitle,
  lastMessage: chat.last_message,
  lastTime: chat.last_time,
  unreadCount: Number(chat.unread_count || 0),
  isDisabledByAdmin: Boolean(chat.is_disabled_by_admin),
});

const withSignedAttachmentUrls = async (items) => Promise.all(items.map(async (message) => {
  if (!message.metadata) return message;

  try {
    const metadata = typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata;
    if (metadata?.type !== 'image' || !metadata.path) return message;

    const { data, error } = await supabase.storage.from('chat-images').createSignedUrl(metadata.path, 3600);
    if (error) throw error;

    return { ...message, metadata: JSON.stringify({ ...metadata, url: data.signedUrl }) };
  } catch (error) {
    console.error('Gagal membuat URL gambar chat:', error);
    return message;
  }
}));

export default function useLiveChat(currentUser) {
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeChatId, setActiveChatId] = useState(null);

  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const messageOffsetRef = useRef(0);
  const chatsRef = useRef([]);
  const activeChatIdRef = useRef(null);
  const pendingChatSummaryIdsRef = useRef(new Set());

  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [cctvChats, setCctvChats] = useState([]);
  const [loadingCctvChats, setLoadingCctvChats] = useState(false);
  const [hasMoreCctvChats, setHasMoreCctvChats] = useState(false);
  const [disablingChatId, setDisablingChatId] = useState(null);
  const cctvOffsetRef = useRef(0);
  const cctvRequestRef = useRef(null);

  const [relevantOrders, setRelevantOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // ==========================================
  // FETCH CHATS
  // ==========================================
  const fetchChats = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingChats(true);
    try {
      const { data, error } = await supabase.rpc('get_chat_summaries');
      if (error) throw error;
      const summaries = (data || []).map(toChatSummary);
      setChats(summaries);
      setUnreadCount(summaries.reduce((total, chat) => total + chat.unreadCount, 0));
    } catch (err) {
      console.error('Error fetching internal chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [currentUser?.id]);

  // Hanya dipakai saat event realtime merujuk ke room yang belum ada di memori.
  // RPC mengembalikan satu summary terotorisasi, bukan seluruh daftar chat.
  const fetchChatSummary = useCallback(async (chatId) => {
    if (!currentUser?.id || pendingChatSummaryIdsRef.current.has(chatId)) return;

    pendingChatSummaryIdsRef.current.add(chatId);
    try {
      const { data, error } = await supabase
        .rpc('get_chat_summary', { p_chat_id: chatId })
        .maybeSingle();
      if (error) throw error;
      if (!data) return;

      const summary = toChatSummary(data);
      const isNewChat = !chatsRef.current.some((chat) => chat.id === chatId);
      setChats((previous) => {
        const existing = previous.find((chat) => chat.id === chatId);
        const nextChats = existing
          ? previous.map((chat) => chat.id === chatId ? { ...chat, ...summary } : chat)
          : [summary, ...previous];
        return sortChatsByLastMessage(nextChats);
      });
      if (isNewChat) setUnreadCount((current) => current + summary.unreadCount);
    } catch (error) {
      console.error('Gagal memuat summary room chat baru:', error);
    } finally {
      pendingChatSummaryIdsRef.current.delete(chatId);
    }
  }, [currentUser?.id]);

  const fetchCCTVChats = useCallback(async ({ append = false, signal } = {}) => {
    if (currentUser?.role !== 'admin') return;
    if (cctvRequestRef.current && !cctvRequestRef.current.signal.aborted) return;

    const controller = signal ? null : new AbortController();
    const requestSignal = signal || controller.signal;
    const request = { signal: requestSignal };
    cctvRequestRef.current = request;
    setLoadingCctvChats(true);
    const offset = append ? cctvOffsetRef.current : 0;

    try {
      const { data, error } = await supabase
        .rpc('fetch_cctv_chats', { p_limit: 30, p_offset: offset })
        .abortSignal(requestSignal);
      if (error) throw error;
      if (requestSignal.aborted) return;

      const page = (data || []).map(toChatSummary);
      setCctvChats((previous) => append ? [...previous, ...page] : page);
      cctvOffsetRef.current = offset + page.length;
      setHasMoreCctvChats(page.length === 30);
    } catch (error) {
      if (requestSignal.aborted) return;
      console.error('Gagal memuat monitoring chat:', error);
      toast.error('Gagal memuat monitoring chat');
    } finally {
      if (cctvRequestRef.current === request) {
        cctvRequestRef.current = null;
        setLoadingCctvChats(false);
      }
    }
  }, [currentUser?.role]);
  const handleDisableChat = useCallback(async (chatId) => {
    if (currentUser?.role !== 'admin' || !chatId) return;
    setDisablingChatId(chatId);
    try {
      const { error } = await supabase.rpc('rpc_disable_chat_by_admin', { p_chat_id: chatId });
      if (error) throw error;
      const markDisabled = (chat) => chat.id === chatId ? { ...chat, isDisabledByAdmin: true } : chat;
      setCctvChats((previous) => previous.map(markDisabled));
      setChats((previous) => previous.map(markDisabled));
      toast.success('Chat berhasil dinonaktifkan');
    } catch (error) {
      console.error('Gagal menonaktifkan chat:', error);
      toast.error(error.message || 'Gagal menonaktifkan chat');
    } finally {
      setDisablingChatId(null);
    }
  }, [currentUser?.role]);

  // ==========================================
  // FETCH MESSAGES
  // ==========================================
  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_COLUMNS)
        .eq('chat_id', chatId)
        .eq('is_deleted_by_participant', false)
        .order('created_at', { ascending: false })
        .range(0, MESSAGE_PAGE_SIZE - 1);
      if (error) throw error;
      const page = await withSignedAttachmentUrls(data || []);
      setMessages(page.reverse());
      messageOffsetRef.current = page.length;
      setHasMoreMessages(page.length === MESSAGE_PAGE_SIZE);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat pesan');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!activeChatId || loadingMessages || !hasMoreMessages) return;
    setLoadingMessages(true);
    try {
      const from = messageOffsetRef.current;
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_COLUMNS)
        .eq('chat_id', activeChatId)
        .eq('is_deleted_by_participant', false)
        .order('created_at', { ascending: false })
        .range(from, from + MESSAGE_PAGE_SIZE - 1);
      if (error) throw error;
      const page = await withSignedAttachmentUrls(data || []);
      setMessages((previous) => [...page.reverse(), ...previous]);
      messageOffsetRef.current += page.length;
      setHasMoreMessages(page.length === MESSAGE_PAGE_SIZE);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat pesan sebelumnya');
    } finally {
      setLoadingMessages(false);
    }
  }, [activeChatId, hasMoreMessages, loadingMessages]);

  // ==========================================
  // FETCH CONTACTS (Untuk Chat Baru)
  // ==========================================
  const fetchContacts = async (type) => {
    setLoadingContacts(true);
    try {
      if (type === 'customer') {
        const { data } = await supabase.from('customers').select('id, auth_id, name, phone').order('name').limit(100);
        setContacts(data || []);
      } else if (type === 'courier') {
        const { data } = await supabase.from('employees').select('id, full_name, phone, role').eq('role', 'courier').limit(100);
        setContacts(data || []);
      } else if (type === 'admin') {
        const { data } = await supabase.from('employees').select('id, full_name, phone, role').in('role', ['admin', 'superadmin']).limit(100);
        setContacts(data || []);
      } else if (type === 'merchant') {
        const { data } = await supabase.from('merchants').select('id, name, logo_url').in('status', ['VERIFIED', 'PENDING']).order('name').limit(100);
        setContacts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // ==========================================
  // FETCH RELEVANT ORDERS
  // ==========================================
  const fetchRelevantOrders = useCallback(async (chatId) => {
    if (!chatId) return;
    setLoadingOrders(true);
    try {
      const currentChat = chatsRef.current.find((chat) => chat.id === chatId);
      if (!currentChat) {
        setRelevantOrders([]);
        return;
      }

      let query = supabase.from('orders').select(`
        id, status, total_price, tipe_layanan, customer_name,
        merchants(name)
      `).eq('is_deleted', false).order('created_at', { ascending: false }).limit(20);

      if (currentChat.chat_type === 'support') {
        if (!currentChat.customer_id) {
          setRelevantOrders([]);
          return;
        }
        query = query.eq('customer_id', currentChat.customer_id);
      } else if (currentChat.chat_type === 'admin_merchant' || currentChat.chat_type === 'courier_merchant') {
        query = query.eq('merchant_id', currentChat.participant_id);
      } else if (currentChat.chat_type === 'employee') {
        // Employee chat dapat dimulai oleh admin maupun kurir. Jangan percaya
        // posisi ID di chat; resolve role dari database dan fail closed.
        const employeeIds = [currentChat.initiator_id, currentChat.participant_id].filter(Boolean);
        const { data: couriers, error: courierError } = await supabase
          .from('employees')
          .select('id, role')
          .in('id', employeeIds)
          .eq('role', 'courier')
          .limit(2);
        if (courierError) throw courierError;
        const courierId = couriers?.[0]?.id;
        if (!courierId) {
          setRelevantOrders([]);
          return;
        }
        query = query.eq('assigned_courier_id', courierId);
      } else {
        // Tidak ada scope order yang aman untuk tipe chat lain.
        setRelevantOrders([]);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setRelevantOrders(data || []);
    } catch (err) {
      console.error(err);
      setRelevantOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);


  // ==========================================
  // INITIAL LOAD & REALTIME
  // ==========================================
  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (!isCancelled) void fetchChats();
    });

    return () => {
      isCancelled = true;
    };
  }, [fetchChats]);

  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) return;

      if (activeChatId) {
        void fetchMessages(activeChatId);
        void fetchRelevantOrders(activeChatId);
        return;
      }

      setMessages([]);
      setHasMoreMessages(false);
      messageOffsetRef.current = 0;
      setRelevantOrders([]);
    });

    return () => {
      isCancelled = true;
    };
  }, [activeChatId, fetchMessages, fetchRelevantOrders]);

  // Global inbox: RLS messages membatasi broadcast hanya ke room yang boleh diakses
  // user. Listener ini sengaja tanpa filter chat_id agar badge/list tetap realtime
  // ketika user sedang tidak membuka room tersebut.
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase.channel(`livechat_inbox_${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, (payload) => {
        const newMsg = payload.new;
        if (!newMsg) return;

        const isFromMe = newMsg.sender_id === currentUser.id;
        const isActiveChat = activeChatIdRef.current === newMsg.chat_id;
        const shouldIncrementUnread = !isFromMe && !isActiveChat;
        const chatExists = chatsRef.current.some((chat) => chat.id === newMsg.chat_id);

        if (isActiveChat) {
          void withSignedAttachmentUrls([newMsg]).then(([messageWithSignedUrl]) => {
            setMessages((previous) => previous.some((message) => message.id === messageWithSignedUrl.id)
              ? previous
              : [...previous, messageWithSignedUrl]);
          });
        }

        if (chatExists) {
          setChats((previous) => {
            const targetChat = previous.find((chat) => chat.id === newMsg.chat_id);
            if (!targetChat) return previous;

            const updatedChat = {
              ...targetChat,
              lastMessage: newMsg.content || (newMsg.metadata ? '[Attachment]' : ''),
              lastTime: newMsg.created_at,
              unreadCount: shouldIncrementUnread
                ? (targetChat.unreadCount || 0) + 1
                : targetChat.unreadCount || 0,
            };
            return [updatedChat, ...previous.filter((chat) => chat.id !== newMsg.chat_id)];
          });
          if (shouldIncrementUnread) setUnreadCount((current) => current + 1);
        } else {
          // Satu fetch summary terfilter untuk room baru; jangan pernah fetchChats().
          void fetchChatSummary(newMsg.chat_id);
        }

        if (!isFromMe && isActiveChat) {
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('chat_id', newMsg.chat_id)
            .neq('sender_id', currentUser.id)
            .eq('is_read', false)
            .then(({ error }) => {
              if (error) console.error('Gagal menandai pesan sebagai dibaca:', error);
            });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, fetchChatSummary]);

  // INSERT ditangani Global Inbox. Channel room ini hanya menjaga UPDATE
  // (read status / soft delete) pada histori room yang sedang terbuka.
  useEffect(() => {
    if (!currentUser?.id || !activeChatId) return;

    const channel = supabase.channel(`livechat_active_updates_${activeChatId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}`,
      }, (payload) => {
        const newMsg = payload.new;
        if (!newMsg) return;

        setMessages((previous) => newMsg.is_deleted_by_participant
          ? previous.filter((message) => message.id !== newMsg.id)
          : previous.map((message) => message.id === newMsg.id ? newMsg : message));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId, currentUser?.id]);


  // ==========================================
  // HANDLERS
  // ==========================================
  const handleMarkAsRead = async (chatId) => {
    if (!chatId) return;
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', currentUser.id)
        .eq('is_read', false);

      // Optimistic update badge
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
      setUnreadCount((current) => Math.max(0, current - (chatsRef.current.find((chat) => chat.id === chatId)?.unreadCount || 0)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartNewChat = async (contact, tab) => {
    try {
      let chatType, participantId, initiatorId, customerId;

      if (tab === 'customer') {
        chatType = 'support';
        customerId = contact.auth_id;
        participantId = currentUser.id;
        initiatorId = currentUser.id;
      } else if (tab === 'courier' || tab === 'admin') {
        chatType = 'employee';
        participantId = contact.id;
        initiatorId = currentUser.id;
        customerId = null;
      } else if (tab === 'merchant') {
        chatType = currentUser.role === 'admin' || currentUser.role === 'superadmin' ? 'admin_merchant' : 'courier_merchant';
        participantId = contact.id;
        initiatorId = currentUser.id;
        customerId = null;
      }

      let existingQuery;
      if (chatType === 'employee' || chatType === 'admin_merchant' || chatType === 'courier_merchant') {
        existingQuery = supabase.from('chats').select('id')
          .eq('chat_type', chatType)
          .or(`and(initiator_id.eq."${currentUser.id}",participant_id.eq."${contact.id}"),and(initiator_id.eq."${contact.id}",participant_id.eq."${currentUser.id}")`)
          .neq('is_deleted_by_participant', true);
      } else {
        existingQuery = supabase.from('chats').select('id')
          .eq('chat_type', chatType)
          .eq('initiator_id', initiatorId)
          .eq('customer_id', customerId)
          .neq('is_deleted_by_participant', true)
          .neq('is_deleted_by_customer', true);
      }
      const { data: existing } = await existingQuery.limit(1).maybeSingle();

      if (existing) {
        setActiveChatId(existing.id);
        return;
      }

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
      setActiveChatId(newChat.id);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memulai chat');
    }
  };

  const handleSendMessage = async (text, attachment) => {
    if (!activeChatId) return;

    const senderId = currentUser.id;

    const msg = {
      chat_id: activeChatId,
      sender_id: senderId,
      sender_type: currentUser.role,
      content: text || '',
      is_read: false
    };

    if (attachment) {
      msg.metadata = typeof attachment === 'string' ? attachment : JSON.stringify(attachment);
    }

    // Optimistic UI update untuk messages
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
        ...msg,
        id: tempId,
        created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);

    // Optimistic UI update untuk chat list
    setChats(prev => {
       const newChats = [...prev];
       const chatIdx = newChats.findIndex(c => c.id === activeChatId);
       if (chatIdx > -1) {
           const chat = { ...newChats[chatIdx] };
           chat.lastMessage = msg.content || (msg.metadata ? '[Attachment]' : '');
           chat.lastTime = tempMsg.created_at;
           newChats[chatIdx] = chat;
           return newChats.sort((a,b) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime());
       }
       return prev;
    });

    try {
      const { data, error } = await supabase.from('messages').insert([msg])
        .select(MESSAGE_COLUMNS).single();
      if (error) throw error;

      // Update temp id to real id quietly
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengirim pesan');
      // Revert optimistic update on fail
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleUploadImage = async (file, chatId) => {
    if (!chatId) {
      toast.error('Pilih chat terlebih dahulu');
      return null;
    }
    const toastId = toast.loading('Mengunggah gambar...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${chatId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from('chat-images')
        .createSignedUrl(filePath, 3600);
      if (signedUrlError) throw signedUrlError;

      toast.success('Gambar siap dikirim', { id: toastId });
      return { type: 'image', path: filePath, url: urlData.signedUrl };
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Gagal mengunggah gambar', { id: toastId });
      return null;
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      const { error } = await supabase.rpc('rpc_soft_delete_message', { p_msg_id: msgId });
      if (error) throw error;
      setMessages((previous) => previous.filter((message) => message.id !== msgId));
      toast.success('Pesan dihapus');
    } catch (error) {
      console.error('Gagal menghapus pesan:', error);
      toast.error('Gagal menghapus pesan');
    }
  };

  const handleDeleteChat = async (chatId) => {
    const previousChats = chats;
    try {
      // Optimistic
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) setActiveChatId(null);

      const { error } = await supabase.rpc('rpc_soft_delete_chat', { p_chat_id: chatId });
      if (error) throw error;
      toast.success('Obrolan dihapus');
    } catch (error) {
      console.error('Gagal menghapus obrolan:', error);
      toast.error('Gagal menghapus obrolan');
      setChats(previousChats);
    }
  };

  const handleDeleteAllChats = async () => {
    if (!currentUser) return;
    const previousChats = chats;
    try {
      setChats([]);
      setActiveChatId(null);
      const { error } = await supabase.rpc('rpc_soft_delete_all_chats');
      if (error) throw error;
      toast.success('Semua obrolan dihapus');
    } catch (error) {
      console.error('Gagal menghapus semua obrolan:', error);
      toast.error('Gagal menghapus semua obrolan');
      setChats(previousChats);
    }
  };

  return {
    chats,
    messages,
    unreadCount,
    activeChatId,
    setActiveChatId,
    loadingChats,
    loadingMessages,
    hasMoreMessages,
    loadMoreMessages,
    contacts,
    loadingContacts,
    cctvChats,
    loadingCctvChats,
    hasMoreCctvChats,
    disablingChatId,
    fetchCCTVChats,
    handleDisableChat,
    fetchContacts,
    relevantOrders,
    loadingOrders,

    handleStartNewChat,
    handleSendMessage,
    handleUploadImage,
    handleDeleteMessage,
    handleDeleteChat,
    handleDeleteAllChats,
    handleMarkAsRead
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function useLiveChat(currentUser) {
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeChatId, setActiveChatId] = useState(null);
  
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  
  const [relevantOrders, setRelevantOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ==========================================
  // FETCH CHATS
  // ==========================================
  const fetchChats = useCallback(async () => {
    if (!currentUser) return;
    setLoadingChats(true);
    try {
      let query = supabase.from('chats').select(`
        id,
        chat_type,
        participant_id,
        initiator_id,
        customer_id,
        is_deleted_by_participant,
        messages (
          id, content, created_at, is_read, sender_id, sender_type, metadata
        )
      `).eq('is_deleted_by_participant', false);

      if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
        // Admin melihat semua chat admin_merchant, support (customer), dan employee (kurir-admin)
        query = query.or(`chat_type.eq.support,chat_type.eq.admin_merchant,chat_type.eq.employee,initiator_id.eq.${currentUser.id},participant_id.eq.${currentUser.id}`);
      } else if (currentUser.role === 'courier') {
        query = query.or(`participant_id.eq.${currentUser.id},initiator_id.eq.${currentUser.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Ambil data user terkait
      const adminIds = [...new Set(data.map(c => c.initiator_id).concat(data.map(c => c.participant_id)))].filter(Boolean);
      const custIds = [...new Set(data.map(c => c.customer_id))].filter(Boolean);

      let empData = [];
      let custData = [];
      let merchData = [];

      if (adminIds.length > 0) {
        const { data: ed } = await supabase.from('employees').select('id, full_name, role');
        empData = ed || [];
      }
      if (custIds.length > 0) {
        const { data: cd } = await supabase.from('customers').select('auth_id, name, phone');
        custData = cd || [];
      }
      
      const { data: md } = await supabase.from('merchants').select('id, name, logo_url');
      merchData = md || [];

      let totalUnread = 0;

      const enriched = data.map(chat => {
        let displayName = 'Unknown';
        let displayAvatar = null;
        let displaySubtitle = '';

        const lastMsg = chat.messages && chat.messages.length > 0 
          ? chat.messages.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0] 
          : null;

        const isSupport = chat.chat_type === 'support';
        const isMerchant = chat.chat_type === 'admin_merchant' || chat.chat_type === 'courier_merchant';

        if (isSupport) {
          const cust = custData.find(c => c.auth_id === chat.customer_id);
          displayName = cust?.name || cust?.phone || 'Customer';
          displaySubtitle = 'Customer';
        } else if (isMerchant) {
          const merch = merchData.find(m => m.id === chat.participant_id);
          displayName = merch?.name || 'Mitra Toko';
          displayAvatar = merch?.logo_url;
          displaySubtitle = 'Mitra';
        } else {
          // Employee chat
          const otherId = chat.participant_id === currentUser.id ? chat.initiator_id : chat.participant_id;
          const emp = empData.find(e => e.id === otherId);
          displayName = emp?.full_name || 'Admin/Kurir';
          displaySubtitle = emp?.role === 'admin' || emp?.role === 'superadmin' ? 'Admin' : 'Kurir';
        }

        // Hitung unread
        const unreadCount = (chat.messages || []).filter(m => 
          !m.is_read && m.sender_id !== currentUser.id && m.sender_id !== '00000000-0000-0000-0000-000000000000'
        ).length;
        
        totalUnread += unreadCount;

        return {
          ...chat,
          displayName,
          displayAvatar,
          displaySubtitle,
          lastMessage: lastMsg?.content || (lastMsg?.metadata ? '[Attachment]' : ''),
          lastTime: lastMsg?.created_at || null,
          unreadCount
        };
      }).sort((a,b) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime());

      setChats(enriched);
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Error fetching internal chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [currentUser]);

  // ==========================================
  // FETCH MESSAGES
  // ==========================================
  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat pesan');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ==========================================
  // FETCH CONTACTS (Untuk Chat Baru)
  // ==========================================
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
        const { data } = await supabase.from('employees').select('*').in('role', ['admin', 'superadmin']);
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

  // ==========================================
  // FETCH RELEVANT ORDERS
  // ==========================================
  const fetchRelevantOrders = async (chatId) => {
    if (!chatId) return;
    setLoadingOrders(true);
    try {
      const currentChat = chats.find(c => c.id === chatId);
      if (!currentChat) return;

      let query = supabase.from('orders').select(`
        id, status, total_price, tipe_layanan, customer_name,
        merchants(name)
      `).order('created_at', { ascending: false }).limit(20);

      if (currentChat.chat_type === 'support') {
        query = query.eq('customer_id', currentChat.customer_id);
      } else if (currentChat.chat_type === 'admin_merchant' || currentChat.chat_type === 'courier_merchant') {
        query = query.eq('merchant_id', currentChat.participant_id);
      } else if (currentChat.chat_type === 'employee') {
        // Jika chat dgn kurir, ambil orderan si kurir
        query = query.eq('assigned_courier_id', currentChat.participant_id);
      }

      const { data, error } = await query;
      if (!error) setRelevantOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };


  // ==========================================
  // INITIAL LOAD & REALTIME
  // ==========================================
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
      fetchRelevantOrders(activeChatId);
    }
  }, [activeChatId, fetchMessages]);

  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel('livechat_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        // Jika update di chat yang aktif
        if (payload.new && payload.new.chat_id === activeChatId) {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
            // Tandai read otomatis jika yang masuk bukan dari kita
            if (payload.new.sender_id !== currentUser.id && payload.new.sender_id !== '00000000-0000-0000-0000-000000000000') {
              handleMarkAsRead(activeChatId);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
        
        // Selalu refresh chat list agar update last message & unread badge
        fetchChats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeChatId, fetchChats]);


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
        .neq('sender_id', '00000000-0000-0000-0000-000000000000')
        .eq('is_read', false);
      
      // Optimistic update badge
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
      const newTotal = chats.reduce((sum, c) => sum + (c.id === chatId ? 0 : (c.unreadCount || 0)), 0);
      setUnreadCount(newTotal);
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

      let existingQuery = supabase.from('chats').select('id').eq('chat_type', chatType).eq('initiator_id', initiatorId);
      if (chatType === 'support') {
        existingQuery = existingQuery.eq('customer_id', customerId);
      } else {
        existingQuery = existingQuery.eq('participant_id', participantId);
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
    
    // Admin backend khusus: jika admin pakai admin id asli, jika perlu pakai 0000 bisa disesuaikan
    const senderId = currentUser.role === 'admin' || currentUser.role === 'superadmin' ? '00000000-0000-0000-0000-000000000000' : currentUser.id;
    
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

    try {
      const { error } = await supabase.from('messages').insert([msg]);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengirim pesan');
    }
  };

  const handleUploadImage = async (file) => {
    const toastId = toast.loading('Mengunggah gambar...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat_attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('orders') // Atau bucket yang tersedia
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('orders')
        .getPublicUrl(filePath);

      toast.success('Gambar siap dikirim', { id: toastId });
      return { type: 'image', url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Gagal mengunggah gambar', { id: toastId });
      return null;
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', msgId);
      if (error) throw error;
      toast.success('Pesan dihapus');
    } catch (err) {
      toast.error('Gagal menghapus pesan');
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      // Optimistic
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) setActiveChatId(null);

      const { error } = await supabase.from('chats').update({ is_deleted_by_participant: true }).eq('id', chatId);
      if (error) throw error;
      toast.success('Obrolan dihapus');
    } catch (err) {
      toast.error('Gagal menghapus obrolan');
      fetchChats(); // Rollback
    }
  };

  const handleDeleteAllChats = async () => {
    if (!currentUser) return;
    try {
      setChats([]);
      setActiveChatId(null);
      const { error } = await supabase.from('chats').update({ is_deleted_by_participant: true })
        .or(`participant_id.eq.${currentUser.id},initiator_id.eq.${currentUser.id}`);
      if (error) throw error;
      toast.success('Semua obrolan dihapus');
    } catch (err) {
      toast.error('Gagal menghapus semua obrolan');
      fetchChats();
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
    contacts,
    loadingContacts,
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

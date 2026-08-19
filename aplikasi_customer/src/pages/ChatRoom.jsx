import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Send, Store, User, Bike, Paperclip, Image as ImageIcon, Package, Receipt, X, ChevronRight, Copy, Trash2, MoreVertical, Flag, Star, Heart, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import RatingModal from '../components/RatingModal';
import ReportModal from '../components/ReportModal';

dayjs.locale('id');

const formatDateGroup = (dateString) => {
  if (!dateString) return 'Hari ini';
  const date = dayjs(dateString);
  const today = dayjs();
  
  if (date.isSame(today, 'day')) {
    return 'Hari ini';
  } else if (date.isSame(today.subtract(1, 'day'), 'day')) {
    return 'Kemarin';
  } else {
    return date.format('D MMMM YYYY');
  }
};

export default function ChatRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatInfo, setChatInfo] = useState(null);
  const [participantName, setParticipantName] = useState('');
  const [participantImage, setParticipantImage] = useState(null);
  const [merchantData, setMerchantData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [merchantProducts, setMerchantProducts] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  // New States for Header Menu
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);

  const longPressTimer = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let merchantChannel = null;
    let orderChannel = null;

    const initChat = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/auth');
      setUser(user);

      // Fetch chat details
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', id)
        .single();

      if (chatError) {
        console.error('Error fetching chat:', chatError);
        navigate('/chats');
        return;
      }
      
      setChatInfo(chatData);

      if (chatData.chat_type === 'merchant') {
        const { data: mData } = await supabase.from('merchants').select('*').eq('id', chatData.participant_id).maybeSingle();
        if (mData) {
          setMerchantData(mData);
          setParticipantName(mData.name);
          if (mData.logo_url) setParticipantImage(mData.logo_url);
        }
        
        // Setup realtime listener for this merchant
        merchantChannel = supabase
          .channel(`merchant_status_${chatData.participant_id}_${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `id=eq.${chatData.participant_id}` },
            (payload) => setMerchantData(payload.new)
          )
          .subscribe();

      } else if (chatData.chat_type === 'courier') {
        const { data: cData } = await supabase.from('employees').select('full_name').eq('id', chatData.participant_id).maybeSingle();
        if (cData) setParticipantName(cData.full_name);

        // Check if there are any active orders for this courier
        const { data: activeOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('customer_id', user.id)
          .eq('assigned_courier_id', chatData.participant_id)
          .eq('is_deleted', false)
          .not('status', 'in', '("completed","cancelled","rejected")')
          .limit(1);

        if (!activeOrders || activeOrders.length === 0) {
          setIsChatClosed(true);
        }
      }

      if (chatData.order_id) {
        const { data: orderData } = await supabase.from('orders').select('status').eq('id', chatData.order_id).eq('is_deleted', false).maybeSingle();
        if (!orderData || ['completed', 'cancelled', 'rejected'].includes(orderData.status)) {
          setIsChatClosed(true);
        }

        orderChannel = supabase
          .channel(`order_status_${chatData.order_id}_${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${chatData.order_id}` },
            (payload) => {
              if (payload.new.is_deleted || ['completed', 'cancelled', 'rejected'].includes(payload.new.status)) {
                setIsChatClosed(true);
              }
            }
          )
          .subscribe();
      }

      // Fetch existing messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', id)
        .eq('is_deleted_by_customer', false)
        .order('created_at', { ascending: true });

      if (!messagesError && messagesData) {
        setMessages(messagesData);
      }
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      // Check if followed (only if merchant)
      if (chatData.chat_type === 'merchant') {
        const { data: followData } = await supabase
          .from('merchant_followers')
          .select('*')
          .eq('customer_id', user.id)
          .eq('merchant_id', chatData.participant_id)
          .maybeSingle();
        if (followData) setIsFollowed(true);
      }

      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', id)
        .neq('sender_type', 'customer')
        .eq('is_read', false);
    };

    initChat();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(scrollToBottom, 100);
          
          // Mark as read if not from customer
          if (payload.new.sender_type !== 'customer') {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', payload.new.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (merchantChannel) supabase.removeChannel(merchantChannel);
      if (orderChannel) supabase.removeChannel(orderChannel);
    };
    }, [id, navigate]);

  const handleSendMessage = async (e, customMetadata = null) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !customMetadata && stagedAttachments.length === 0) return;

    let finalMetadata = customMetadata;
    if (!finalMetadata && stagedAttachments.length > 0) {
      finalMetadata = {
        type: 'products',
        items: stagedAttachments.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url
        }))
      };
    }

    const content = newMessage.trim() || (finalMetadata ? 'Mengirim lampiran...' : '');
    setNewMessage(''); 
    setStagedAttachments([]);
    setShowProductModal(false);
    setShowOrderModal(false);

    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      chat_id: id,
      sender_id: user.id,
      sender_type: 'customer',
      content: content,
      metadata: finalMetadata,
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: id,
        sender_id: user.id,
        sender_type: 'customer',
        content: content,
        metadata: finalMetadata
      });

    if (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } else {
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);
    }
  };

  const handleOpenProducts = async () => {
    setShowAttachMenu(false);
    if (!chatInfo || chatInfo.chat_type !== 'merchant') return;
    
    setIsUploading(true);
    const { data } = await supabase.from('products').select('*').eq('merchant_id', chatInfo.participant_id).eq('is_available', true);
    if (data) setMerchantProducts(data);
    setIsUploading(false);
    setShowProductModal(true);
  };

  const handleOpenOrders = async () => {
    setShowAttachMenu(false);
    if (!chatInfo || (chatInfo.chat_type !== 'merchant' && chatInfo.chat_type !== 'support')) return;
    
    setIsUploading(true);
    let query = supabase.from('orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });
    if (chatInfo.chat_type === 'merchant') {
      query = query.eq('merchant_id', chatInfo.participant_id);
    }
    const { data } = await query;
    if (data) setCustomerOrders(data);
    setIsUploading(false);
    setShowOrderModal(true);
  };

  const stageProduct = (product) => {
    if (!stagedAttachments.find(p => p.id === product.id)) {
      setStagedAttachments(prev => [...prev, product]);
    }
    setShowProductModal(false);
  };
  
  const removeStagedProduct = (id) => {
    setStagedAttachments(prev => prev.filter(p => p.id !== id));
  };

  const sendOrderAttachment = (order) => {
    handleSendMessage(null, {
      type: 'order',
      id: order.id,
      status: order.status,
      total_price: order.total_price,
      items: order.items
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachMenu(false);
    
    const loadingToast = toast.loading('Mengunggah gambar...');
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
      
      handleSendMessage(null, {
        type: 'image',
        url: data.publicUrl
      });
      toast.success('Gambar terkirim', { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunggah gambar', { id: loadingToast });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTouchStart = (msg) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(msg);
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

  const handleCopyMessage = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.content || '');
      toast.success('Pesan disalin');
      setSelectedMessage(null);
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setSelectedMessage(null);
    
    // Backup state for rollback
    const prevMessagesState = [...messages];
    
    // Optimistic UI update
    setMessages(prev => prev.filter(m => m.id !== msgId));
    
    // Soft delete on server
    const { error } = await supabase.from('messages').update({ is_deleted_by_customer: true }).eq('id', msgId);
    if (error) {
      console.error("Delete Message Error:", error);
      toast.error('Gagal menghapus pesan dari server');
      setMessages(prevMessagesState); // Rollback
    } else {
      toast.success('Pesan dihapus');
    }
  };

  const handleFollowMerchant = async () => {
    if (!chatInfo || chatInfo.chat_type !== 'merchant') return;
    setShowHeaderMenu(false);
    
    if (isFollowed) {
      // Unfollow (optional feature, but good to have)
      const { error } = await supabase
        .from('merchant_followers')
        .delete()
        .eq('customer_id', user.id)
        .eq('merchant_id', chatInfo.participant_id);
        
      if (!error) {
        setIsFollowed(false);
        toast.success('Berhenti mengikuti toko');
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('merchant_followers')
        .insert({
          customer_id: user.id,
          merchant_id: chatInfo.participant_id
        });
        
      if (!error) {
        setIsFollowed(true);
        toast.success('Berhasil mengikuti toko!');
      } else {
        toast.error('Gagal mengikuti toko');
      }
    }
  };

  const handleWhatsAppCS = () => {
    setShowHeaderMenu(false);
    // Hardcoded WhatsApp Number for CS MVP
    const waNumber = "6287842344481"; 
    const text = "Halo TutahTitah Support, saya butuh bantuan.";
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getStoreStatus = () => {
    if (!merchantData) return { isOpen: false };
    if (!merchantData.operating_hours || !Array.isArray(merchantData.operating_hours)) {
      return { isOpen: true };
    }
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const today = days[currentTime.getDay()];
    const todayHours = merchantData.operating_hours.find(h => h.day === today);
    if (!todayHours || !todayHours.is_open) return { isOpen: false };
    
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [openH, openM] = (todayHours.open || '00:00').split(':').map(Number);
    const [closeH, closeM] = (todayHours.close || '23:59').split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    
    return { isOpen: currentMins >= openMins && currentMins <= closeMins };
  };

  // Determine header info
  let title = 'Customer Service';
  let subtitle = 'Online';
  let Icon = User;
  let isStoreOpen = false;
  
  if (chatInfo) {
    if (chatInfo.chat_type === 'merchant') {
      title = participantName || 'Toko / Merchant';
      Icon = Store;
      if (chatInfo.order_id) {
        subtitle = `Pesanan #${chatInfo.order_id}`;
      } else {
        const status = getStoreStatus();
        isStoreOpen = status.isOpen;
        subtitle = status.isOpen ? 'Online (Toko Buka)' : 'Offline (Toko Tutup)';
      }
    } else if (chatInfo.chat_type === 'courier') {
      title = participantName || 'Kurir Driver';
      Icon = Bike;
      if (chatInfo.order_id) subtitle = `Mengantar Pesanan #${chatInfo.order_id}`;
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto sm:border-x sm:border-gray-200 overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none" 
           style={{ 
             backgroundImage: 'url("/bg-chat.webp")',
             backgroundRepeat: 'repeat',
             backgroundSize: '300px'
           }}>
      </div>

      {/* Header */}
      <div className="bg-primary px-3 py-3 flex items-center gap-3 z-40 relative text-white shadow-md rounded-b-2xl">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden shrink-0">
          {(!chatInfo || chatInfo.chat_type === 'support') ? (
            <img src="/icon-cs.webp" alt="CS" className="w-full h-full object-cover" />
          ) : participantImage ? (
            <img src={participantImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <Icon size={20} />
          )}
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <h1 className="text-base font-bold truncate leading-tight">{title}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {!chatInfo?.order_id && chatInfo?.chat_type === 'merchant' ? (
              <div className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            ) : chatInfo?.chat_type === 'support' ? (
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            ) : null}
            <span className={`text-[11px] font-semibold truncate ${
              (!chatInfo?.order_id && chatInfo?.chat_type === 'merchant' && !isStoreOpen) ? 'text-gray-300' : 'text-blue-100'
            }`}>{subtitle}</span>
          </div>
        </div>
        
        {/* Header Action Menu Button */}
        <div className="relative">
          <button 
            onClick={() => setShowHeaderMenu(!showHeaderMenu)} 
            className="p-1 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <MoreVertical size={24} />
          </button>
          
          {/* Dropdown Menu */}
          {showHeaderMenu && (
            <>
              {/* Invisible overlay to close menu on outside click */}
              <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)}></div>
              
              <div className="absolute top-10 right-0 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-slideUp text-gray-800">
                {chatInfo?.chat_type === 'merchant' && (
                  <>
                    <button onClick={handleFollowMerchant} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                      <Heart size={18} className={isFollowed ? "fill-red-500 text-red-500" : "text-gray-500"} />
                      <span className="text-sm font-semibold">{isFollowed ? 'Batal Follow' : 'Follow Toko'}</span>
                    </button>
                    <button onClick={() => { setShowHeaderMenu(false); setShowRatingModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                      <Star size={18} className="text-yellow-500" />
                      <span className="text-sm font-semibold">Beri Nilai Toko</span>
                    </button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={() => { setShowHeaderMenu(false); setShowReportModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-red-600">
                      <Flag size={18} />
                      <span className="text-sm font-semibold">Laporkan Toko</span>
                    </button>
                  </>
                )}
                
                {chatInfo?.chat_type === 'courier' && (
                  <>
                    <button onClick={() => { setShowHeaderMenu(false); setShowRatingModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                      <Star size={18} className="text-yellow-500" />
                      <span className="text-sm font-semibold">Beri Nilai Kurir</span>
                    </button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={() => { setShowHeaderMenu(false); setShowReportModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-red-600">
                      <Flag size={18} />
                      <span className="text-sm font-semibold">Laporkan Mitra</span>
                    </button>
                  </>
                )}
                
                {chatInfo?.chat_type === 'support' && (
                  <button onClick={handleWhatsAppCS} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left text-green-600">
                    <MessageCircle size={18} />
                    <span className="text-sm font-semibold">Chat Via WhatsApp</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 z-10 scroll-smooth">
        {loading ? (
          <div className="flex justify-center mt-10">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            {messages.map((msg, idx, arr) => {
              const isMe = msg.sender_type === 'customer';
              
              // Grouping by Date
              const currentMsgDate = dayjs(msg.created_at || Date.now()).format('YYYY-MM-DD');
              const prevMsgDate = idx > 0 ? dayjs(arr[idx - 1].created_at || Date.now()).format('YYYY-MM-DD') : null;
              const showDateHeader = currentMsgDate !== prevMsgDate;

              // Check if previous message is from same sender to group them (only if they are on the same day)
              const prevMsg = idx > 0 ? arr[idx - 1] : null;
              const isGrouped = !showDateHeader && prevMsg && prevMsg.sender_type === msg.sender_type;

              return (
                <div key={msg.id} className="flex flex-col">
                  {showDateHeader && (
                    <div className="flex justify-center mb-4 mt-4">
                      <span className="bg-white/60 backdrop-blur-sm border border-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-full font-bold shadow-sm uppercase tracking-wider">
                        {formatDateGroup(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-2'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm relative transition-transform active:scale-[0.98] ${
                      isMe 
                        ? 'bg-primary text-white rounded-tr-sm shadow-blue-900/10' 
                        : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                    }`}
                    onTouchStart={() => handleTouchStart(msg)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(msg)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    >
                      <p className={`text-sm leading-snug break-words ${msg.metadata && (msg.content === 'Mengirim lampiran...' || msg.content === '') ? 'hidden' : ''}`}>
                        {msg.content}
                      </p>
                      
                      {msg.metadata && msg.metadata.type === 'products' && (
                        <div className="flex flex-col gap-1.5 mt-1.5">
                          {msg.metadata.items.map((item, i) => (
                            <div 
                              key={i}
                              onClick={() => navigate(`/product/${item.id}`, { state: { merchant: chatInfo } })}
                              className={`rounded-xl p-2 flex gap-3 items-center cursor-pointer active:scale-95 transition-all ${isMe ? 'bg-blue-600/20 hover:bg-blue-600/30' : 'bg-gray-50 hover:bg-gray-100 border border-gray-100/50'}`}
                            >
                              <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0">
                                {item.image_url ? (
                                  <img src={item.image_url} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16}/></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pr-2">
                                <p className={`text-[11px] font-bold line-clamp-1 ${isMe ? 'text-white' : 'text-gray-800'}`}>{item.name}</p>
                                <p className={`text-[9px] font-semibold ${isMe ? 'text-blue-100' : 'text-primary'}`}>Rp {item.price?.toLocaleString('id-ID')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {msg.metadata && msg.metadata.type === 'product' && (
                        <div 
                          onClick={() => navigate(`/product/${msg.metadata.id}`, { state: { merchant: chatInfo } })}
                          className={`mt-1.5 ${isMe ? 'bg-blue-600/20 hover:bg-blue-600/30' : 'bg-gray-50 hover:bg-gray-100'} rounded-xl p-2 flex gap-3 items-center cursor-pointer active:scale-95 transition-all`}
                        >
                          <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0">
                            {msg.metadata.image_url ? (
                              <img src={msg.metadata.image_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20}/></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pr-2">
                            <p className={`text-xs font-bold line-clamp-1 ${isMe ? 'text-white' : 'text-gray-800'}`}>{msg.metadata.name}</p>
                            <p className={`text-[10px] font-semibold ${isMe ? 'text-blue-100' : 'text-primary'}`}>Rp {msg.metadata.price?.toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      )}
                      
                      {msg.metadata && msg.metadata.type === 'image' && (
                        <div className="mt-1.5 rounded-xl overflow-hidden shadow-sm border border-black/5 relative">
                           <img src={msg.metadata.url} alt="Attachment" className="max-w-full h-auto max-h-48 object-cover" />
                        </div>
                      )}
                      
                      {msg.metadata && msg.metadata.type === 'order' && (
                        <div 
                          onClick={() => navigate(`/order/${msg.metadata.id}`)}
                          className={`mt-1.5 ${isMe ? 'bg-blue-600/20 hover:bg-blue-600/30' : 'bg-gray-50 hover:bg-gray-100'} rounded-xl p-2.5 cursor-pointer active:scale-95 transition-all`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[9px] font-bold ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>ORDER #{msg.metadata.id}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-blue-600 uppercase shadow-sm border border-black/5">{msg.metadata.status}</span>
                          </div>
                          <p className={`text-xs font-bold mb-0.5 ${isMe ? 'text-white' : 'text-gray-800'}`}>{msg.metadata.items?.length || 0} Items</p>
                          <p className={`text-xs font-bold ${isMe ? 'text-blue-100' : 'text-primary'}`}>Rp {msg.metadata.total_price?.toLocaleString('id-ID')}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1.5 mt-1.5">
                        <span className={`text-[9px] font-bold ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                          {dayjs(msg.created_at).format('HH:mm')}
                        </span>
                        {/* Checkmarks for my messages */}
                        {isMe && (
                           <svg viewBox="0 0 16 15" width="14" height="13" className={msg.is_read ? 'text-blue-300 fill-current' : 'text-white/40 fill-current'}>
                             <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
                           </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {isChatClosed ? (
        <div className="bg-gray-100 text-center py-4 px-4 text-sm font-semibold text-gray-500 border-t border-gray-200 z-10 relative">
          Sesi obrolan ini telah berakhir karena pesanan sudah selesai/dibatalkan.
        </div>
      ) : (
      <div className="bg-white z-10 border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] relative flex flex-col">
        
        {/* Offline Notification */}
        {chatInfo?.chat_type === 'merchant' && !isStoreOpen && (
          <div className="bg-amber-50/80 backdrop-blur-sm border-b border-amber-100 px-4 py-2.5 flex items-center justify-center gap-2">
            <span className="text-amber-700 text-[11px] font-semibold text-center leading-tight">
              Mohon bersabar, toko sedang tutup. Pesan Anda akan dibalas saat toko beroperasi kembali.
            </span>
          </div>
        )}

        {/* Staging Area */}
        {stagedAttachments.length > 0 && (
          <div className="px-3 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
            {stagedAttachments.map(p => (
              <div key={p.id} className="relative bg-gray-50 border border-gray-200 rounded-lg p-1.5 flex gap-2 items-center min-w-[140px] max-w-[200px] shrink-0 animate-fadeIn">
                <img src={p.image_url || '/placeholder.png'} className="w-8 h-8 rounded-md object-cover bg-gray-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-700 line-clamp-1">{p.name}</p>
                  <p className="text-[9px] text-primary font-semibold">Rp {p.price?.toLocaleString('id-ID')}</p>
                </div>
                <button type="button" onClick={() => removeStagedProduct(p.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="p-3 flex gap-2 relative">
          {/* Attachment Menu */}
          {showAttachMenu && (
            <div className="absolute bottom-[60px] left-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 w-48 animate-slideUp">
              {chatInfo?.chat_type === 'merchant' && (
                <button onClick={handleOpenProducts} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left active:bg-gray-100">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Package size={16} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Produk</span>
                </button>
              )}
              {(chatInfo?.chat_type === 'merchant' || chatInfo?.chat_type === 'support') && (
                <button onClick={handleOpenOrders} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left active:bg-gray-100">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Receipt size={16} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Pesanan</span>
                </button>
              )}
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left active:bg-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  <ImageIcon size={16} />
                </div>
                <span className="text-sm font-semibold text-gray-700">Gambar</span>
              </button>
            </div>
          )}

          <input 
            type="file" 
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          <button 
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={isUploading}
            className={`w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 transition-all ${showAttachMenu ? 'bg-gray-200 text-gray-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'} ${isUploading ? 'opacity-50' : ''}`}
          >
            <Paperclip size={20} className={showAttachMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
          </button>

          <form onSubmit={(e) => handleSendMessage(e)} className="flex-1 flex gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-full flex items-center px-4 py-2.5 transition-colors">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ketik pesan..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 font-medium"
              />
            </div>
            <button 
              type="submit"
              disabled={!newMessage.trim() && stagedAttachments.length === 0}
              className="w-[46px] h-[46px] rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/20 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-transform"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
        </div>
      </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end animate-fadeIn">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl h-[70vh] flex flex-col animate-slideUp shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Pilih Produk</h3>
              <button onClick={() => setShowProductModal(false)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {merchantProducts.map(p => (
                <div key={p.id} onClick={() => stageProduct(p)} className="flex gap-3 items-center p-3 border border-gray-100 rounded-2xl hover:border-primary/30 active:bg-blue-50 cursor-pointer transition-colors group">
                  <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-black/5">
                    {p.image_url ? (
                      <img src={p.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20}/></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 text-sm line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h4>
                    <p className="text-primary font-bold text-xs mt-0.5">Rp {p.price?.toLocaleString('id-ID')}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
                </div>
              ))}
              {merchantProducts.length === 0 && (
                <div className="text-center py-10">
                  <Package size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm font-medium">Toko ini belum memiliki produk.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end animate-fadeIn">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl h-[70vh] flex flex-col animate-slideUp shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Pilih Pesanan</h3>
              <button onClick={() => setShowOrderModal(false)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {customerOrders.map(order => (
                <div key={order.id} onClick={() => sendOrderAttachment(order)} className="p-3 border border-gray-100 rounded-2xl hover:border-primary/30 active:bg-blue-50 cursor-pointer transition-colors group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 group-hover:text-primary transition-colors">ORDER #{order.id}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase">{order.status}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 mb-1">{order.items?.length || 0} Items</p>
                  <p className="text-primary font-bold text-sm">Rp {order.total_amount?.toLocaleString('id-ID') || order.total_price?.toLocaleString('id-ID')}</p>
                </div>
              ))}
              {customerOrders.length === 0 && (
                <div className="text-center py-10">
                  <Receipt size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm font-medium">Belum ada pesanan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Long Press) */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end animate-fadeIn" onClick={() => setSelectedMessage(null)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pb-8 pt-2 px-4 flex flex-col animate-slideUp shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <button onClick={handleCopyMessage} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors text-left active:bg-gray-100">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                <Copy size={18} />
              </div>
              <span className="text-base font-semibold text-gray-800">Salin Pesan</span>
            </button>
            <button onClick={handleDeleteMessage} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 rounded-2xl transition-colors text-left mt-1 active:bg-red-100">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <span className="text-base font-semibold text-red-600">Hapus Pesan</span>
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)}
        targetId={chatInfo?.participant_id}
        targetType={chatInfo?.chat_type}
        customerId={user?.id}
        targetName={chatInfo?.participant_name}
      />

      {/* Rating Modal */}
      <RatingModal 
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        targetId={chatInfo?.participant_id}
        targetType={chatInfo?.chat_type}
        targetName={participantName}
        customerId={user?.id}
        orderId={chatInfo?.order_id}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Clock, CheckCircle2, Package, Loader2, Bike, AlertTriangle, ChevronRight, ChevronDown, Check, ShoppingCart, ShoppingBag, Navigation, Edit3, Heart, PaintRoller, Star, Store, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import RatingModal from '../components/RatingModal';

export default function Activity() {
  const navigate = useNavigate();
  const [activeTab, setActiveTabState] = useState(() => {
    return sessionStorage.getItem('activityTab') || 'proses';
  });
  const [favoriteSubTab, setFavoriteSubTabState] = useState(() => {
    return sessionStorage.getItem('activityFavoriteSubTab') || 'pesanan';
  });

  const setFavoriteSubTab = (tab) => {
    setFavoriteSubTabState(tab);
    sessionStorage.setItem('activityFavoriteSubTab', tab);
  };

  const [ulasanSubTab, setUlasanSubTabState] = useState(() => {
    return sessionStorage.getItem('activityUlasanSubTab') || 'layanan';
  });

  const setUlasanSubTab = (tab) => {
    setUlasanSubTabState(tab);
    sessionStorage.setItem('activityUlasanSubTab', tab);
  };
  const [userRatings, setUserRatings] = useState([]);

  // Rating Modal States
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTargetId, setRatingTargetId] = useState(null);
  const [ratingTargetType, setRatingTargetType] = useState('');
  const [ratingTargetName, setRatingTargetName] = useState('');
  const [ratingOrderId, setRatingOrderId] = useState(null);
  const [ratingInitialValue, setRatingInitialValue] = useState(0);
  const [customerProfileId, setCustomerProfileId] = useState(null);

  const openRatingModal = (orderId, targetId, type, name, initialVal = 0) => {
    setRatingOrderId(orderId);
    setRatingTargetId(targetId);
    setRatingTargetType(type);
    setRatingTargetName(name);
    setRatingInitialValue(initialVal);
    setRatingModalOpen(true);
  };


  const isOrderUnrated = (order, allUserRatings) => {
    if (order.status !== 'completed') return false;

    const orderRatings = allUserRatings.filter(r => r.order_id === order.id);
    const hasCourierRating = orderRatings.some(r => r.target_type === 'courier');

    if (!hasCourierRating) return true; // Missing courier rating

    const isJasaOnly = ['Antar Jemput', 'Kirim Barang'].includes(order.tipe_layanan);
    if (!isJasaOnly) {
      const merchants = new Set();
      if (order.merchant_id) merchants.add(order.merchant_id);
      if (order.items) {
        order.items.forEach(i => {
          if (i.merchant_id) merchants.add(i.merchant_id);
        });
      }

      for (let mId of merchants) {
        const hasRatedMerchant = orderRatings.some(r => r.target_id === mId && r.target_type === 'merchant');
        if (!hasRatedMerchant) return true; // Missing merchant rating
      }
    }

    return false; // All rated
  };

  const setActiveTab = (tab) => {
    if (tab === 'ulasan' && activeTab !== 'ulasan') {
      const pendingUlasanCount = orders.filter(o => isOrderUnrated(o, userRatings)).length;
      if (pendingUlasanCount > 0) {
        toast.success("Masukan Anda sangat bermanfaat untuk kami! Yuk berikan ulasan.", {
          icon: '⭐',
          duration: 4000,
          style: {
            borderRadius: '16px',
            background: '#fff9c4',
            color: '#b45309',
            border: '1px solid #fef08a'
          },
        });
      }
    }
    setActiveTabState(tab);
    sessionStorage.setItem('activityTab', tab);
  };
  const [historyDateFilter, setHistoryDateFilter] = useState('semua');
  const [historyServiceFilter, setHistoryServiceFilter] = useState('semua');
  const [showFilterSheet, setShowFilterSheet] = useState(null); // 'date' | 'service' | null
  const [orders, setOrders] = useState([]);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [favoriteMerchants, setFavoriteMerchants] = useState([]);

  const dateFilterOptions = [
    { value: 'semua', label: 'Semua Tanggal' },
    { value: 'hari_ini', label: 'Hari Ini' },
    { value: 'minggu_ini', label: '7 Hari Terakhir' },
    { value: 'bulan_ini', label: 'Bulan Ini' }
  ];

  const serviceFilterOptions = [
    { value: 'semua', label: 'Semua Layanan' },
    { value: 'Antar Jemput', label: 'Antar Jemput' },
    { value: 'Kirim Barang', label: 'Kirim Barang' },
    { value: 'Belanja', label: 'Belanja' }
  ];

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let channel;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Ambil data customer berdasarkan auth_id
        const { data: profile } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (profile) {
          setCustomerProfileId(profile.id);
          await Promise.all([
            fetchOrders(profile.id),
            fetchFavoriteProducts(user.id),
            fetchFavoriteMerchants(user.id),
            fetchRatings(profile.id)
          ]);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    let channel;
    if (activeTab === 'proses' && customerProfileId) {
      channel = setupRealtime(customerProfileId);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeTab, customerProfileId]);

  const fetchOrders = async (userId) => {
    const { data, error } = await supabase
      .from('orders')
      // Menggunakan syntax relasi spesifik foreign key jika ada ambiguitas
      .select('*, employees!assigned_courier_id(full_name), merchants(id, name, logo_url)')
      .eq('customer_id', userId)
      .neq('is_deleted', true)  // Jangan tampilkan order yang sudah dihapus admin
      .order('id', { ascending: false });

    if (error) {
      console.error("Fetch orders error:", error);
      toast.error('Gagal memuat aktivitas pesanan', { id: 'fetch-orders' });
    } else if (data) {
      setOrders(data);
    }
  };


  const fetchRatings = async (customerId) => {
    const { data, error } = await supabase
      .from('ratings')
      .select('target_id, target_type, order_id, rating')
      .eq('customer_id', customerId);

    if (!error && data) {
      setUserRatings(data);
    }
  };

  const fetchFavoriteProducts = async (authId) => {
    const { data, error } = await supabase
      .from('favorite_products')
      .select('*, products(*, merchants(id, name))')
      .eq('auth_id', authId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Filter produk yang sudah dihapus (products null) atau tidak tersedia
      const filtered = data.filter(fp => {
        const product = Array.isArray(fp.products) ? fp.products[0] : fp.products;
        return product && product.is_available !== false;
      });
      setFavoriteProducts(filtered);
    }
  };

  const fetchFavoriteMerchants = async (authId) => {
    // Supabase returns 400 Bad Request if we try to join merchants directly without a foreign key
    const { data: followers, error } = await supabase
      .from('merchant_followers')
      .select('*')
      .eq('customer_id', authId)
      .order('created_at', { ascending: false });

    if (!error && followers && followers.length > 0) {
      const merchantIds = followers.map(f => f.merchant_id);

      const [merchantsRes, ratingsRes, followersRes] = await Promise.all([
        supabase.from('merchants').select('*').in('id', merchantIds),
        supabase.from('ratings').select('target_id, rating').eq('target_type', 'merchant').in('target_id', merchantIds),
        supabase.from('merchant_followers').select('merchant_id').in('merchant_id', merchantIds)
      ]);

      if (merchantsRes.data) {
        const combinedData = followers.map(f => {
          const m = merchantsRes.data.find(m => m.id === f.merchant_id);
          if (!m) return null;

          const mRatings = ratingsRes.data?.filter(r => r.target_id === m.id) || [];
          const avgRating = mRatings.length > 0
            ? (mRatings.reduce((acc, curr) => acc + curr.rating, 0) / mRatings.length).toFixed(1)
            : '0.0';

          const mFollowersCount = followersRes.data?.filter(af => af.merchant_id === m.id).length || 0;

          return {
            ...f,
            merchants: {
              ...m,
              rating: avgRating,
              followerCount: mFollowersCount
            }
          };
        }).filter(Boolean);

        setFavoriteMerchants(combinedData);
      }
    } else {
      setFavoriteMerchants([]);
    }
  };

  const fetchSingleOrder = async (orderId) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, employees!assigned_courier_id(full_name)')
      .eq('id', orderId)
      .single();
    if (!error && data) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data : o)));
    } else if (error) {
      console.error("Fetch single order error:", error);
    }
  };

  const toggleFavorite = async (e, orderId, currentStatus) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('orders')
        .update({ is_favorite: !currentStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_favorite: !currentStatus } : o));

      if (!currentStatus) {
        toast.success("Disimpan ke Favorit! ❤️");
      } else {
        toast.success("Dihapus dari Favorit.");
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
      toast.error("Gagal mengubah status favorit");
    }
  };

  const removeFavoriteProduct = async (e, productId) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('favorite_products')
        .delete()
        .eq('product_id', productId)
        .eq('auth_id', user.id);

      if (error) throw error;

      setFavoriteProducts(prev => prev.filter(fp => fp.product_id !== productId));
      toast.success("Dihapus dari produk favorit");
    } catch (error) {
      console.error("Remove favorite product error:", error);
      toast.error("Gagal menghapus produk favorit");
    }
  };

  const handleRepeatOrder = (e, order) => {
    e.stopPropagation();
    if (order.tipe_layanan === 'Antar Jemput') {
      navigate('/antar-jemput', { state: { raw_order_text: order.raw_order_text, isRepeatOrder: true } });
    } else if (order.tipe_layanan === 'Kirim Barang') {
      navigate('/kirim-barang', { state: { raw_order_text: order.raw_order_text, isRepeatOrder: true } });
    } else if (order.tipe_layanan === 'Belanja' || order.tipe_layanan === 'Jastip') {
      navigate('/checkout', { state: { items: order.items, merchant: order.merchant_id ? { id: order.merchant_id } : null, isRepeatOrder: true } });
    } else {
      toast.error("Fitur Pesan Lagi untuk kategori ini akan segera hadir!");
    }
  };

  const setupRealtime = (userId) => {
    const channel = supabase
      .channel(`orders-${userId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Need to fetch to get relational data like employee name
            const { data } = await supabase.from('orders').select('*, employees!assigned_courier_id(full_name)').eq('id', payload.new.id).single();
            if (data) setOrders((prev) => [data, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            await fetchSingleOrder(payload.new.id);
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id));
          }
        }
      );

    channel.subscribe();
    return channel;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-32 font-sans">
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-5 border-b border-gray-100 shadow-sm flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Aktivitas Pesanan</h1>
        </div>
        <div className="pt-2 pb-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-4 border-y border-gray-100 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-6 bg-gray-200 rounded-full w-1/4"></div>
              </div>
              <div className="h-16 bg-gray-100 rounded-xl mb-3"></div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 font-sans">
        <p className="text-gray-500 font-medium">Silakan login untuk melihat aktivitas pesanan.</p>
      </div>
    );
  }

  // Filter logic
  const inProgressStatuses = ['pending', 'admin_accepted', 'merchant_accepted', 'process', 'on_delivery'];
  const historyStatuses = ['completed', 'cancelled', 'rejected'];

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'proses') {
      return inProgressStatuses.includes(order.status) || !historyStatuses.includes(order.status);
    } else if (activeTab === 'riwayat') {
      let pass = historyStatuses.includes(order.status);

      if (pass && historyServiceFilter !== 'semua') {
        pass = order.tipe_layanan === historyServiceFilter;
      }

      if (pass && historyDateFilter !== 'semua') {
        const orderDate = new Date(order.created_at);
        const today = new Date();
        if (historyDateFilter === 'hari_ini') {
          pass = orderDate.toDateString() === today.toDateString();
        } else if (historyDateFilter === 'minggu_ini') {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          pass = orderDate >= sevenDaysAgo;
        } else if (historyDateFilter === 'bulan_ini') {
          pass = orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
        }
      }
      return pass;
    } else if (activeTab === 'ulasan') {
      return isOrderUnrated(order, userRatings);
    } else if (activeTab === 'favorit') {
      return order.is_favorite === true;
    }
    return false;
  });

  const prosesCount = orders.filter(order => inProgressStatuses.includes(order.status) || !historyStatuses.includes(order.status)).length;
  const ulasanCount = orders.filter(order => isOrderUnrated(order, userRatings)).length;
  const favoritCount = orders.filter(order => order.is_favorite === true).length + favoriteProducts.length + favoriteMerchants.length;


  const purchasedProducts = orders
    .filter(o => o.status === 'completed')
    .flatMap(order => {
      const isJasaOnly = ['Antar Jemput', 'Kirim Barang'].includes(order.tipe_layanan);
      if (isJasaOnly) return [];
      return (order.items || [])
        .filter(item => !(item.is_custom || !item.price || item.price === 0))
        .map(item => {
          // Find if user already rated this product for this order
          const existingRating = userRatings.find(r => r.order_id === order.id && r.target_type === 'product' && r.target_id === item.id);
          return {
            ...item,
            orderId: order.id,
            orderDate: order.created_at,
            merchantId: order.merchant_id || item.merchant_id,
            merchantName: item.merchant_name || item.merchantName || order.merchants?.name || 'Toko Lainnya',
            rating: existingRating ? existingRating.rating : 0
          };
        })
        .filter(p => p.rating === 0);
    });

  const ulasanProdukCount = purchasedProducts.filter(p => p.rating === 0).length;

  const getServiceIcon = (tipe_layanan) => {
    switch (tipe_layanan) {
      case 'Belanja': return <img src="/icon-belanja.webp" alt="Belanja" className="w-6 h-6 object-contain drop-shadow-sm" />;
      case 'Jastip': return <ShoppingBag size={18} className="text-gray-800" strokeWidth={2.5} />;
      case 'Antar Jemput': return <img src="/icon-ojek.webp" alt="Antar Jemput" className="w-6 h-6 object-contain drop-shadow-sm" />;
      case 'Kirim Barang': return <img src="/icon-kirim-barang.webp" alt="Kirim Barang" className="w-6 h-6 object-contain drop-shadow-sm" />;
      default: return <Package size={18} className="text-gray-800" strokeWidth={2.5} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(' pukul', ',');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-sans relative">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 shadow-sm pt-5 px-0">
        <div className="px-6 flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Aktivitas Pesanan</h1>
          <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-[10px] font-bold border border-green-100/50 shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            Live Update
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-12 -mt-12 overflow-x-auto hide-scrollbar border-b border-gray-100">
          {[
            { id: 'proses', label: 'Dalam Proses', count: prosesCount },
            { id: 'ulasan', label: 'Ulasan', count: ulasanCount },
            { id: 'riwayat', label: 'Riwayat', count: 0 },
            { id: 'favorit', label: 'Favorit', count: favoritCount }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-fit whitespace-nowrap py-4 px-4 transition-all duration-200 flex justify-center items-center border-b-[3px] ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="relative inline-flex items-center">
                  <span className="text-sm font-semibold">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="absolute -top-2 -right-4 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm z-10 border border-white">
                      {tab.count > 99 ? '99+' : tab.count}
                    </span>
                  )}
                  {tab.id === 'ulasan' && tab.count > 0 && activeTab !== 'ulasan' && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-max bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-blue-500/20 animate-bounce z-20">
                      Ada yang belum diulas!
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45"></div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* History Filters */}
        {activeTab === 'riwayat' && (
          <div className="px-4 py-3 bg-white/95 backdrop-blur-md border-b border-gray-100 flex gap-2 overflow-x-auto hide-scrollbar relative z-30">
            <button
              onClick={() => setShowFilterSheet('date')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${historyDateFilter !== 'semua' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              {dateFilterOptions.find(o => o.value === historyDateFilter)?.label}
              <ChevronDown size={14} className={historyDateFilter !== 'semua' ? 'text-primary' : 'text-gray-400'} />
            </button>
            <button
              onClick={() => setShowFilterSheet('service')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${historyServiceFilter !== 'semua' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              {serviceFilterOptions.find(o => o.value === historyServiceFilter)?.label}
              <ChevronDown size={14} className={historyServiceFilter !== 'semua' ? 'text-primary' : 'text-gray-400'} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'ulasan' && (
        <div className="px-4 pt-4 mb-1">
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setUlasanSubTab('layanan')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${ulasanSubTab === 'layanan' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Ulas Layanan
            </button>
            <button
              onClick={() => setUlasanSubTab('produk')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative ${ulasanSubTab === 'produk' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Ulas Produk
              {ulasanProdukCount > 0 && (
                <span className="absolute top-1.5 right-4 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'favorit' && (
        <div className="px-4 pt-4 mb-1">
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setFavoriteSubTab('pesanan')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${favoriteSubTab === 'pesanan' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pesanan
            </button>
            <button
              onClick={() => setFavoriteSubTab('produk')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${favoriteSubTab === 'produk' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Produk
            </button>
            <button
              onClick={() => setFavoriteSubTab('toko')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${favoriteSubTab === 'toko' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Toko
            </button>
          </div>
        </div>
      )}

      <div className="pt-2 pb-4">
        {activeTab === 'favorit' && favoriteSubTab === 'produk' ? (
          favoriteProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4 mx-4">
              <div className="w-40 h-40 mx-auto mb-4 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                <img src="/empty-activity.webp" alt="Belum Ada Favorit" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Favorit</h3>
              <p className="text-sm text-gray-500 px-6">
                Mulai cari produk kesukaanmu dan simpan di sini!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4 pt-4">
              {favoriteProducts.map((fp) => {
                const product = Array.isArray(fp.products) ? fp.products[0] : fp.products;
                if (!product) return null;
                return (
                  <div
                    key={fp.id}
                    onClick={() => navigate(`/product/${product.id}`, { state: { merchant: product.merchants } })}
                    className="bg-white rounded-2xl pb-3 border border-gray-100 shadow-sm cursor-pointer active:scale-95 transition-all relative overflow-hidden flex flex-col"
                  >
                    <button
                      onClick={(e) => removeFavoriteProduct(e, product.id)}
                      className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex flex-col items-center justify-center shadow-sm"
                    >
                      <Heart size={16} className="fill-red-500 text-red-500" />
                    </button>
                    <div className="w-full aspect-square bg-gray-100 mb-2 border-b border-gray-100 flex shrink-0 items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="px-3 flex-1 flex flex-col">
                      <p className="text-[10px] text-gray-500 mb-0.5 truncate">{product.merchants?.name || 'Toko Lainnya'}</p>
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2 mb-1.5 mt-auto">
                        <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-700">
                          <Star size={10} className="fill-yellow-500 text-yellow-500" />
                          <span>{product.rating_score ? Number(product.rating_score).toFixed(1) : '0.0'}</span>
                          <span className="font-medium text-yellow-600/80">({product.total_ratings || 0})</span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-600">
                          <Heart size={10} className="text-gray-400" />
                          {product.favorite_count || 0} suka
                        </div>
                      </div>
                      <p className="text-primary font-bold text-sm">Rp {product.price.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'favorit' && favoriteSubTab === 'pesanan' && filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4 mx-4">
            <div className="w-40 h-40 mx-auto mb-4 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <img src="/empty-activity.webp" alt="Belum Ada Pesanan Favorit" className="w-full h-full object-cover" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Pesanan Favorit</h3>
            <p className="text-sm text-gray-500 px-6">
              Tandai pesanan favoritmu biar gampang dipesan lagi!
            </p>
          </div>
        ) : activeTab === 'favorit' && favoriteSubTab === 'toko' ? (
          favoriteMerchants.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4 mx-4">
              <div className="w-40 h-40 mx-auto mb-4 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                <img src="/empty-activity.webp" alt="Belum Ada Toko Favorit" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Toko</h3>
              <p className="text-sm text-gray-500 px-6">
                Kamu belum mengikuti toko manapun.
              </p>
            </div>
          ) : (
            <div className="space-y-3 px-4 pt-4">
              {favoriteMerchants.map((fm) => {
                const merchant = fm.merchants;
                if (!merchant) return null;
                return (
                  <div
                    key={fm.id}
                    onClick={() => navigate(`/merchant/${merchant.id}`)}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:scale-95 transition-all flex items-center gap-4"
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-full border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {merchant.logo_url ? (
                        <img src={merchant.logo_url} alt={merchant.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-base mb-0.5">{merchant.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <MapPin size={12} className="text-primary" />
                        <span className="line-clamp-1">{merchant.address || 'Alamat tidak tersedia'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          <Star size={10} className="text-amber-500 fill-amber-500" />
                          <span className="text-[10px] font-bold text-amber-700">{merchant.rating > 0 ? merchant.rating : 'Baru'}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                          <Heart size={10} className="text-red-500 fill-red-500" />
                          <span className="text-[10px] font-bold text-red-700">{merchant.followerCount} Suka</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 ml-2" />
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'ulasan' && ulasanSubTab === 'produk' ? (
          purchasedProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4 mx-4">
              <div className="w-40 h-40 mx-auto mb-4 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                <img src="/empty-activity.webp" alt="Kosong" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Ulasan</h3>
              <p className="text-sm text-gray-500 px-6">Wah, saat ini belum ada produk yang perlu kamu ulas nih.</p>
            </div>
          ) : (
            <div className="space-y-3 px-4 pt-2 pb-4">
              {purchasedProducts.map((product, idx) => (
                <div key={`${product.id}-${product.orderId}-${idx}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-stretch overflow-hidden h-24">
                  <div className="w-24 bg-gray-50 overflow-hidden shrink-0 border-r border-gray-100 relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <Package className="absolute inset-0 w-full h-full p-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-[10px] text-gray-500 font-medium truncate">{product.merchantName}</p>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap ml-2">{formatDate(product.orderDate)}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 line-clamp-1 mb-0.5">{product.name}</h3>
                    {product.selectedVariants && Object.keys(product.selectedVariants).length > 0 && (
                      <p className="text-[10px] text-gray-500 font-medium line-clamp-1 mb-1">
                        {Object.values(product.selectedVariants).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-auto">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (product.rating === 0) {
                              openRatingModal(product.orderId, product.id, 'product', product.name, i + 1);
                            }
                          }}
                          disabled={product.rating > 0}
                          className={`focus:outline-none transition-transform ${product.rating === 0 ? 'active:scale-90 hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                        >
                          <Star
                            size={20}
                            className={`${i < (product.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 drop-shadow-sm'} transition-colors`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (activeTab !== 'ulasan' && filteredOrders.length === 0) || (activeTab === 'ulasan' && ulasanSubTab === 'layanan' && filteredOrders.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4 mx-4">
            <div className="w-40 h-40 mx-auto mb-4 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <img src="/empty-activity.webp" alt="Kosong" className="w-full h-full object-cover" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {activeTab === 'ulasan' ? 'Belum Ada Ulasan' :
                activeTab === 'riwayat' ? 'Belum Ada Riwayat' :
                  'Yahh belum Ada Pesanan yang diproses niih'}
            </h3>
            <p className="text-sm text-gray-500 px-6">
              {activeTab === 'proses' ? 'Segera pesan Yukk, biar kami yang antarkan pesanannya' :
                activeTab === 'ulasan' ? 'Wah, saat ini belum ada pesanan yang perlu kamu ulas nih.' :
                  'Riwayat pesanan kamu masih kosong, yuk mulai belanja atau pesan layanan!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredOrders.map((order) => {
              const isJasaOnly = ['Antar Jemput', 'Kirim Barang'].includes(order.tipe_layanan);

              let statusText = '';
              let statusColor = '';

              // --- LOGIC STATUS SESUAI ATURAN ---
              if (order.status === 'pending') {
                statusText = 'Tunggu konfirmasi admin';
                statusColor = 'bg-orange-50 text-orange-600 border-orange-200';
              } else if (order.status === 'admin_accepted') {
                statusText = 'Pesanan Diterima';
                statusColor = 'bg-blue-50 text-blue-600 border-blue-200';
              } else if (order.status === 'merchant_accepted') {
                statusText = 'Belanjaan disiapkan penjual';
                statusColor = 'bg-indigo-50 text-indigo-600 border-indigo-200';
              } else if (order.status === 'process') {
                statusText = 'Sedang Diproses';
                statusColor = 'bg-purple-50 text-purple-600 border-purple-200';
              } else if (order.status === 'on_delivery') {
                statusText = 'Dalam Pengiriman';
                statusColor = 'bg-teal-50 text-teal-600 border-teal-200';
              } else if (order.status === 'rejected' || order.status === 'cancelled') {
                statusText = 'Dibatalkan';
                statusColor = 'bg-red-50 text-red-600 border-red-200';
              } else if (order.status === 'completed') {
                statusText = 'Selesai';
                statusColor = 'bg-green-50 text-green-600 border-green-200';
              } else {
                statusText = order.status;
                statusColor = 'bg-gray-50 text-gray-600 border-gray-200';
              }

              if (activeTab === 'ulasan') {
                const orderRatings = userRatings.filter(r => r.order_id === order.id);
                const courierRating = orderRatings.find(r => r.target_type === 'courier');

                // Group items by merchant
                const items = order.items || [];
                const groupedItems = items.reduce((acc, item) => {
                  const mId = item.merchant_id || order.merchant_id || 'unknown';
                  const mName = item.merchant_name || order.merchants?.name || 'Toko Lainnya';
                  const mPhoto = item.merchant_image_url || order.merchants?.logo_url || null;
                  if (!acc[mId]) acc[mId] = { id: mId, name: mName, photo: mPhoto, items: [] };
                  acc[mId].items.push(item);
                  return acc;
                }, {});

                return (
                  <div key={order.id} className="bg-white px-4 py-4 border-y border-gray-100 shadow-sm active:bg-gray-50 transition-colors duration-200">
                    {/* Header: Service, ID, Date */}
                    <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-50">
                      <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 bg-gray-100/80 rounded-xl flex items-center justify-center shrink-0">
                          {getServiceIcon(order.tipe_layanan)}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Pesanan {order.tipe_layanan}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-medium text-gray-400 tracking-tight">#{order.id.toString().substring(0, 8)}</p>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <p className="text-[10px] text-gray-400 font-medium">{formatDate(order.created_at)}</p>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                        {statusText}
                      </div>
                    </div>

                    {/* Merchant Sections */}
                    {!isJasaOnly && Object.values(groupedItems).map((group, groupIdx) => {
                      if (group.id === 'unknown') return null; // Or handle if somehow unknown
                      const merchantRating = orderRatings.find(r => r.target_id === group.id && r.target_type === 'merchant');

                      return (
                        <div key={group.id !== 'unknown' ? group.id : groupIdx} className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              {group.photo ? (
                                <img src={group.photo} alt={group.name} className="w-5 h-5 rounded-md object-cover border border-gray-100" />
                              ) : (
                                <Store size={14} className="text-primary" />
                              )}
                              <span className="font-bold text-gray-800 text-sm">{group.name}</span>
                            </div>
                            {merchantRating ? (
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={16} className={i < (merchantRating.rating || 5) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 cursor-pointer">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={18}
                                    className="fill-gray-100 text-gray-300 hover:fill-yellow-400 hover:text-yellow-400 hover:scale-110 transition-all active:scale-95"
                                    onClick={() => openRatingModal(order.id, group.id, 'merchant', group.name, i + 1)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5 pl-6 border-l-2 border-gray-50 ml-1.5">
                            {group.items.map((item, idx) => {
                              const variantValues = item.selectedVariants && typeof item.selectedVariants === 'object' ? Object.values(item.selectedVariants).filter(Boolean) : [];
                              return (
                                <div key={idx} className="flex gap-2 items-center">
                                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
                                  <p className="text-xs text-gray-600 line-clamp-1">
                                    {item.qty}x {item.name}
                                    {variantValues.length > 0 && (
                                      <span className="text-[10px] text-gray-400 font-normal italic ml-1">
                                        ({variantValues.join(', ')})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Courier Section */}
                    <div className="mt-2 pt-3 border-t border-dashed border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden relative">
                            <img src="/images/icon-avatar-kurir.webp" alt="Kurir" className="w-full h-full object-cover z-10" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                            <Bike size={14} className="text-gray-400 absolute" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Kurir</p>
                            <p className="text-sm font-bold text-gray-800">{order.employees?.full_name || 'Kurir'}</p>
                          </div>
                        </div>

                        {courierRating ? (
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={16} className={i < (courierRating.rating || 5) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 cursor-pointer">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={18}
                                className="fill-gray-100 text-gray-300 hover:fill-yellow-400 hover:text-yellow-400 hover:scale-110 transition-all active:scale-95"
                                onClick={() => openRatingModal(order.id, order.assigned_courier_id, 'courier', order.employees?.full_name || 'Kurir', i + 1)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              const getFinalPrice = (item) => {
                let price = item.price;
                if (item.variants && item.selectedVariants) {
                  let variantTotalPrice = 0;
                  let hasPricedVariant = false;
                  item.variants.forEach(group => {
                    if (group.has_price) {
                      const selectedLabel = item.selectedVariants[group.name];
                      const option = group.options.find(opt => opt.label === selectedLabel);
                      if (option) {
                        variantTotalPrice += (parseFloat(option.price) || 0);
                        hasPricedVariant = true;
                      }
                    }
                  });
                  if (hasPricedVariant) {
                    price = variantTotalPrice;
                  }
                }
                return parseFloat(price) || 0;
              };

              const getCustomPriceFromBill = (itemName) => {
                if (!order.bill_details) return null;
                const lines = order.bill_details.split('\n');
                for (const line of lines) {
                  const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(`${escapedName}.*?:\\s*Rp\\s*([\\d.,]+)`, 'i');
                  const match = line.match(regex);
                  if (match) {
                    return parseFloat(match[1].replace(/\./g, '').replace(/,/g, ''));
                  }
                }
                return null;
              };

              const isItemCustom = (item) => item.is_custom || !item.price || item.price === 0;

              return (
                <div key={order.id} className="bg-white px-4 py-4 border-y border-gray-100 shadow-sm active:bg-gray-50 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 bg-gray-100/80 rounded-xl flex items-center justify-center shrink-0">
                        {getServiceIcon(order.tipe_layanan)}
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Pesanan {order.tipe_layanan}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] font-medium text-gray-400 tracking-tight">#{order.id.toString().substring(0, 8)}</p>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <p className="text-[10px] text-gray-400 font-medium">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => toggleFavorite(e, order.id, order.is_favorite)}
                        className="p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors active:scale-95"
                      >
                        <Heart size={16} className={order.is_favorite ? 'fill-red-500 text-red-500' : ''} />
                      </button>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                        <span className="text-center leading-tight">{statusText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="space-y-2 mb-3">
                    {(order.items || []).slice(0, 1).map((item, idx) => {
                      let displayPrice = getFinalPrice(item);
                      if (isItemCustom(item) && displayPrice === 0) {
                        const billPrice = getCustomPriceFromBill(item.name);
                        if (billPrice !== null) {
                          displayPrice = billPrice;
                        }
                      }
                      
                      return (
                        <div key={idx} className="flex gap-3 items-center">
                          {!isJasaOnly && item.image_url && (
                            <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 font-medium line-clamp-1">{isJasaOnly ? item.name : `${item.qty}x ${item.name}`}</p>
                            {!isJasaOnly && (
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {isItemCustom(item) && displayPrice === 0 
                                  ? <span className="text-orange-500 italic text-[10px]">Menyusul</span> 
                                  : `Rp ${(displayPrice * item.qty).toLocaleString('id-ID')}`}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(order.items || []).length > 1 && (
                      <p className="text-[10px] text-gray-400 font-medium italic mt-1 pt-1 border-t border-gray-50">
                        ... (+ {(order.items || []).length - 1} produk lainnya)
                      </p>
                    )}
                  </div>

                  {/* Total & Detail Button */}
                  <div className="flex justify-between items-center pt-3 mt-3 border-t border-dashed border-gray-200">
                    <div className="flex flex-col">
                      {isJasaOnly ? (
                        <>
                          <span className="text-[10px] font-bold text-gray-400">Total Ongkir</span>
                          {order.delivery_fee ? (
                            <span className="text-sm font-bold text-primary">Rp {(order.delivery_fee || 0).toLocaleString('id-ID')}</span>
                          ) : (
                            <span className="text-[11px] font-semibold text-orange-500 italic">Admin belum set ongkir</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold text-gray-400">Total Tagihan (termasuk ongkir)</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-primary">
                              {order.total_price && order.total_price > 0 
                                ? `Rp ${(parseFloat(order.total_price) + (order.delivery_fee || 0)).toLocaleString('id-ID')}`
                                : (
                                  (order.items || []).every(i => isItemCustom(i)) && (!order.total_price || order.total_price === 0)
                                    ? <span className="text-orange-500 text-sm italic">Menyusul</span>
                                    : `Rp ${((order.total_amount || 0) + (order.delivery_fee || 0)).toLocaleString('id-ID')}`
                                )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(activeTab === 'favorit' || activeTab === 'riwayat') && (
                        <button onClick={(e) => handleRepeatOrder(e, order)} className="flex items-center justify-center text-[11px] font-bold text-primary bg-white border border-primary px-4 py-1.5 rounded-lg active:bg-primary/5 transition-colors whitespace-nowrap shadow-sm">
                          Pesan Lagi
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/order/${order.id}`)}
                        className="flex items-center justify-center text-[11px] font-bold text-gray-600 bg-white border border-gray-200 py-1.5 px-3 rounded-lg active:bg-gray-50 transition-colors whitespace-nowrap shadow-sm"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end max-w-md mx-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowFilterSheet(null)}></div>
          <div className="bg-white rounded-t-3xl w-full relative z-10 animate-slide-up pb-8 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex justify-center mb-4 pt-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            <div className="px-6 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {showFilterSheet === 'date' ? 'Filter Tanggal' : 'Filter Layanan'}
              </h3>
            </div>
            <div className="px-4">
              {(showFilterSheet === 'date' ? dateFilterOptions : serviceFilterOptions).map(opt => {
                const isActive = (showFilterSheet === 'date' ? historyDateFilter : historyServiceFilter) === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (showFilterSheet === 'date') setHistoryDateFilter(opt.value);
                      else setHistoryServiceFilter(opt.value);
                      setShowFilterSheet(null);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl mb-2 transition-colors ${isActive ? 'bg-primary/10 text-primary font-bold' : 'bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100'}`}
                  >
                    <span>{opt.label}</span>
                    {isActive && <Check size={18} className="text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={async (success) => {
          setRatingModalOpen(false);
          if (success && customerProfileId) {
            // refresh ratings
            await fetchRatings(customerProfileId);
          }
        }}
        orderId={ratingOrderId}
        targetId={ratingTargetId}
        targetType={ratingTargetType}
        targetName={ratingTargetName}
        customerId={customerProfileId || user.id}
        initialRating={ratingInitialValue}
      />
    </div>
  );
}

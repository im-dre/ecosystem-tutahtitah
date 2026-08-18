import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import { ArrowLeft, Store, Package, Clock, MapPin, ShoppingBag, Search, ShoppingCart, Trash2, Camera, X, Heart, MessageSquare, Star, Users, Flag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import ReportModal from '../components/ReportModal';

export default function MerchantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems = [], cartTotal = 0, cartCount = 0 } = useCart();
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // States for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // States for Jastip
  const [jastipItems, setJastipItems] = useState([{ id: Date.now(), name: '', file: null, previewUrl: null }]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRefs = useRef({});

  const handleAddJastipRow = () => {
    setJastipItems([...jastipItems, { id: Date.now(), name: '', file: null, previewUrl: null }]);
  };

  const handleUpdateJastipRow = (id, field, value) => {
    setJastipItems(jastipItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveJastipRow = (id) => {
    if (jastipItems.length > 1) {
      setJastipItems(jastipItems.filter(item => item.id !== id));
    } else {
      setJastipItems([{ id: Date.now(), name: '', file: null, previewUrl: null }]);
    }
  };

  const handleImageSelect = (id, file) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setJastipItems(jastipItems.map(item => item.id === id ? { ...item, file, previewUrl } : item));
    }
  };

  const handleRemoveImage = (id) => {
    setJastipItems(jastipItems.map(item => item.id === id ? { ...item, file: null, previewUrl: null } : item));
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id].value = '';
    }
  };

  const compressImageToThumbnail = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          }, 'image/jpeg', 0.7);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadJastipImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('order-images')
      .upload(fileName, file, {
        cacheControl: '31536000',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('order-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleJastipAddToCart = async () => {
    const validItems = jastipItems.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Isi minimal satu nama barang!');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('Memproses gambar...');

    try {
      const itemsToAdd = [];
      for (const item of validItems) {
        let imageUrl = null;
        if (item.file) {
          const compressedFile = await compressImageToThumbnail(item.file);
          imageUrl = await uploadJastipImage(compressedFile);
        }
        
        itemsToAdd.push({
          id: `custom_${Date.now()}_${Math.random()}`,
          name: item.name,
          price: 0,
          is_custom: true,
          preQty: 1,
          image_url: imageUrl,
        });
      }

      itemsToAdd.forEach(customProduct => {
        addToCart(customProduct, merchant, { showToast: false });
      });

      toast.success('Barang jastip berhasil ditambahkan ke keranjang!', { id: loadingToast });
      setJastipItems([{ id: Date.now(), name: '', file: null, previewUrl: null }]);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengupload gambar. Silakan coba lagi.', { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleJastipCheckoutDirect = async () => {
    const validItems = jastipItems.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Isi minimal satu nama barang!');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('Memproses gambar...');

    try {
      const itemsToCheckout = [];
      for (const item of validItems) {
        let imageUrl = null;
        if (item.file) {
          const compressedFile = await compressImageToThumbnail(item.file);
          imageUrl = await uploadJastipImage(compressedFile);
        }
        
        itemsToCheckout.push({
          cart_item_id: `custom_${Date.now()}_${Math.random()}`,
          id: `custom_${Date.now()}_${Math.random()}`,
          name: item.name,
          price: 0,
          is_custom: true,
          qty: 1,
          merchant_id: merchant.id,
          merchant_name: merchant.name,
          image_url: imageUrl
        });
      }

      toast.dismiss(loadingToast);
      navigate('/checkout', {
        state: {
          items: itemsToCheckout,
          merchant: merchant,
          fromCart: false
        }
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengupload gambar. Silakan coba lagi.', { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const getDisplayPrice = (product) => {
    if (product.variants && Array.isArray(product.variants)) {
      const pricedGroup = product.variants.find(g => g.has_price);
      if (pricedGroup && pricedGroup.options && pricedGroup.options.length > 0) {
        const prices = pricedGroup.options.map(opt => parseFloat(opt.price) || 0);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (minPrice === maxPrice) {
          return `Rp ${minPrice.toLocaleString('id-ID')}`;
        } else {
          return `Rp ${minPrice.toLocaleString('id-ID')} - Rp ${maxPrice.toLocaleString('id-ID')}`;
        }
      }
    }
    return `Rp ${product.price.toLocaleString('id-ID')}`;
  };

  const getTodayHoursDisplay = () => {
    if (!merchant || !merchant.operating_hours || !Array.isArray(merchant.operating_hours)) {
      return "08:00 - 20:00 WIB"; // Fallback
    }
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const today = days[currentTime.getDay()];
    const todayHours = merchant.operating_hours.find(h => h.day === today);
    // Parse is_open whether it's boolean or string "true"/"on"
    const isOpen = todayHours && (todayHours.is_open === true || todayHours.is_open === 'true' || todayHours.is_open === 'on');
    if (!isOpen) return "Tutup";
    
    const openTime = todayHours.open || '08:00';
    const closeTime = todayHours.close || '20:00';
    return `${openTime} - ${closeTime} WIB`;
  };

  const getStoreStatus = () => {
    if (!merchant) return { isOpen: false, closingSoon: false, text: 'Toko Tutup', colorClass: 'text-red-600 bg-red-50' };
    
    if (!merchant.operating_hours || !Array.isArray(merchant.operating_hours)) {
      return { isOpen: true, closingSoon: false, text: 'Buka', colorClass: 'text-primary bg-blue-50' };
    }

    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const today = days[currentTime.getDay()];

    const todayHours = merchant.operating_hours.find(h => h.day === today);
    const isOpenStr = todayHours && (todayHours.is_open === true || todayHours.is_open === 'true' || todayHours.is_open === 'on');
    
    if (!isOpenStr) {
      return { isOpen: false, closingSoon: false, text: "Toko Tutup", colorClass: "text-red-600 bg-red-50" };
    }

    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    const openTimeStr = todayHours.open || '08:00';
    const closeTimeStr = todayHours.close || '20:00';

    const [openH, openM] = openTimeStr.split(':').map(Number);
    const openMins = (openH || 0) * 60 + (openM || 0);

    const [closeH, closeM] = closeTimeStr.split(':').map(Number);
    const closeMins = (closeH || 0) * 60 + (closeM || 0);

    if (currentMins >= openMins && currentMins <= closeMins) {
      const minutesUntilClose = closeMins - currentMins;
      const closingSoon = minutesUntilClose > 0 && minutesUntilClose <= 60;
      return { isOpen: true, closingSoon, text: "Buka", colorClass: "text-primary bg-blue-50" };
    } else {
      return { isOpen: false, closingSoon: false, text: "Toko Tutup", colorClass: "text-red-600 bg-red-50" };
    }
  };



  const fetchMerchantData = async (merchantId) => {
    // Fetch Merchant
    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchantData) return null;

    // Fetch Products
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId);

    // Fetch Favorites and Follows
    const { data: { session } } = await supabase.auth.getSession();
    let favoriteIds = new Set();
    let following = false;
    if (session?.user) {
      setCurrentUserId(session.user.id);
      const { data: favs } = await supabase
        .from('favorite_products')
        .select('product_id')
        .eq('auth_id', session.user.id);
      if (favs) favoriteIds = new Set(favs.map(f => f.product_id));

      const { data: followData } = await supabase
        .from('merchant_followers')
        .select('id')
        .eq('customer_id', session.user.id)
        .eq('merchant_id', merchantId)
        .maybeSingle();
      if (followData) following = true;
    }

    const { count: followersCountData } = await supabase
      .from('merchant_followers')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchantId);

    const { data: ratingsData } = await supabase
      .from('ratings')
      .select('rating')
      .eq('target_id', merchantId)
      .eq('target_type', 'merchant');
      
    let ratingStatsObj = { average: 0, count: 0 };
    if (ratingsData && ratingsData.length > 0) {
      const sum = ratingsData.reduce((acc, curr) => acc + curr.rating, 0);
      ratingStatsObj = {
        average: (sum / ratingsData.length).toFixed(1),
        count: ratingsData.length
      };
    }

    return {
      merchant: merchantData,
      products: productsData || [],
      favoriteIds,
      following,
      followerCount: followersCountData || 0,
      ratingStats: ratingStatsObj
    };
  };

  const { data: swrData, isLoading: loading, mutate } = useSWR(id ? `merchant_detail_${id}` : null, () => fetchMerchantData(id), {
    refetchOnWindowFocus: true,
    refetchInterval: 60000
  });

  const merchant = swrData?.merchant || null;
  const products = swrData?.products || [];
  const favoriteProductIds = swrData?.favoriteIds || new Set();
  const isFollowing = swrData?.following || false;
  const followerCount = swrData?.followerCount || 0;
  const ratingStats = swrData?.ratingStats || { average: 0, count: 0 };

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);
    }
    fetchSession();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">Loading...</div>;
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <p className="text-gray-500 font-medium">Toko tidak ditemukan</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">Kembali</button>
      </div>
    );
  }

  // Dynamic Categories from Products
  const uniqueCategories = ['Semua', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === 'Semua' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleFollowMerchant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Silakan login dulu');
      return;
    }
    
    if (isFollowing) {
      const { error } = await supabase
        .from('merchant_followers')
        .delete()
        .eq('customer_id', user.id)
        .eq('merchant_id', id);
        
      if (!error) {
        mutate(data => ({ ...data, following: false, followerCount: data.followerCount - 1 }), false);
        toast.success('Batal mengikuti toko');
      }
    } else {
      const { error } = await supabase
        .from('merchant_followers')
        .insert({
          customer_id: user.id,
          merchant_id: id
        });
        
      if (!error) {
        mutate(data => ({ ...data, following: true, followerCount: data.followerCount + 1 }), false);
        toast.success('Berhasil mengikuti toko!');
      }
    }
  };

  const handleChatToko = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Silakan login dulu untuk chat");
      return;
    }
    
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('customer_id', user.id)
      .eq('participant_id', merchant.id)
      .eq('chat_type', 'merchant')
      .limit(1)
      .maybeSingle();
      
    if (existingChat) {
      navigate(`/chat/${existingChat.id}`);
    } else {
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          chat_type: 'merchant',
          customer_id: user.id,
          participant_id: merchant.id
        })
        .select()
        .single();
        
      if (newChat && !error) {
        navigate(`/chat/${newChat.id}`);
      } else {
        toast.error("Gagal membuat obrolan");
      }
    }
  };

  const handleToggleFavorite = async (e, productId) => {
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("Silakan login dulu untuk menambahkan ke favorit");
      return;
    }

    if (isTogglingFavorite) return;
    setIsTogglingFavorite(true);

    const isFavorite = favoriteProductIds.has(productId);

    try {
      if (isFavorite) {
        await supabase
          .from('favorite_products')
          .delete()
          .eq('product_id', productId)
          .eq('auth_id', session.user.id);
        
        mutate(data => {
          const newSet = new Set(data.favoriteIds);
          newSet.delete(productId);
          const newProducts = data.products.map(p => p.id === productId ? { ...p, favorite_count: Math.max(0, (p.favorite_count || 0) - 1) } : p);
          return { ...data, favoriteIds: newSet, products: newProducts };
        }, false);
        toast.success("Dihapus dari favorit");
      } else {
        await supabase
          .from('favorite_products')
          .insert({
            product_id: productId,
            auth_id: session.user.id
          });
        
        mutate(data => {
          const newSet = new Set(data.favoriteIds);
          newSet.add(productId);
          const newProducts = data.products.map(p => p.id === productId ? { ...p, favorite_count: (p.favorite_count || 0) + 1 } : p);
          return { ...data, favoriteIds: newSet, products: newProducts };
        }, false);
        toast.success("Ditambahkan ke favorit! ❤️");
      }
    } catch (error) {
      toast.error("Gagal mengubah favorit");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Extract merchant categories for badges
  const storeStatus = getStoreStatus();
  const merchantCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-28 relative">
      {/* Back Button */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="w-8 h-8 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 hover:bg-white/70 active:scale-95 transition-all shadow-sm">
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleFollowMerchant}
            className={`flex items-center justify-center gap-1 px-3 h-8 rounded-full font-bold text-[11px] transition-all shadow-sm active:scale-95 border ${
              isFollowing 
              ? 'bg-white/80 backdrop-blur-md text-gray-700 border-gray-200' 
              : 'bg-red-500 text-white border-red-500'
            }`}
          >
            <Heart size={13} className={isFollowing ? 'fill-gray-400 text-gray-400' : 'fill-white text-white'} />
            {isFollowing ? 'Mengikuti' : 'Follow'}
          </button>
          
          <button 
            onClick={handleChatToko}
            className="flex items-center justify-center gap-1 px-3 h-8 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full font-bold text-[11px] text-primary transition-all shadow-sm active:scale-95"
          >
            <MessageSquare size={13} />
            Chat
          </button>

          <button 
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                toast.error("Silakan login dulu untuk melaporkan toko");
                return;
              }
              setCurrentUserId(user.id);
              setShowReportModal(true);
            }}
            className="w-8 h-8 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 active:scale-95 transition-all shadow-sm"
            title="Laporkan Toko"
          >
            <Flag size={14} />
          </button>
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative h-40 sm:h-48 w-full overflow-hidden">
        <img
          src={merchant.logo_url || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
          alt={merchant.name}
          className="w-full h-full object-cover blur-[2px] brightness-75 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
      </div>

      <div className="px-3 sm:px-4 -mt-16 relative z-10">
        {!storeStatus.isOpen ? (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3 flex items-center justify-center gap-2 shadow-sm animate-pulse">
            <Clock size={16} className="text-red-600" />
            <span className="text-red-600 font-bold text-sm">Mohon Maaf, Toko Sedang Tutup</span>
          </div>
        ) : storeStatus.closingSoon ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-center justify-center gap-2 shadow-sm animate-pulse">
            <Clock size={16} className="text-amber-600" />
            <span className="text-amber-700 font-bold text-sm">Buruan! Toko Sebentar Lagi Tutup</span>
          </div>
        ) : null}

        {/* Merchant Info Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-4">
          <div className="flex gap-3 sm:gap-4 items-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-50 flex items-center justify-center">
              <img 
                src={merchant.logo_url || "https://res.cloudinary.com/bvxkjuf5/image/upload/v1786601326/tutahtitah_courier_customer_illustration_1786601249778_o2jls3.jpg"} 
                alt={merchant.name} 
                className="w-full h-full object-cover" 
              />
            </div>

            <div className="flex-1 pt-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight mb-1">{merchant.name}</h1>

              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-[11px] font-bold text-gray-800">{ratingStats.average || '-'}</span>
                  <span className="text-[10px] text-gray-500">({ratingStats.count})</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                <div className="flex items-center gap-1 text-[11px]">
                  <Users size={12} className="text-gray-400" />
                  <span className="font-semibold text-gray-700">{followerCount}</span>
                  <span className="text-gray-500">Pengikut</span>
                </div>
              </div>

              {/* Category Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {merchantCategories.slice(0, 3).map((cat, idx) => (
                  <span key={idx} className="bg-blue-50 text-primary text-[9px] font-bold px-2 py-0.5 rounded border border-blue-100 uppercase">
                    {cat}
                  </span>
                ))}
                {merchantCategories.length === 0 && (
                  <span className="bg-blue-50 text-primary text-[9px] font-bold px-2 py-0.5 rounded border border-blue-100 uppercase">
                    UMKM
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Operating Hours and Address */}
          <div className="mt-3 flex flex-col gap-1.5 text-[10px] sm:text-xs text-gray-500 font-medium pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-gray-400 shrink-0" />
              <span>{getTodayHoursDisplay()}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin size={12} className="text-primary shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed">{merchant.address || 'Cikalong Wetan'}</span>
            </div>
          </div>



          {/* Description */}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs sm:text-sm text-gray-600">
              {merchant.description}
            </p>
          </div>
        </div>

        {/* Dynamic Content Based on merchant.is_custom_order */}
        {merchant.is_custom_order && (
          <>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm mb-4">
              <h4 className="text-xs font-bold text-primary uppercase mb-1">💡 Jastip Fleksibel</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">Titip belanjaan apapun di warung terdekat atau minimarket. Tulis nama barang dan tentukan jumlahnya di bawah ini!</p>
            </div>

            <div className="bg-white sm:rounded-2xl shadow-sm border-y sm:border border-gray-100 py-5 px-4 mb-6 -mx-3 sm:mx-0">
              <h4 className="font-bold text-gray-800 mb-4 text-sm">Daftar Belanjaan Anda</h4>

            <div className="space-y-3 mb-5">
              {jastipItems.map((item, index) => (
                <div key={item.id} className="flex gap-2.5 items-start group">
                  {/* Number Badge */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 mt-1.5 shrink-0 flex items-center justify-center bg-blue-100 text-primary font-bold text-xs sm:text-sm rounded-full shadow-sm border border-blue-200">
                    {index + 1}
                  </div>
                  
                  {/* Input Fields */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Cth: Bawang merah 1/4 Kg"
                        value={item.name}
                        onChange={(e) => handleUpdateJastipRow(item.id, 'name', e.target.value)}
                        className="w-full pl-4 pr-10 py-3 sm:py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 shadow-sm transition-all placeholder:font-medium placeholder:text-gray-400"
                      />
                      {item.name && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                      )}
                    </div>
                      
                    {/* Image Upload Button */}
                    <button
                      onClick={() => fileInputRefs.current[item.id]?.click()}
                      className="self-start flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-blue-700 transition-colors bg-blue-50/50 hover:bg-blue-100/50 px-3 py-1.5 rounded-lg border border-blue-100/50"
                    >
                      <Camera size={14} />
                      {item.file ? 'Ganti Foto' : 'Lampirkan Foto (Opsional)'}
                    </button>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      ref={el => fileInputRefs.current[item.id] = el}
                      onChange={(e) => handleImageSelect(item.id, e.target.files[0])}
                    />

                    {/* Image Preview */}
                    {item.previewUrl && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-blue-100 shadow-sm mt-1">
                        <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => handleRemoveImage(item.id)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full scale-75 hover:bg-red-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Trash Button */}
                  <button
                    onClick={() => handleRemoveJastipRow(item.id)}
                    className="w-11 h-11 mt-1 shrink-0 flex items-center justify-center text-red-500 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl shadow-sm transition-all active:scale-95"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddJastipRow}
              className="w-full py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-primary font-bold text-sm rounded-xl border border-blue-200 shadow-sm transition-all flex items-center justify-center gap-2 mb-6 active:scale-[0.98]"
            >
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                <span className="text-sm leading-none font-bold">+</span>
              </div>
              Tambah Barang Lain
            </button>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleJastipAddToCart}
                disabled={isUploading || !storeStatus.isOpen}
                className={`flex-1 py-3 px-4 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform border ${(!isUploading && storeStatus.isOpen) ? 'bg-white text-primary border-primary hover:bg-blue-50' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
              >
                <span className="text-sm">Keranjang</span>
              </button>
              <button
                onClick={handleJastipCheckoutDirect}
                disabled={isUploading || !storeStatus.isOpen}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-white flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform shadow-md ${(!isUploading && storeStatus.isOpen) ? 'bg-primary hover:bg-blue-600 shadow-blue-500/30' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                <span className="text-sm">Pesan Langsung</span>
              </button>
            </div>
            {!storeStatus.isOpen && (
              <p className="text-center text-red-500 text-[10px] mt-2 font-medium">Layanan jastip dinonaktifkan saat toko tutup</p>
            )}
            </div>
          </>
        )}

        {!merchant.is_custom_order && (
          <>
            {/* Search Bar */}
          <div className="bg-white rounded-xl flex items-center px-3.5 py-3 shadow-sm border border-gray-100 mb-6">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Cari menu di toko ini..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm font-semibold text-gray-800 placeholder-gray-400"
            />
          </div>

          {/* Menu Section */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Daftar Menu</h2>

            {/* Category Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-4 pb-1">
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl font-semibold text-xs transition-all ${activeCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product List */}
            <div className="space-y-3">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                        if (!product.is_available) {
                          toast.error("Produk sedang habis.");
                          return;
                        }
                        if (storeStatus.isOpen) {
                          navigate(`/product/${product.id}`, { state: { merchant } })
                        } else {
                          toast.error("Toko sedang tutup, tidak dapat memesan.");
                        }
                    }}
                    className={`bg-white rounded-2xl shadow-sm border border-gray-100 flex active:scale-[0.98] transition-transform relative overflow-hidden ${(!storeStatus.isOpen || !product.is_available) ? 'opacity-60 grayscale-[30%] cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="w-28 h-auto sm:w-32 bg-gray-100 shrink-0 border-r border-gray-50 flex relative">
                        {!storeStatus.isOpen && (
                          <div className="absolute inset-0 bg-black/20 z-10 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded">TUTUP</span>
                          </div>
                        )}
                        {storeStatus.isOpen && !product.is_available && (
                          <div className="absolute inset-0 bg-black/20 z-10 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded">HABIS</span>
                          </div>
                        )}
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 min-h-[112px]">
                          <Package size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between p-3 sm:p-4">
                      <div>
                        {/* Badge Top */}
                        <div className="flex justify-between items-start mb-1">
                          <span className="bg-blue-50 text-primary text-[8px] font-semibold px-1.5 py-0.5 rounded uppercase border border-blue-100">
                            {product.category || 'PRODUK'}
                          </span>
                          {product.badge && product.badge !== 'None' && (
                            <span className="bg-orange-500 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              {product.badge.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 leading-tight text-sm sm:text-base line-clamp-2 mb-1">{product.name}</h3>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="flex items-center gap-0.5 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1 py-0.5 rounded">
                            <Star size={10} className="fill-yellow-500" />
                            <span>{product.rating_score ? Number(product.rating_score).toFixed(1) : '0.0'}</span>
                            <span className="font-medium text-yellow-600/80">({product.total_ratings || 0})</span>
                          </div>
                          <div className="flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-50 px-1 py-0.5 rounded">
                            <Heart size={10} className="text-gray-400" />
                            {product.favorite_count || 0} suka
                          </div>
                        </div>
                        {product.description && (
                          <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <span className="font-medium text-primary text-sm sm:text-base">{getDisplayPrice(product)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleToggleFavorite(e, product.id)}
                            className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm border border-gray-100 active:scale-90"
                          >
                            <Heart 
                              size={16} 
                              className={`transition-colors ${favoriteProductIds.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product, merchant);
                            }}
                            className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 text-primary rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors shadow-sm border border-blue-100 active:scale-90"
                          >
                            <ShoppingCart size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 border-dashed">
                  <Package size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-xs font-medium">
                    {products.length === 0 ? 'Belum ada produk tersedia.' : 'Produk tidak ditemukan.'}
                  </p>
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Floating Cart Bar (Slide In) */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-50 animate-slideUp">
          <div
            onClick={() => navigate('/cart')}
            className="bg-primary rounded-2xl shadow-[0_4px_20px_rgba(30,58,138,0.3)] text-white px-5 py-3.5 flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-white uppercase tracking-wider mb-0.5">Total Pesanan</span>
              <span className="font-medium text-sm sm:text-base">{cartCount} Item | Rp {cartTotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex items-center gap-2 bg-accent text-primary px-4 py-2.5 rounded-xl shadow-sm shadow-yellow-500/20">
              <ShoppingCart size={18} strokeWidth={2.5} />
              <span className="text-sm font-medium tracking-tight">Cek Keranjang</span>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)}
        targetId={merchant?.id}
        targetType="merchant"
        customerId={currentUserId}
        targetName={merchant?.name}
      />
    </div>
  );
}

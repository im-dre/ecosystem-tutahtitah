import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Bell, Store, MapPin, Clock, ShoppingCart, User, Star, Heart, FileEdit, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import useSWR from 'swr';
import toast from 'react-hot-toast';

const getMerchantStatus = (merchant, currentTime) => {
  if (!merchant || !merchant.operating_hours || !Array.isArray(merchant.operating_hours)) {
    return { isOpen: true, hoursText: '08:00 - 20:00 WIB' };
  }
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const today = days[currentTime.getDay()];
  const todayHours = merchant.operating_hours.find(h => h.day === today);
  
  const isOpenStr = todayHours && (todayHours.is_open === true || todayHours.is_open === 'true' || todayHours.is_open === 'on');
  if (!isOpenStr) return { isOpen: false, hoursText: 'Tutup' };

  const openTimeStr = todayHours.open || '08:00';
  const closeTimeStr = todayHours.close || '20:00';
  const [openH, openM] = openTimeStr.split(':').map(Number);
  const openMins = (openH || 0) * 60 + (openM || 0);
  const [closeH, closeM] = closeTimeStr.split(':').map(Number);
  const closeMins = (closeH || 0) * 60 + (closeM || 0);
  
  const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isOpen = currentMins >= openMins && currentMins <= closeMins;
  
  return { isOpen, hoursText: `${openTimeStr} - ${closeTimeStr} WIB` };
};

export default function Home() {
  const [userName, setUserName] = useState('Pelanggan');
  const [merchants, setMerchants] = useState([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState(['Semua Toko']);
  const [allProducts, setAllProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [currentAddress, setCurrentAddress] = useState("Pilih Lokasi Pengantaran");
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const searchInputRef = useRef(null);

  const cartCount = cartItems.reduce((total, item) => total + item.qty, 0);
  const cartTotal = cartItems.reduce((total, item) => {
    let price = item.price || 0;
    if (item.selectedVariants) {
      Object.entries(item.selectedVariants).forEach(([groupName, variantName]) => {
        const group = item.product_variants?.find(g => g.group_name === groupName);
        const variant = group?.variants?.find(v => v.name === variantName);
        if (variant && variant.price_adjustment) {
          price += variant.price_adjustment;
        }
      });
    }
    return total + (price * item.qty);
  }, 0);

  const promos = banners.filter(b => b.placement === 'promo_slider');
  const headerBanner = banners.find(b => b.placement === 'home_header');

  useEffect(() => {
    if (promos.length === 0) return;
    const promoInterval = setInterval(() => {
      setCurrentPromoIndex(prev => (prev + 1) % promos.length);
    }, 4000);
    return () => clearInterval(promoInterval);
  }, [promos.length]);

  const fetchUser = async () => {
    try {
      const cachedProfile = localStorage.getItem('tutah_customer_profile');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        if (parsed.name) setUserName(parsed.name);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: custData } = await supabase.from('customers').select('name').eq('auth_id', user.id).maybeSingle();
      if (custData && custData.name) setUserName(custData.name);

      const { data: addressData } = await supabase.from('customer_addresses')
        .select('full_address')
        .eq('auth_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (addressData && addressData.full_address) setCurrentAddress(addressData.full_address);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const fetcher = async (key) => {
    if (key === 'home_data') {
      const [merchantsRes, productsRes, bannersRes, ratingsRes, followersRes] = await Promise.all([
        supabase.from('merchants').select('*').in('status', ['verified', 'published', 'VERIFIED', 'PUBLISHED', 'ACTIVE', 'active']),
        supabase.from('products').select('*').eq('is_available', true),
        supabase.from('banners').select('*').eq('is_active', true),
        supabase.from('ratings').select('target_id, rating').eq('target_type', 'merchant'),
        supabase.from('merchant_followers').select('merchant_id')
      ]);
      if (merchantsRes.error) throw merchantsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (bannersRes.error) throw bannersRes.error;
      
      const merchantsData = merchantsRes.data || [];
      const ratingsData = ratingsRes.data || [];
      const followersData = followersRes.data || [];

      // Process merchants with ratings and followers
      const processedMerchants = merchantsData.map(m => {
        const mRatings = ratingsData.filter(r => r.target_id === m.id);
        const avg = mRatings.length > 0 ? (mRatings.reduce((sum, r) => sum + r.rating, 0) / mRatings.length).toFixed(1) : 0;
        const followers = followersData.filter(f => f.merchant_id === m.id).length;
        return {
          ...m,
          ratingStats: { average: avg, total: mRatings.length },
          followerCount: followers
        };
      });

      return {
        merchants: processedMerchants,
        products: productsRes.data || [],
        banners: bannersRes.data || []
      };
    }
  };

  const { data: homeData, error: homeError } = useSWR('home_data', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000
  });

  useEffect(() => {
    if (homeData) {
      // Map categories based on products
      const merchantsWithCategories = homeData.merchants.map(merchant => {
        const mProducts = homeData.products.filter(p => p.merchant_id === merchant.id);
        const mCategories = [...new Set(mProducts.map(p => p.category).filter(Boolean))];
        return {
          ...merchant,
          productCategories: mCategories
        };
      });

      setMerchants(merchantsWithCategories);
      setAllProducts(homeData.products);
      setBanners(homeData.banners);
      setLoadingMerchants(false);
      setBannersLoading(false);
      
      const cats = new Set();
      merchantsWithCategories.forEach(m => {
        if (m.productCategories) {
          m.productCategories.forEach(c => cats.add(c));
        } else if (m.category) {
          cats.add(m.category);
        }
      });
      setDynamicCategories(['Semua Toko', ...Array.from(cats)]);
    }
  }, [homeData]);

  // Update current time every minute to refresh open/close status
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const services = [
    { name: 'Jastip', image: '/icon-jastip.webp' },
    { name: 'Antar Jemput', image: '/icon-ojek.webp' },
    { name: 'Kirim/Antar Barang', image: '/icon-kirim-barang.webp' },
    { name: 'Belanja Pasar/Warung', image: '/icon-belanja.webp' },
  ];

  const [activeCategory, setActiveCategory] = useState('Semua Toko');

  const handleServiceClick = (serviceName) => {
    if (serviceName === 'Jastip') {
      navigate('/jastip-catalog');
    } else if (serviceName === 'Antar Jemput') {
      navigate('/antar-jemput');
    } else if (serviceName === 'Kirim/Antar Barang') {
      navigate('/kirim-barang');
    } else if (serviceName === 'Belanja Pasar/Warung') {
      const customMerchant = merchants.find(m => m.is_custom_order);
      if (customMerchant) {
        navigate(`/merchant/${customMerchant.id}`);
      } else {
        toast.error('Layanan ini sedang tidak tersedia.');
      }
    }
  };

  const filteredMerchants = merchants.filter(m => {
    if (m.is_custom_order) return false;
    let matchesCategory = true;
    if (activeCategory !== 'Semua Toko') {
      const cat = (m.productCategories && Array.isArray(m.productCategories)) ? m.productCategories : [m.category || ''];
      matchesCategory = cat.some(c => c && c.toLowerCase().includes(activeCategory.toLowerCase()));
    }

    let matchesSearch = true;
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(query);
      const matchDesc = m.description?.toLowerCase().includes(query);
      const matchAddress = m.address?.toLowerCase().includes(query);

      const mProducts = allProducts.filter(p => p.merchant_id === m.id);
      const matchProduct = mProducts.some(p => p.name?.toLowerCase().includes(query));

      matchesSearch = matchName || matchDesc || matchAddress || matchProduct;
    }

    return matchesCategory && matchesSearch;
  });

  const handleSearchClick = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNotificationClick = () => {
    toast('Belum ada notifikasi baru', { icon: '🔔' });
  };

  return (
    <div className="flex flex-col">
      <div className="relative px-4 pt-6 pb-20 rounded-b-[24px] shadow-md z-0 overflow-hidden">
        <div
          className={`absolute inset-0 z-0 ${bannersLoading ? 'animate-pulse' : ''}`}
          style={{
            backgroundImage: headerBanner && !bannersLoading ? `url(${headerBanner.image_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#1e3a8a'
          }}
        >
          {!bannersLoading && <div className="absolute inset-0 bg-black/20"></div>}
        </div>

        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Halo, {userName}
            </h1>
            <p className="text-white text-xs font-medium mt-1 opacity-100">Mau dibantu apa nih hari ini?</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearchClick}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white relative active:scale-95 transition-transform"
            >
              <Search size={18} />
            </button>
            <button
              onClick={handleNotificationClick}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white relative active:scale-95 transition-transform"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-primary"></span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white relative active:scale-95 transition-transform"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-2.5 -mt-12 pb-24 relative z-10">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-4 mx-0">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {services.map((svc) => (
              <div
                key={svc.name}
                onClick={() => handleServiceClick(svc.name)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group active:scale-95 transition-transform"
              >
                <img src={svc.image} alt={svc.name} className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                <span className="text-[10px] sm:text-xs font-bold text-gray-700 text-center leading-tight max-w-[65px] group-hover:text-primary transition-colors mt-0.5">{svc.name}</span>
              </div>
            ))}
          </div>
        </div>

        {promos.length > 0 && (
          <div className="mb-5 px-1 relative rounded-2xl overflow-hidden shadow-sm h-32 sm:h-40 group cursor-pointer">
            {promos.map((promo, idx) => (
              <div
                key={promo.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentPromoIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
                {promo.title && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <h3 className="text-white font-bold text-sm sm:text-base">{promo.title}</h3>
                  </div>
                )}
              </div>
            ))}
            <div className="absolute bottom-2.5 left-0 right-0 z-20 flex justify-center gap-1.5">
              {promos.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentPromoIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
                />
              ))}
            </div>
          </div>
        )}

        {(() => {
          const customMerchant = merchants.find(m => m.is_custom_order);
          if (!customMerchant) return null;
          return (
            <div className="mb-5 px-1">
              <div 
                onClick={() => navigate(`/merchant/${customMerchant.id}`)}
                className="relative overflow-hidden rounded-2xl cursor-pointer shadow-sm border border-blue-100 group active:scale-95 transition-all bg-gradient-to-br from-blue-50 to-indigo-50"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
                <div className="p-4 flex items-center justify-between relative z-10">
                  <div className="flex-1 pr-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold text-[9px] mb-2 shadow-sm animate-pulse">
                      <Star size={10} className="fill-current text-yellow-300" /> Paling Sering Dipesan
                    </div>
                    <h3 className="text-[15px] font-extrabold text-gray-900 leading-tight mb-1.5 drop-shadow-sm">
                      Bebas Pesan Apa Aja!
                    </h3>
                    <p className="text-[11px] font-semibold text-gray-600 leading-snug mb-3">
                      Ga nemu barangnya? Ketik atau lampirin foto aja, kurir siap beliin.
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[10px] shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                      Pesan Sekarang
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                  </div>
                  <div className="w-20 h-20 shrink-0 relative mt-2">
                    <div className="absolute inset-0 bg-white/60 rounded-2xl shadow-sm rotate-6 group-hover:rotate-12 transition-transform duration-300"></div>
                    <img 
                      src="/banner-custom-order.webp" 
                      className="w-full h-full object-cover rounded-2xl absolute inset-0 -rotate-3 group-hover:rotate-0 transition-transform duration-300 shadow-sm border border-white/50"
                      alt="Custom Order"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mb-6 px-1">
          <div className="bg-white rounded-xl flex items-center px-3.5 py-3 shadow-sm border border-gray-100">
            <Search size={18} className="text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Mau jajan apa hari ini?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm font-medium text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>

        <div>
          <div className="mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 font-semibold text-[10px] mb-2.5">
              <Store size={12} /> Katalog UMKM Cikalong Wetan
            </div>

            <div className="flex overflow-x-auto hide-scrollbar gap-1.5 pb-2 -mx-3 px-3">
              {dynamicCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${activeCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 -mx-1">
            {loadingMerchants ? (
              [1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col animate-pulse h-40">
                  <div className="flex gap-3 p-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded-md w-3/4 mb-2"></div>
                      <div className="h-2.5 bg-gray-200 rounded-md w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : filteredMerchants.length > 0 ? (
              filteredMerchants.map((merchant) => {
                let merchantCats = [];
                if (merchant.productCategories && Array.isArray(merchant.productCategories)) {
                  merchantCats = merchant.productCategories;
                } else if (merchant.category) {
                  merchantCats = [merchant.category];
                } else {
                  merchantCats = ['UMKM'];
                }

                const merchantProducts = allProducts.filter(p => p.merchant_id === merchant.id);
                const displayProducts = merchantProducts.slice(0, 3);
                const storeStatus = getMerchantStatus(merchant, now);

                return (
                  <div
                    key={merchant.id}
                    className={`bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden flex flex-col font-sans ${!storeStatus.isOpen ? 'opacity-70 grayscale-[20%]' : ''}`}
                  >
                    {/* Header Toko */}
                    <div
                      onClick={() => navigate(`/merchant/${merchant.id}`)}
                      className="p-3 sm:p-4 flex gap-3 sm:gap-4 items-center cursor-pointer active:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      {/* Thumbnail Toko */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-50 flex items-center justify-center text-gray-400">
                        {merchant.logo_url ? (
                          <img
                            src={merchant.logo_url}
                            alt={merchant.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Store size={24} />
                        )}
                      </div>
                      {/* Info Toko */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate mr-2">{merchant.name}</h3>
                          <div className={`${!storeStatus.isOpen ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0`}>
                            <Clock size={8} /> {!storeStatus.isOpen ? 'Tutup' : storeStatus.hoursText}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex gap-1 flex-wrap">
                            {merchantCats.slice(0, 2).map((cat, idx) => (
                              <span key={idx} className="bg-blue-50 text-blue-700 text-[8px] font-medium px-1.5 py-0.5 rounded uppercase border border-blue-100">{cat}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2">
                            <div className="flex items-center gap-0.5 text-[9px] font-bold text-yellow-600">
                              <Star size={10} className="fill-yellow-500" />
                              {merchant.ratingStats?.average || '0.0'}
                            </div>
                            <div className="flex items-center gap-0.5 text-[9px] font-medium text-gray-500">
                              <Heart size={10} className="text-gray-400" />
                              {merchant.followerCount || 0}
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium flex items-center gap-1 truncate">
                          <MapPin size={10} className="shrink-0 text-red-500" />
                          <span className="truncate">{merchant.address || 'Alamat tidak tersedia'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Isi List (Preview Produk Horizontal) */}
                    {displayProducts.length > 0 && (
                      <div className="px-3 pt-3 pb-4 bg-gray-50/50">
                        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-1 snap-x">
                          {displayProducts.map(product => (
                            <div
                              key={product.id}
                              onClick={() => navigate(`/product/${product.id}`, { state: { merchant } })}
                              className="w-28 sm:w-32 shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex flex-col snap-start cursor-pointer active:scale-95 transition-transform"
                            >
                              <div className="h-24 w-full bg-gray-100 relative">
                                {product.image_url ? (
                                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Store size={20} />
                                  </div>
                                )}
                              </div>
                              <div className="p-2 flex-1 flex flex-col justify-between">
                                <h4 className="text-[10px] sm:text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-1">{product.name}</h4>
                                <div className="flex items-center gap-1.5 mb-1 mt-auto">
                                  <div className="flex items-center gap-0.5 text-[9px] font-bold text-yellow-600">
                                    <Star size={9} className="fill-yellow-500" />
                                    {product.rating_score ? Number(product.rating_score).toFixed(1) : '0.0'}
                                  </div>
                                  <div className="flex items-center gap-0.5 text-[9px] font-medium text-gray-500">
                                    <Heart size={9} className="text-gray-400" />
                                    {product.favorite_count || 0}
                                  </div>
                                </div>
                                <p className="text-[10px] sm:text-xs font-semibold text-primary">
                                  {product.price > 0 ? `Rp ${product.price.toLocaleString('id-ID')}` : 'Harga Menyesuaikan'}
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* Card Lihat Semua Produk */}
                          <div
                            onClick={() => navigate(`/merchant/${merchant.id}`)}
                            className="w-24 sm:w-28 shrink-0 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl shadow-sm flex flex-col items-center justify-center snap-start cursor-pointer active:scale-95 transition-transform p-3 text-center"
                          >
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm mb-2">
                              <ArrowRight size={16} />
                            </div>
                            <span className="text-[10px] font-semibold text-primary leading-tight">Lihat semua<br />Produk</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500">Belum ada toko yang cocok.</p>
              </div>
            )}
          </div>
        </div>
      </div>



      {cartCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto p-4 z-40 animate-slideUp">
          <div
            onClick={() => navigate('/cart')}
            className="bg-primary rounded-2xl shadow-[0_4px_20px_rgba(30,58,138,0.3)] text-white px-5 py-3.5 flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-white/80 uppercase tracking-wider mb-0.5">Total Pesanan</span>
              <span className="font-bold text-sm sm:text-base">{cartCount} Item | Rp {cartTotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex items-center gap-2 bg-accent text-primary px-4 py-2.5 rounded-xl shadow-sm shadow-yellow-500/20 hover:bg-yellow-400 transition-colors">
              <ShoppingCart size={18} strokeWidth={2.5} />
              <span className="text-sm font-bold tracking-tight">Cek Keranjang</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

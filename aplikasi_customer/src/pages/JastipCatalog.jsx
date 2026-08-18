import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Store, MapPin, Clock, ArrowLeft, ShoppingCart, Star, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

export default function JastipCatalog() {
  const [merchants, setMerchants] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState(['Semua Toko']);
  const [activeCategory, setActiveCategory] = useState('Semua Toko');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

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

  const getStoreStatus = (operatingHours) => {
    if (!operatingHours || !Array.isArray(operatingHours)) {
      return { text: "Buka", colorClass: "text-green-600 bg-green-50", isOpen: true };
    }
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const now = new Date();
    const today = days[now.getDay()];

    const todayHours = operatingHours.find(h => h.day === today);
    if (!todayHours || !todayHours.is_open) {
      return { text: "Toko Tutup", colorClass: "text-red-600 bg-red-50", isOpen: false };
    }

    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [openH, openM] = todayHours.open.split(':').map(Number);
    const openMins = openH * 60 + openM;

    const [closeH, closeM] = todayHours.close.split(':').map(Number);
    const closeMins = closeH * 60 + closeM;

    if (currentMins < openMins || currentMins >= closeMins) {
      return { text: "Toko Tutup", colorClass: "text-red-600 bg-red-50", isOpen: false };
    }

    if (closeMins - currentMins <= 30) {
      return { text: "Sebentar lagi toko tutup", colorClass: "text-orange-600 bg-orange-50", isOpen: true };
    }

    return { text: "Buka", colorClass: "text-green-600 bg-green-50", isOpen: true };
  };

  const handleMerchantClick = (merchant, storeStatus, path, state = {}) => {
    if (!storeStatus.isOpen) {
      toast.error('Untuk saat ini customer tidak bisa memesan di toko ini karena bukan waktu operasional toko.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }
    navigate(path, state);
  };

  const promos = banners.filter(b => b.placement === 'banner_promotion_marchant');
  const headerBanner = banners.find(b => b.placement === 'header_catalog_marchant');

  useEffect(() => {
    if (promos.length === 0) return;
    const promoInterval = setInterval(() => {
      setCurrentPromoIndex(prev => (prev + 1) % promos.length);
    }, 4000);
    return () => clearInterval(promoInterval);
  }, [promos.length]);

  useEffect(() => {
    const fetchCatalogData = async () => {
      setLoading(true);

      // 1. Fetch Merchants
      const { data: merchantsData, error: merchantsError } = await supabase
        .from('merchants')
        .select('*')
        .in('status', ['verified', 'published', 'VERIFIED', 'PUBLISHED', 'ACTIVE', 'active']);

      // 2. Fetch Products
      const merchantIds = merchantsData?.map(m => m.id) || [];
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, merchant_id, price, image_url, variants')
        .in('merchant_id', merchantIds)
        .eq('is_available', true);

      if (!merchantsError && merchantsData) {
        if (!productsError && productsData) {
          setAllProducts(productsData);

          // Extract unique categories across all available products
          const allCategories = [...new Set(productsData.map(p => p.category).filter(Boolean))];
          setDynamicCategories(['Semua Toko', ...allCategories]);

          // Map categories to individual merchants
          const merchantsWithCategories = merchantsData.map(merchant => {
            const mProducts = productsData.filter(p => p.merchant_id === merchant.id);
            const mCategories = [...new Set(mProducts.map(p => p.category).filter(Boolean))];
            return {
              ...merchant,
              productCategories: mCategories
            };
          });

          // Sort alphabetically
          merchantsWithCategories.sort((a, b) => a.name.localeCompare(b.name));
          setMerchants(merchantsWithCategories.filter(m => !m.is_custom_order));
        } else {
          setMerchants(merchantsData.filter(m => !m.is_custom_order));
        }
      }
      setLoading(false);
    };

    const fetchBanners = async () => {
      setBannersLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true);

      if (!error && data) {
        setBanners(data);
      }
      setBannersLoading(false);
    };

    fetchCatalogData();
    fetchBanners();

    // Set up real-time subscription for merchant updates (e.g., operating hours)
    const merchantChannel = supabase
      .channel('public:merchants')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'merchants' },
        (payload) => {
          setMerchants((prevMerchants) =>
            prevMerchants.map((m) =>
              m.id === payload.new.id ? { ...m, ...payload.new } : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(merchantChannel);
    };
  }, []);

  // Filter Logic: Category + Complex Search
  const filteredMerchants = merchants.filter(m => {
    // 1. Category Filter
    let matchesCategory = true;
    if (activeCategory !== 'Semua Toko') {
      const cat = (m.productCategories && Array.isArray(m.productCategories)) ? m.productCategories : [m.category || ''];
      matchesCategory = cat.some(c => c && c.toLowerCase().includes(activeCategory.toLowerCase()));
    }

    // 2. Complex Search Filter (Merchant Name, Address, or Product Name)
    let matchesSearch = true;
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(query);
      const matchAddress = m.address?.toLowerCase().includes(query);

      const mProducts = allProducts.filter(p => p.merchant_id === m.id);
      const matchProduct = mProducts.some(p => p.name?.toLowerCase().includes(query));

      matchesSearch = matchName || matchAddress || matchProduct;
    }

    return matchesCategory && matchesSearch;
  });

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
    return `Rp ${(product.price || 0).toLocaleString('id-ID')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      {/* Header */}
      <div className="relative px-4 pt-6 pb-6 rounded-b-[24px] shadow-md z-0 overflow-hidden">
        {/* Dynamic Background */}
        <div
          className={`absolute inset-0 z-0 ${bannersLoading ? 'animate-pulse' : ''}`}
          style={{
            backgroundImage: headerBanner && !bannersLoading ? `url(${headerBanner.image_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#1e3a8a' // bg-primary fallback
          }}
        >
          {/* Overlay to ensure text readability */}
          {!bannersLoading && <div className="absolute inset-0 bg-black/20"></div>}
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Katalog Toko
            </h1>
            <p className="text-white text-xs font-medium opacity-100">Jelajahi semua toko & produk</p>
          </div>
        </div>

        {/* Complex Search Bar */}
        <div className="mt-5 mb-2 relative z-10">
          <div className="bg-white rounded-xl flex items-center px-3.5 py-3 shadow-sm border border-gray-100">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari nama toko, produk, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm font-medium text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 mt-6">

        {/* Category Filter Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 mb-4 -mx-4 px-4">
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl font-semibold text-xs transition-all ${activeCategory === cat
                  ? 'bg-primary text-white shadow-md shadow-blue-900/20'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Banner Promo Slider */}
        {promos.length > 0 && (
          <div className="mb-5 relative rounded-2xl overflow-hidden shadow-sm h-24 sm:h-32 group cursor-pointer -mx-1">
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

        {/* Merchants List */}
        <div className="flex flex-col gap-4 -mx-4">
          {loading ? (
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
              const storeStatus = getStoreStatus(merchant.operating_hours);

              return (
                <div
                  key={merchant.id}
                  className={`bg-white shadow-sm border-y border-gray-100 overflow-hidden flex flex-col font-sans ${!storeStatus.isOpen ? 'opacity-70 grayscale-[20%]' : ''}`}
                >
                  {/* Header Toko */}
                  <div
                    onClick={() => handleMerchantClick(merchant, storeStatus, `/merchant/${merchant.id}`)}
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
                        <div className={`${storeStatus.colorClass} text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0`}>
                          <Clock size={8} /> {storeStatus.text}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap mb-1.5">
                        {merchantCats.slice(0, 2).map((cat, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 text-[8px] font-medium px-1.5 py-0.5 rounded uppercase border border-blue-100">{cat}</span>
                        ))}
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-500 font-medium flex items-center gap-1 truncate">
                        <MapPin size={10} className="shrink-0 text-red-500" />
                        <span className="truncate">{merchant.address || 'Alamat tidak tersedia'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Isi List (Preview Produk Horizontal) */}
                  {displayProducts.length > 0 && (
                    <div className="px-3 pt-3 pb-4">
                      <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-1 -mx-3 px-3 snap-x">
                        {displayProducts.map(product => (
                          <div
                            key={product.id}
                            onClick={() => handleMerchantClick(merchant, storeStatus, `/product/${product.id}`, { state: { merchant } })}
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
                              <p className="text-[10px] sm:text-xs font-semibold text-primary">{getDisplayPrice(product)}</p>
                            </div>
                          </div>
                        ))}

                        {/* Card Lihat Semua Produk */}
                        <div
                          onClick={() => handleMerchantClick(merchant, storeStatus, `/merchant/${merchant.id}`)}
                          className="w-24 sm:w-28 shrink-0 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl shadow-sm flex flex-col items-center justify-center snap-start cursor-pointer active:scale-95 transition-transform p-3 text-center"
                        >
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm mb-2">
                            <ArrowLeft size={16} className="rotate-180" />
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
            <div className="py-12 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
              <Store size={48} className="text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-700">Toko tidak ditemukan</p>
              <p className="text-xs text-gray-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Bar (Slide In) */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-50 animate-slideUp">
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

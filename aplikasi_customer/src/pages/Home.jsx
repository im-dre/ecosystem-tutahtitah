import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Bell, Store, MapPin, Clock, ShoppingCart, User, Star, Heart } from 'lucide-react';
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
      const [merchantsRes, productsRes, bannersRes] = await Promise.all([
        supabase.from('merchants').select('*'),
        supabase.from('products').select('*'),
        supabase.from('banners').select('*')
      ]);
      if (merchantsRes.error) throw merchantsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (bannersRes.error) throw bannersRes.error;
      
      return {
        merchants: merchantsRes.data || [],
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
      setMerchants(homeData.merchants);
      setAllProducts(homeData.products);
      setBanners(homeData.banners);
      setLoadingMerchants(false);
      setBannersLoading(false);
      
      const cats = new Set();
      homeData.merchants.forEach(m => {
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
      }
    }
  };

  // Filter merchants based on category and search query
  const filteredMerchants = merchants.filter(m => {
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
      // Scroll to input slightly so it's clearly visible
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNotificationClick = () => {
    toast('Belum ada notifikasi baru', { icon: '🔔' });
  };

  return (
    <div className="flex flex-col">
      {/* Header / Hero Section */}
      <div className="relative px-4 pt-6 pb-20 rounded-b-[24px] shadow-md z-0 overflow-hidden">
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
          {/* Overlay to ensure text readability without ruining image quality */}
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

      {/* Main Content */}
      <div className="px-2.5 -mt-12 pb-24 relative z-10">

        {/* Quick Services Grid */}
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

        {/* Banner Promo Slider */}
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

        {/* Search Bar - Moved Below Services */}
        <div className="mb-5 px-1">
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

        {/* Merchants List */}
        <div>
          <div className="mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 font-semibold text-[10px] mb-2.5">
              <Store size={12} /> Katalog UMKM Cikalong Wetan
            </div>

            {/* Category Filter Tabs */}
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

          <div className="grid grid-cols-2 gap-2.5">
            {loadingMerchants ? (
              [1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col animate-pulse h-56">
                  <div className="h-24 w-full bg-gray-200 rounded-t-xl"></div>
                  <div className="p-2.5 flex-1 flex flex-col">
                    <div className="h-3 bg-gray-200 rounded-md w-3/4 mb-1.5"></div>
                    <div className="h-2.5 bg-gray-200 rounded-md w-full mb-1"></div>
                    <div className="h-2.5 bg-gray-200 rounded-md w-1/2"></div>
                  </div>
                </div>
              ))
            ) : filteredMerchants.length > 0 ? (
              filteredMerchants.map((merchant) => {
                // Ensure categories is an array
                let merchantCats = [];
                if (merchant.productCategories && Array.isArray(merchant.productCategories)) {
                  merchantCats = merchant.productCategories;
                } else if (merchant.category) {
                  merchantCats = [merchant.category];
                } else {
                  merchantCats = ['UMKM']; // Fallback
                }

                return (
                  <div
                    key={merchant.id}
                    onClick={() => navigate(`/merchant/${merchant.id}`)}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transition-all active:scale-95 flex flex-col"
                  >
                    <div className="relative h-24 sm:h-28 w-full bg-gray-200">
                      <img
                        src={merchant.logo_url || "https://res.cloudinary.com/bvxkjuf5/image/upload/v1786601326/tutahtitah_courier_customer_illustration_1786601249778_o2jls3.jpg"}
                        alt={merchant.name}
                        className={`w-full h-full object-cover ${!getMerchantStatus(merchant, now).isOpen ? 'grayscale opacity-80' : ''}`}
                      />
                      <div className={`absolute bottom-1.5 left-1.5 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm ${!getMerchantStatus(merchant, now).isOpen ? 'bg-red-50/90 text-red-600 border border-red-100' : 'bg-white text-gray-800 border border-white'}`}>
                        <Clock size={8} className={!getMerchantStatus(merchant, now).isOpen ? 'text-red-500' : 'text-primary'} /> 
                        {!getMerchantStatus(merchant, now).isOpen ? 'TUTUP' : `Buka • ${getMerchantStatus(merchant, now).hoursText}`}
                      </div>
                    </div>
                    <div className="p-2.5 flex-1 flex flex-col">
                      <div className="flex gap-1 flex-wrap mb-1">
                        {merchantCats.slice(0, 2).map((cat, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 text-[7px] font-bold px-1 py-0.5 rounded uppercase border border-blue-100">{cat}</span>
                        ))}
                      </div>
                      <h3 className="text-xs font-bold text-gray-900 leading-tight mb-1 line-clamp-1">{merchant.name}</h3>
                      
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded text-[9px] font-bold text-yellow-700">
                          <Star size={10} className="fill-yellow-500 text-yellow-500" />
                          {merchant.ratingStats?.average || '0.0'}
                        </div>
                        <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded text-[9px] font-medium text-gray-600">
                          <Heart size={10} className="text-gray-400" />
                          {merchant.followerCount || 0}
                        </div>
                      </div>

                      <p className="text-[9px] text-gray-500 line-clamp-2 leading-snug mb-1.5">
                        {merchant.description || 'Belanja kebutuhan sehari-hari? List belanjaannya disini!!'}
                      </p>

                      <div className="mt-auto border-t border-gray-50 pt-1.5">
                        <p className="text-[8px] text-gray-500 font-medium flex items-start gap-1">
                          <MapPin size={9} className="mt-0.5 shrink-0 text-red-500" />
                          <span className="line-clamp-1">{merchant.address || 'Alamat toko belum diatur'}</span>
                        </p>
                      </div>
                    </div>
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

      {/* Floating Cart Bar (Slide In) */}
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

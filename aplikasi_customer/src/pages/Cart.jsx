import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, Receipt, Loader2, ArrowLeft, Store, Package, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal, updateItemVariant, calculateItemPrice, duplicateItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const fetchProductStatus = async () => {
    const productIds = [...new Set(cartItems.filter(i => !i.is_custom && i.id && !i.id.startsWith('custom_')).map(i => i.id))];
    if (productIds.length === 0) return {};
    
    const { data, error } = await supabase.from('products').select('id, is_available').in('id', productIds);
    if (error) {
      console.error("fetchProductStatus error:", error);
      return {};
    }
    const statusMap = {};
    if (data) {
      data.forEach(p => statusMap[p.id] = p.is_available);
    }
    return statusMap;
  };

  const productIdsKey = cartItems.filter(i => !i.is_custom && i.id && !i.id.startsWith('custom_')).map(i => i.id).join(',');
  const { data: productStatusMap } = useSWR(productIdsKey ? `cart_product_status_${productIdsKey}` : null, fetchProductStatus, {
    refetchOnWindowFocus: true,
    refetchInterval: 30000
  });

  // Dynamically manage selected item IDs without wiping out user's explicit selections when cartItems update (e.g. temporary ID swaps)
  useEffect(() => {
    setSelectedItemIds(prev => {
      const currentCartIds = cartItems.map(i => i.cart_item_id);
      const validPrev = prev.filter(id => currentCartIds.includes(id));
      
      const newIds = cartItems.filter(item => {
        if (prev.includes(item.cart_item_id)) return false; // Already processed
        if (item.is_custom) return true;
        if (productStatusMap && productStatusMap[item.id] === false) return false;
        return true; // Default selected
      }).map(item => item.cart_item_id);

      if (newIds.length === 0 && validPrev.length === prev.length) return prev; // no change
      return [...validPrev, ...newIds];
    });
  }, [cartItems, productStatusMap]);

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Anda harus login terlebih dahulu.");
      return;
    }
    const selectedItems = cartItems.filter(item => selectedItemIds.includes(item.cart_item_id));
    if (selectedItems.length === 0) return;

    // Validate variants
    for (const item of selectedItems) {
      if (item.variants && item.variants.length > 0) {
        for (const group of item.variants) {
          if (!item.selectedVariants || !item.selectedVariants[group.name]) {
            toast.error(`Harap pilih ${group.name} untuk ${item.name}`);
            return;
          }
        }
      }
    }

    const toastId = toast.loading("Memvalidasi keranjang...");

    try {
      const merchantId = selectedItems[0].merchant_id;
      const { data: mData } = await supabase.from('merchants').select('operating_hours, is_custom_order').eq('id', merchantId).single();
      
      if (mData && !mData.is_custom_order) {
        const getMerchantStatus = (merchant, currentTime) => {
          if (!merchant || !merchant.operating_hours || !Array.isArray(merchant.operating_hours)) {
            return { isOpen: true };
          }
          const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
          const today = days[currentTime.getDay()];
          const todayHours = merchant.operating_hours.find(h => h.day === today);
          
          const isOpenStr = todayHours && (todayHours.is_open === true || todayHours.is_open === 'true' || todayHours.is_open === 'on');
          if (!isOpenStr) return { isOpen: false };

          const openTimeStr = todayHours.open || '08:00';
          const closeTimeStr = todayHours.close || '20:00';
          const [openH, openM] = openTimeStr.split(':').map(Number);
          const openMins = (openH || 0) * 60 + (openM || 0);
          const [closeH, closeM] = closeTimeStr.split(':').map(Number);
          const closeMins = (closeH || 0) * 60 + (closeM || 0);
          
          const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
          return { isOpen: currentMins >= openMins && currentMins <= closeMins };
        };

        if (!getMerchantStatus(mData, new Date()).isOpen) {
          toast.dismiss(toastId);
          toast.error("Toko sedang tutup. Tidak bisa checkout.");
          return;
        }
      }

      const pIds = [...new Set(selectedItems.filter(i => !i.is_custom && i.id && !i.id.startsWith('custom_')).map(i => i.id))];
      if (pIds.length > 0) {
        const { data: pData } = await supabase.from('products').select('id, name, is_available').in('id', pIds);
        if (pData) {
          for (const item of selectedItems) {
            if (item.is_custom) continue;
            const p = pData.find(x => x.id === item.id);
            if (p && p.is_available === false) {
              toast.dismiss(toastId);
              toast.error(`Produk ${p.name} sudah habis.`);
              return;
            }
          }
        }
      }
      
      toast.dismiss(toastId);
    } catch (e) {
      toast.dismiss(toastId);
      console.error(e);
      toast.error("Terjadi kesalahan sistem saat verifikasi keranjang.");
      return;
    }

    const merchant = selectedItems.length > 0 ? { id: selectedItems[0].merchant_id, name: selectedItems[0].merchant_name } : null;

    navigate('/checkout', {
      state: {
        items: selectedItems,
        merchant: merchant,
        fromCart: true
      }
    });
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col relative">
        {/* Header Sticky */}
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-3 py-3 flex items-center gap-3 shadow-sm border-b border-gray-100">
          <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full active:scale-95 transition-all text-gray-700">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-bold text-gray-900 truncate flex-1">Form Pesanan</h1>
        </div>

        <div className="flex-1 flex flex-col items-center pt-6 px-4 text-center">
          <div className="w-48 h-48 mx-auto mb-6 mt-6 rounded-3xl overflow-hidden shadow-sm">
            <img src="/empty-cart.webp" alt="Keranjang Kosong" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Keranjangmu masih kosong nih</h2>
          <p className="text-semibold text-gray-500 mb-8 px-4 leading-relaxed">Segera list pesananmu, kami akan antar sampai kedepan pintu</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary hover:bg-blue-800 text-white px-6 py-3.5 rounded-2xl font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
          >
            Mulai Belanja
          </button>
        </div>
      </div>
    );
  }

  const groupedCartItems = cartItems.reduce((acc, item) => {
    if (!acc[item.merchant_id]) {
      acc[item.merchant_id] = {
        merchantName: item.merchant_name,
        items: []
      };
    }
    acc[item.merchant_id].items.push(item);
    return acc;
  }, {});

  const handleToggleItem = (cartItemId, isAvailable) => {
    if (!isAvailable) return;
    setSelectedItemIds(prev =>
      prev.includes(cartItemId)
        ? prev.filter(id => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

  const handleToggleMerchant = (items) => {
    const availableItems = items.filter(i => i.is_custom || !productStatusMap || productStatusMap[i.id] !== false);
    const itemIds = availableItems.map(i => i.cart_item_id);
    if (itemIds.length === 0) return;
    
    const allSelected = itemIds.every(id => selectedItemIds.includes(id));

    if (allSelected) {
      setSelectedItemIds(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedItemIds(prev => [...new Set([...prev, ...itemIds])]);
    }
  };

  const selectedCartTotal = cartItems
    .filter(item => selectedItemIds.includes(item.cart_item_id))
    .reduce((total, item) => total + (calculateItemPrice(item) * item.qty), 0);

  const hasMissingVariants = cartItems
    .filter(item => selectedItemIds.includes(item.cart_item_id))
    .some(item => {
      if (item.variants && item.variants.length > 0) {
        return item.variants.some(group => !item.selectedVariants || !item.selectedVariants[group.name] || item.selectedVariants[group.name] === '');
      }
      return false;
    });

  return (
    <div className="min-h-screen bg-gray-50 pb-40 relative">
      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Kosongkan Keranjang?</h3>
            <p className="text-sm text-gray-500 mb-6">Apakah Anda yakin ingin menghapus semua pesanan dari keranjang? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors text-sm active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  clearCart();
                  setShowClearConfirm(false);
                  toast.success('Keranjang berhasil dikosongkan');
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm shadow-md shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Kosongkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Sticky */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-3 py-3 flex items-center gap-3 shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full active:scale-95 transition-all text-gray-700">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-bold text-gray-900 truncate flex-1">Form Pesanan</h1>
      </div>

      <div className="py-2 flex-1 bg-gray-50">
        {Object.entries(groupedCartItems).map(([merchantId, data]) => (
          <div key={merchantId} className="bg-white border-y border-gray-100 p-4 mb-2 shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2.5">
              <button onClick={() => handleToggleMerchant(data.items)} className="text-primary mr-1 active:scale-95 transition-transform">
                {data.items.every(i => selectedItemIds.includes(i.cart_item_id)) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-gray-300" />}
              </button>
              <Store size={16} className="text-primary" />
              <h2 className="font-bold text-gray-800 text-sm">
                Pesanan dari <span className="text-primary">{data.merchantName}</span>
              </h2>
            </div>

            <div className="space-y-4">
              {data.items.map((item, index) => {
                const isCustomItem = item.is_custom || !item.price || item.price === 0;
                const isAvailable = isCustomItem || !productStatusMap || productStatusMap[item.id] !== false;
                
                return (
                  <div key={item.cart_item_id || `${item.id}-${index}`} className={`pb-4 border-b border-gray-100 last:border-0 last:pb-0 transition-opacity duration-200 ${!isAvailable ? 'opacity-40 grayscale' : !selectedItemIds.includes(item.cart_item_id) ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="flex gap-3 mb-3 items-start relative">
                      <button 
                        onClick={() => handleToggleItem(item.cart_item_id, isAvailable)} 
                        disabled={!isAvailable}
                        className={`mt-6 shrink-0 transition-transform ${isAvailable ? 'active:scale-95 text-primary' : 'text-gray-300 cursor-not-allowed'}`}
                      >
                        {selectedItemIds.includes(item.cart_item_id) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-gray-300" />}
                      </button>
                      {/* Left: Product Image */}
                      {(!isCustomItem || item.image_url) && (
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-50 relative">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package size={20} />
                            </div>
                          )}
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Habis
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Right: Info */}
                      <div className="flex-1">
                        {isCustomItem ? (
                          // Custom Item Layout
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <h3 className="font-bold text-gray-900 leading-tight text-sm line-clamp-2 pr-2">
                                {item.name}
                              </h3>
                              <p className="text-gray-500 font-medium text-[10px] mt-0.5">Informasi harga diinput kurir</p>
                            </div>

                            {/* QTY Controllers (Moved Up) */}
                            <div className="flex items-center gap-3 bg-gray-50/80 p-1 rounded-xl border border-gray-100 shrink-0">
                              <button
                                onClick={() => updateQuantity(item.cart_item_id, -1)}
                                className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-600 active:scale-95 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
                              >
                                {item.qty === 1 ? <Trash2 size={14} className="text-red-500" /> : <Minus size={14} strokeWidth={2.5} />}
                              </button>
                              <span className="text-sm font-semibold w-4 text-center text-gray-800">{item.qty}</span>
                              <button
                                onClick={() => updateQuantity(item.cart_item_id, 1)}
                                className="w-8 h-8 bg-white text-primary border border-primary rounded-lg flex items-center justify-center active:scale-95 shadow-sm hover:bg-primary/5 transition-colors"
                              >
                                <Plus size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Normal Item Layout
                          <>
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-gray-900 leading-tight text-sm line-clamp-2 pr-2">
                                {item.name}
                              </h3>
                              <p className="text-primary font-semibold text-sm whitespace-nowrap">
                                Rp {calculateItemPrice(item).toLocaleString('id-ID')}
                              </p>
                            </div>

                            {item.variants && item.variants.length > 0 && (
                              <div className="border-t border-dashed border-gray-200 pt-2">
                                {/* Variant Selectors */}
                                <div className="flex flex-col gap-2">
                                  {item.variants.map(group => (
                                    <div key={group.name} className="flex items-center gap-2">
                                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide w-16 shrink-0">{group.name}:</label>
                                      <select
                                        value={item.selectedVariants?.[group.name] || ''}
                                        onChange={(e) => updateItemVariant(item.cart_item_id, group.name, e.target.value)}
                                        className={`flex-1 border text-xs font-semibold rounded-lg px-2 py-1.5 outline-none transition-all shadow-sm appearance-none cursor-pointer ${!item.selectedVariants?.[group.name] ? 'bg-red-50 border-red-200 text-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-400/20' : 'bg-white border-gray-200 text-primary focus:border-primary focus:ring-1 focus:ring-primary/20'}`}
                                      >
                                        <option value="" disabled hidden>-- Pilih {group.name} --</option>
                                        {group.options.map(opt => (
                                          <option key={opt.label} value={opt.label} className="text-gray-900 font-medium">
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Tambah Varian & Qty (Hidden for Custom Orders) */}
                    {!isCustomItem && (
                      <div className="flex justify-between items-center mt-1">
                        {item.variants && item.variants.length > 0 ? (
                          <button
                            onClick={() => duplicateItem(item.cart_item_id)}
                            disabled={!isAvailable}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${isAvailable ? 'text-primary bg-blue-50 hover:bg-blue-100 active:scale-95 border-blue-100' : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'}`}
                          >
                            <Plus size={14} strokeWidth={2.5} /> Tambah Varian
                          </button>
                        ) : (
                          <div></div>
                        )}

                        <div className="flex items-center gap-3 bg-gray-50/80 p-1 rounded-xl border border-gray-100">
                          <button
                            onClick={() => updateQuantity(item.cart_item_id, -1)}
                            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-600 active:scale-95 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            {item.qty === 1 ? <Trash2 size={14} className="text-red-500" /> : <Minus size={14} strokeWidth={2.5} />}
                          </button>
                          <span className="text-sm font-semibold w-4 text-center text-gray-800">{item.qty}</span>
                          <button
                            onClick={() => isAvailable && updateQuantity(item.cart_item_id, 1)}
                            disabled={!isAvailable}
                            className={`w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm transition-colors ${isAvailable ? 'text-primary border border-primary active:scale-95 hover:bg-primary/5' : 'text-gray-300 border border-gray-200 cursor-not-allowed'}`}
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Checkout Bar */}
      <div className="fixed bottom-[70px] left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.1)] z-40 rounded-t-3xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Pesanan:</span>
          <span className="text-lg font-bold text-primary">
            {selectedCartTotal === 0 && cartItems.some(i => (i.is_custom || !i.price || i.price === 0) && selectedItemIds.includes(i.cart_item_id)) ? 'Menyusul' : `Rp ${selectedCartTotal.toLocaleString('id-ID')}`}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-12 h-12 shrink-0 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-95 shadow-sm border border-red-100"
          >
            <Trash2 size={20} strokeWidth={2.5} />
          </button>

          <button
            onClick={handleCheckout}
            disabled={loading || selectedItemIds.length === 0 || hasMissingVariants}
            className="flex-1 bg-primary hover:bg-blue-800 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-blue-500/30 active:scale-95 text-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : hasMissingVariants ? 'Pilih Varian' : 'Lanjut Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}

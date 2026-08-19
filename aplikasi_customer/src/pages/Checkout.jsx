import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import { ArrowLeft, MapPin, Receipt, Wallet, AlertCircle, Loader2, Package, CheckCircle2, Edit3, Store, Bookmark } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart, calculateItemPrice } = useCart();
  
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  
  // State for per-item notes
  const [itemNotes, setItemNotes] = useState({});
  const [editingNoteFor, setEditingNoteFor] = useState(null);
  
  // Data passed from router state
  const items = location.state?.items || [];
  const merchant = location.state?.merchant || (items.length > 0 ? { id: items[0].merchant_id, name: items[0].merchant_name } : null);
  const fromCart = location.state?.fromCart || false;

  useEffect(() => {
    // If no items, redirect back
    if (items.length === 0) {
      navigate(-1);
      return;
    }

    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('auth_id', user.id)
          .single();
        if (data) {
          setProfile(data);
          setCustomAddress(data.address || '');

          const { data: addresses } = await supabase
            .from('customer_addresses')
            .select('*')
            .eq('auth_id', user.id)
            .order('is_default', { ascending: false });
          if (addresses) {
            setSavedAddresses(addresses);
          }
        }
      }
    };
    fetchUser();
  }, [items, navigate]);

  const totalAmount = items.reduce((sum, item) => sum + ((item.cart_item_id ? calculateItemPrice(item) : (item.price || 0)) * item.qty), 0);
  
  // Fallback calculate price if not from cart context (direct buy where calculateItemPrice might not handle the specific object format perfectly, but we try)
  const getPrice = (item) => {
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
    return price;
  };

  const finalTotalAmount = items.reduce((sum, item) => sum + (getPrice(item) * item.qty), 0);

  // Group items by merchant
  const groupedItems = items.reduce((acc, item) => {
    const mName = item.merchant_name || 'Toko Lainnya';
    if (!acc[mName]) acc[mName] = [];
    acc[mName].push(item);
    return acc;
  }, {});

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Anda harus login terlebih dahulu.");
      return;
    }

    const finalAddress = customAddress || profile?.address;
    if (!finalAddress || finalAddress.trim() === '') {
      toast.error("Alamat pengiriman harus diisi!");
      setIsEditingAddress(true);
      return;
    }

    try {
      setLoading(true);
      
      const itemsWithNotes = items.map((i, idx) => ({
        ...i,
        note: itemNotes[idx] || ''
      }));

      // Group items for raw order text
      const groupedForText = itemsWithNotes.reduce((acc, item) => {
        const mName = item.merchant_name || 'Toko Lainnya';
        if (!acc[mName]) acc[mName] = [];
        acc[mName].push(item);
        return acc;
      }, {});

      const rawOrderText = "Format Belanja/Jastip:\n\n" + Object.entries(groupedForText).map(([mName, mItems]) => {
        let storeStr = `[${mName}]\n`;
        let itemsStr = mItems.map(i => {
          let variantStr = '';
          if (i.selectedVariants && Object.keys(i.selectedVariants).length > 0) {
            variantStr = ` [${Object.values(i.selectedVariants).join(', ')}]`;
          }
          let noteStr = i.note ? `\n   Catatan: ${i.note}` : '';
          return `- ${i.name}${variantStr} (${i.qty}x) = Rp ${getPrice(i) * i.qty}${noteStr}`;
        }).join('\n');
        return storeStr + itemsStr;
      }).join('\n\n') + `\n\nAlamat: ${customAddress || profile?.address || 'Alamat tidak diisi'}`;

      const { data, error } = await supabase.from('orders').insert([{
        customer_id: profile?.id,
        customer_name: profile?.name || '-',
        customer_wa: profile?.whatsapp || profile?.wa_number || profile?.phone || '-',
        customer_address: customAddress || profile?.address || 'Alamat tidak diisi',
        tipe_layanan: 'Belanja',
        merchant_id: merchant?.id || null, // Might be null for multi-merchant
        items: itemsWithNotes,
        total_amount: finalTotalAmount,
        status: 'pending',
        raw_order_text: rawOrderText
      }]).select().single();

      if (error) throw error;

      // Delete draft if it was checked out from a draft
      if (location.state?.draftId) {
        await supabase.from('draft_orders').delete().eq('id', location.state.draftId);
      }

      if (location.state?.isRepeatOrder) {
        toast.success('Pesanan berhasil dibuat!');
        if (fromCart) {
          clearCart();
        }
        navigate('/activity', { replace: true });
      } else {
        setCreatedOrderId(data.id);
        setShowFavoriteModal(true);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Gagal melakukan checkout: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteResponse = async (isFavorite) => {
    if (isFavorite && createdOrderId) {
      try {
        await supabase.from('orders').update({ is_favorite: true }).eq('id', createdOrderId);
        toast.success("Pesanan ditambahkan ke Favorit! ❤️");
      } catch (e) {
        console.error(e);
      }
    } else {
      toast.success('Pesanan berhasil dibuat!');
    }
    setShowFavoriteModal(false);
    if (fromCart) {
      clearCart();
    }
    navigate('/activity', { replace: true });
  };

  const handleAddMoreProducts = async () => {
    if (!user) {
      toast.error("Silakan login untuk menambah produk.");
      return;
    }
    
    if (fromCart) {
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      const itemsToInsert = items.map(item => ({
        auth_id: user.id,
        product_id: item.is_custom ? null : item.id,
        merchant_id: item.merchant_id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        image_url: item.image || item.image_url || '',
        is_custom: item.is_custom || false,
        selected_variants: {
          selections: item.selectedVariants || {},
          variants_schema: item.variants || [],
          merchant_name: item.merchant_name
        }
      }));

      await supabase.from('cart_items').insert(itemsToInsert);
      navigate('/');
    } catch (error) {
      console.error("Add more products error:", error);
      toast.error("Gagal menambahkan ke keranjang");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32 font-sans">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full active:scale-95 transition-all text-gray-700">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">Konfirmasi Pesanan</h1>
      </div>

      <div className="pt-4 pb-4 space-y-4 flex-1">
        
        {/* Shipping Address */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mx-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <h2 className="font-semibold text-gray-800 text-sm">Alamat Pengiriman</h2>
            </div>
            {!isEditingAddress && (
              <button 
                onClick={() => setIsEditingAddress(true)}
                className="text-xs font-semibold text-primary hover:text-blue-700 transition-colors"
              >
                Ubah
              </button>
            )}
          </div>
          <div className="pl-6 border-l-2 border-gray-100 ml-2">
            <p className="font-semibold text-gray-900 text-sm">{profile?.name || 'Customer'}</p>
            {isEditingAddress ? (
              <div className="mt-2">
                <textarea
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="w-full text-xs text-gray-700 p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary resize-none transition-colors"
                  rows={3}
                  placeholder="Masukkan alamat pengiriman selengkapnya..."
                />
                
                {savedAddresses.length > 0 && (
                  <button 
                    onClick={() => setShowAddressSheet(true)}
                    className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 py-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    <Bookmark size={14} /> Pilih dari Alamat Tersimpan
                  </button>
                )}

                <button
                  onClick={() => setIsEditingAddress(false)}
                  className="mt-2 w-full text-xs font-semibold bg-blue-50 text-primary py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors active:scale-95"
                >
                  Simpan Alamat
                </button>
              </div>
            ) : (
              <p className={`text-xs mt-1 leading-relaxed whitespace-pre-wrap ${customAddress || profile?.address ? 'text-gray-500' : 'text-red-500 font-medium italic'}`}>
                {customAddress || profile?.address || 'Alamat pengiriman belum diisi, silahkan ubah dan isi alamat.'}
              </p>
            )}
          </div>
        </div>

        {/* Order Summary (Edge to Edge) */}
        <div className="bg-white py-4 shadow-sm border-y border-gray-100">
          <div className="flex items-center gap-2 mb-3 pb-3 px-4 border-b border-gray-50">
            <Receipt size={18} className="text-primary" />
            <h2 className="font-semibold text-gray-800 text-sm">Ringkasan Pesanan</h2>
          </div>
          
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([merchantName, merchantItems], idxGroup) => (
              <div key={merchantName} className="border-b border-gray-50 last:border-b-0 pb-4 last:pb-0">
                <h3 className="font-bold text-gray-800 text-[13px] mb-3 px-4 flex items-center gap-1.5">
                  <Store size={14} className="text-gray-400" />
                  {merchantName}
                </h3>
                
                <div className="space-y-4 px-4">
                  {merchantItems.map((item) => {
                    const originalIdx = items.indexOf(item);
                    return (
                      <div key={originalIdx} className="flex gap-3 items-start">
                        {/* Product Image */}
                        {(!item.is_custom || item.image_url) && (
                          <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-50">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package size={20} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Info & Price */}
                        <div className="flex-1 flex flex-col justify-start">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-3">
                              <h3 className="font-semibold text-gray-800 text-sm">
                                {item.name} {(item.is_custom || item.price === 0) && item.uom && <span className="text-gray-500 font-medium text-xs">({item.uom})</span>}
                              </h3>
                              {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Varian: {Object.values(item.selectedVariants).join(', ')}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {(item.is_custom || item.price === 0) ? `${item.qty} x (Harga diinfokan kurir)` : `${item.qty} x Rp ${getPrice(item).toLocaleString('id-ID')}`}
                              </p>
                            </div>
                            <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                              {(item.is_custom || item.price === 0) ? <span className="text-orange-500 text-xs italic">Menyusul</span> : `Rp ${(getPrice(item) * item.qty).toLocaleString('id-ID')}`}
                            </p>
                          </div>
                          
                          {/* Item Note Input */}
                          <div className="mt-2">
                            {editingNoteFor === originalIdx ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Contoh: Pedas, dipisah..."
                                  className="flex-1 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary"
                                  value={itemNotes[originalIdx] || ''}
                                  onChange={(e) => setItemNotes({...itemNotes, [originalIdx]: e.target.value})}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingNoteFor(null);
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => setEditingNoteFor(null)}
                                  className="p-1.5 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              </div>
                            ) : itemNotes[originalIdx] ? (
                              <div className="flex justify-between items-start bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-100 mt-1">
                                <p className="text-[11px] text-gray-600 italic leading-relaxed flex-1 pr-2">
                                  "{itemNotes[originalIdx]}"
                                </p>
                                <button
                                  onClick={() => setEditingNoteFor(originalIdx)}
                                  className="text-[10px] font-bold text-primary shrink-0 mt-0.5 hover:text-blue-700"
                                >
                                  Ubah
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingNoteFor(originalIdx)}
                                className="text-[11px] text-primary font-semibold hover:text-blue-700 transition-colors flex items-center gap-1"
                              >
                                <Edit3 size={12} /> Tambah Catatan
                              </button>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 px-4 border-t border-dashed border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-600 text-sm">Total Pesanan</span>
              <span className="font-bold text-primary text-base">
                {finalTotalAmount === 0 && items.some(i => i.is_custom || i.price === 0) ? <span className="text-orange-500 text-sm italic">Harga Menyusul</span> : `Rp ${finalTotalAmount.toLocaleString('id-ID')}`}
              </span>
            </div>
            {items.some(i => i.is_custom || i.price === 0) ? (
              <p className="text-[10px] text-orange-500 text-right mt-1.5 italic">*Total akhir akan diinformasikan kurir</p>
            ) : (
              <p className="text-[10px] text-gray-400 text-right mt-1.5 italic">*Harga belum termasuk ongkir</p>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mx-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={18} className="text-primary" />
            <h2 className="font-semibold text-gray-800 text-sm">Metode Pembayaran</h2>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary">Cash / Tunai</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Saat ini sistem Payment Gateway belum tersedia. Pembayaran akan dilakukan secara tunai kepada kurir atau merchant secara langsung.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40">
        <div className="mb-3">
          <button
            onClick={handleAddMoreProducts}
            disabled={loading}
            className="w-full bg-blue-50 hover:bg-blue-100 text-primary font-bold py-3 rounded-xl border border-blue-200 transition-all text-sm active:scale-95 flex items-center justify-center gap-2"
          >
            + Tambah Produk Lainnya
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              navigate(-1);
            }}
            disabled={loading}
            className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all text-sm active:scale-95"
          >
            Batal
          </button>
          
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex-1 bg-primary hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Lanjut Checkout'}
          </button>
        </div>
      </div>
      
      {/* Pop-up Favorit Modal */}
      {showFavoriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Simpan ke Favorit?</h3>
            <p className="text-sm text-center text-gray-500 mb-6 leading-relaxed">
              Pesanan berhasil dibuat! Apakah pesanan ini mau dimasukin ke daftar favorit biar gampang dipesan lagi nanti?
            </p>
            <div className="flex flex-col gap-2.5">
              <button 
                onClick={() => handleFavoriteResponse(true)}
                className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl active:bg-red-100 transition-colors"
              >
                Ya, Simpan Favorit
              </button>
              <button 
                onClick={() => handleFavoriteResponse(false)}
                className="w-full py-3 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Tidak sekarang
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Saved Address Bottom Sheet */}
      {showAddressSheet && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end max-w-md mx-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowAddressSheet(false)}></div>
          <div className="bg-white rounded-t-3xl w-full relative z-10 animate-slide-up pb-8 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[70vh] overflow-hidden flex flex-col">
            <div className="flex justify-center mb-4 pt-2 shrink-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            <div className="px-6 mb-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Pilih Alamat Tersimpan</h3>
            </div>
            <div className="px-4 overflow-y-auto flex-1">
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => {
                    setCustomAddress(addr.full_address);
                    setShowAddressSheet(false);
                  }}
                  className="w-full text-left p-4 rounded-2xl mb-3 border border-gray-100 shadow-sm active:scale-95 transition-all bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 text-sm">{addr.label}</span>
                    {addr.is_default && (
                      <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Utama</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{addr.full_address}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

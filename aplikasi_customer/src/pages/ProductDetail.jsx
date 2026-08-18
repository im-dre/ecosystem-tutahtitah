import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import { ArrowLeft, Package, Minus, Plus, ShoppingBag, Receipt, Trash2, Heart, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [merchant, setMerchant] = useState(location.state?.merchant || null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  
  // State for multiple selections (variant + qty combinations)
  const [selections, setSelections] = useState([]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
        
      if (!productError && productData) {
        setProduct(productData);
        
        if (!merchant) {
          const { data: merchantData } = await supabase
            .from('merchants')
            .select('*')
            .eq('id', productData.merchant_id)
            .single();
          if (merchantData) setMerchant(merchantData);
        }

        // Initialize first selection with default variants
        let initialVariants = {};
        if (productData.variants && Array.isArray(productData.variants)) {
          productData.variants.forEach(group => {
            if (group.options && group.options.length > 0) {
              initialVariants[group.name] = group.options[0].label;
            }
          });
        }
        setSelections([{ id: Date.now().toString(), qty: 1, selectedVariants: initialVariants }]);

        // Cek status favorit
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: favData } = await supabase
            .from('favorite_products')
            .select('id')
            .eq('product_id', productData.id)
            .eq('auth_id', session.user.id)
            .maybeSingle();
            
          if (favData) setIsFavorite(true);
        }
      }
      
      setLoading(false);
    };

    fetchProductDetails();
  }, [id, merchant]);

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-gray-50">Loading...</div>;
  }

  if (!product || !merchant) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <p className="text-gray-500 font-medium">Produk tidak ditemukan</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary font-semibold">Kembali</button>
      </div>
    );
  }

  const handleVariantSelect = (selectionId, groupName, label) => {
    setSelections(prev => prev.map(sel => 
      sel.id === selectionId 
        ? { ...sel, selectedVariants: { ...sel.selectedVariants, [groupName]: label } } 
        : sel
    ));
  };

  const handleQtyChange = (selectionId, newQty) => {
    if (newQty < 1) return;
    setSelections(prev => prev.map(sel => 
      sel.id === selectionId ? { ...sel, qty: newQty } : sel
    ));
  };

  const handleAddSelection = () => {
    let initialVariants = {};
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach(group => {
        if (group.options && group.options.length > 0) {
          initialVariants[group.name] = group.options[0].label;
        }
      });
    }
    setSelections(prev => [...prev, { id: Date.now().toString(), qty: 1, selectedVariants: initialVariants }]);
  };

  const handleRemoveSelection = (selectionId) => {
    setSelections(prev => prev.filter(sel => sel.id !== selectionId));
  };

  const calculateSelectionPrice = (selection) => {
    let price = product.price;
    if (product.variants && Array.isArray(product.variants)) {
      let variantPrice = 0;
      let hasPricedVariant = false;
      product.variants.forEach(group => {
        if (group.has_price) {
          const selectedLabel = selection.selectedVariants[group.name];
          const option = group.options.find(opt => opt.label === selectedLabel);
          if (option) {
            variantPrice += (parseFloat(option.price) || 0);
            hasPricedVariant = true;
          }
        }
      });
      if (hasPricedVariant) price = variantPrice;
    }
    return price;
  };

  const totalPrice = selections.reduce((sum, sel) => sum + (calculateSelectionPrice(sel) * sel.qty), 0);
  const totalQty = selections.reduce((sum, sel) => sum + sel.qty, 0);

  const handleAddToCart = () => {
    selections.forEach(sel => {
      const itemToAdd = {
        ...product,
        preSelectedVariants: sel.selectedVariants,
        preQty: sel.qty
      };
      addToCart(itemToAdd, merchant, { showToast: false });
    });
    toast.success('Produk ditambahkan ke keranjang');
  };

  const handleBuyNow = () => {
    const directCheckoutItems = selections.map(sel => ({
      ...product,
      cart_item_id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      qty: sel.qty,
      merchant_id: merchant.id,
      merchant_name: merchant.name,
      selectedVariants: sel.selectedVariants
    }));

    navigate('/checkout', {
      state: {
        items: directCheckoutItems,
        merchant: merchant
      }
    });
  };

  const handleToggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("Silakan login dulu untuk menambahkan ke favorit");
      return;
    }

    setIsTogglingFavorite(true);
    try {
      if (isFavorite) {
        await supabase
          .from('favorite_products')
          .delete()
          .eq('product_id', product.id)
          .eq('auth_id', session.user.id);
        setIsFavorite(false);
        setProduct(prev => ({ ...prev, favorite_count: Math.max(0, (prev.favorite_count || 0) - 1) }));
        toast.success("Dihapus dari favorit");
      } else {
        await supabase
          .from('favorite_products')
          .insert({
            product_id: product.id,
            auth_id: session.user.id
          });
        setIsFavorite(true);
        setProduct(prev => ({ ...prev, favorite_count: (prev.favorite_count || 0) + 1 }));
        toast.success("Ditambahkan ke favorit! ❤️");
      }
    } catch (error) {
      console.error("Gagal toggle favorit:", error);
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32 relative font-sans">
      {/* Header */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 hover:bg-white/90 active:scale-95 transition-all shadow-sm">
          <ArrowLeft size={20} />
        </button>
      </div>
      
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <button 
          onClick={handleToggleFavorite} 
          disabled={isTogglingFavorite}
          className="w-10 h-10 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
        >
          <Heart 
            size={22} 
            className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} 
          />
        </button>
      </div>

      {/* Hero Image */}
      <div className="relative w-full aspect-square bg-white flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={64} className="text-gray-300" />
        )}
      </div>

      <div className="p-4 sm:p-5 bg-white mb-2 shadow-sm">
        <div className="mb-2">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 leading-snug mb-2">{product.name}</h1>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-lg">
              <Star size={14} className="fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-bold text-yellow-700">{product.rating_score ? Number(product.rating_score).toFixed(1) : '0.0'}</span>
              <span className="text-[11px] font-medium text-yellow-600 border-l border-yellow-200 pl-1.5">({product.total_ratings || 0} Ulasan)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
              <Heart size={14} className="text-gray-400" />
              <span className="text-[11px] font-medium text-gray-600">{product.favorite_count || 0} Disukai</span>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-primary">
            Rp {product.price.toLocaleString('id-ID')}
            {product.variants && product.variants.some(g => g.has_price) && <span className="text-sm font-medium text-gray-500 ml-1">mulai dari</span>}
          </p>
        </div>

        {product.description && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Deskripsi Produk</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}
      </div>

      {/* Selections / Variants List */}
      <div className="py-2 space-y-2 bg-gray-50">
        {selections.map((sel, index) => (
          <div key={sel.id} className="bg-white p-4 border-y border-gray-100 relative shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
              <h3 className="font-semibold text-gray-800 text-sm">Pesanan {index + 1}</h3>
              {selections.length > 1 && (
                <button 
                  onClick={() => handleRemoveSelection(sel.id)}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors active:scale-95"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Variants for this selection */}
            {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
              <div className="space-y-4 mb-4">
                {product.variants.map((group) => (
                  <div key={group.name}>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 flex justify-between">
                      {group.name}
                      {group.has_price && <span className="text-[10px] text-gray-400 font-medium">Berbayar</span>}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((opt) => {
                        const isSelected = sel.selectedVariants[group.name] === opt.label;
                        return (
                          <button
                            key={opt.label}
                            onClick={() => handleVariantSelect(sel.id, group.name, opt.label)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              isSelected 
                                ? 'bg-blue-50 border-primary text-primary shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity for this selection */}
            <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-100">
              <span className="text-sm font-semibold text-primary">Rp {(calculateSelectionPrice(sel) * sel.qty).toLocaleString('id-ID')}</span>
              <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button
                  onClick={() => handleQtyChange(sel.id, sel.qty - 1)}
                  disabled={sel.qty <= 1}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${sel.qty <= 1 ? 'text-gray-300' : 'text-gray-600 bg-white shadow-sm active:scale-95 border border-gray-100'}`}
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <span className="text-sm font-semibold w-5 text-center text-gray-800">{sel.qty}</span>
                <button
                  onClick={() => handleQtyChange(sel.id, sel.qty + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-primary shadow-sm active:scale-95"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add Variant Button */}
        {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <button 
              onClick={handleAddSelection}
              className="w-full bg-blue-50 hover:bg-blue-100 text-primary font-semibold py-3 rounded-2xl border border-blue-100 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} /> Tambah Varian Lainnya
            </button>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-3 pb-safe shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-xs font-semibold text-gray-500">Total ({totalQty} barang)</span>
          <span className="text-base font-bold text-primary">Rp {totalPrice.toLocaleString('id-ID')}</span>
        </div>
        {!product.is_available ? (
          <div className="w-full bg-gray-100 text-gray-500 font-bold py-3 rounded-xl text-center text-sm border border-gray-200">
            Produk Sedang Habis
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-white hover:bg-blue-50 text-primary font-semibold py-2.5 rounded-xl border border-primary transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              <ShoppingBag size={18} /> Keranjang
            </button>
  
            <button
              onClick={handleBuyNow}
              className="flex-1 bg-primary hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              <Receipt size={18} /> Pesan Langsung
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

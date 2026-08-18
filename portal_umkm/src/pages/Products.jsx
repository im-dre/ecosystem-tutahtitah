import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import ProductModal from '../components/ProductModal';

export default function Products() {
  const { merchant } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const isPending = merchant?.status === 'PENDING';

  const fetchProducts = async () => {
    if (!merchant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('id', { ascending: false });

    if (error) {
      toast.error('Failed to fetch products');
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [merchant]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleToggleAvailability = async (id, currentStatus) => {
    if (isPending) return;
    const { error } = await supabase
      .from('products')
      .update({ is_available: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Gagal memperbarui status');
    } else {
      toast.success(currentStatus ? 'Produk diset habis' : 'Produk tersedia');
      fetchProducts();
    }
  };

  const handleDelete = async (id) => {
    if (isPending) return;
    if (!window.confirm('Yakin ingin menghapus produk ini?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus produk');
    } else {
      toast.success('Produk dihapus');
      fetchProducts();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-50/90 backdrop-blur-md pb-4 pt-4 mb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 shadow-sm md:shadow-none">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Katalog Produk</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola daftar menu, harga, varian, dan ketersediaan.</p>
        </div>
        
        <div className="flex items-center">
          {isPending && (
            <div className="bg-accent-50 text-yellow-800 px-4 py-2 rounded-xl text-sm font-bold border border-accent-200 flex items-center gap-2 w-full md:w-auto justify-center">
              <i className="ph-fill ph-lock-key"></i> Mode Baca Saja
            </div>
          )}
          {!isPending && (
            <button
              onClick={handleOpenAddModal}
              className="bg-brand-500 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:bg-brand-600 transition-colors w-full md:w-auto flex justify-center items-center gap-2"
            >
              <i className="ph-fill ph-plus-circle text-lg"></i>
              Tambah Produk
            </button>
          )}
        </div>
      </div>
      
      {/* Product List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ph ph-spinner-gap animate-spin text-4xl text-brand-500 mb-4"></i>
          <p className="text-gray-500 font-medium">Memuat katalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-none md:rounded-3xl p-10 text-center shadow-sm border-t border-b md:border border-gray-100 flex flex-col items-center justify-center">
           <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-4">
             <i className="ph-fill ph-package text-5xl text-brand-500"></i>
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-2">Belum ada produk</h3>
           <p className="text-gray-500 max-w-sm mx-auto mb-6">Toko Anda masih kosong. Yuk, tambahkan produk pertama Anda agar pelanggan bisa mulai memesan.</p>
           {!isPending && (
             <button
                onClick={handleOpenAddModal}
                className="bg-accent-500 text-brand-900 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-yellow-400 transition-colors flex justify-center items-center gap-2"
              >
                <i className="ph-fill ph-plus-circle text-lg"></i>
                Tambah Produk Pertama
              </button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 border-t border-b border-gray-100 md:border md:rounded-3xl md:overflow-hidden md:shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          {products.map((product) => {
            
            // Calculate Price
            let minPrice = 0;
            let maxPrice = 0;
            let hasPriceVariants = false;
            if (product.variants && product.variants.length > 0) {
              product.variants.forEach(group => {
                if (group.has_price && group.options && group.options.length > 0) {
                  hasPriceVariants = true;
                  const prices = group.options.map(opt => parseFloat(opt.price) || 0);
                  minPrice += Math.min(...prices);
                  maxPrice += Math.max(...prices);
                }
              });
            }
            const priceDisplay = hasPriceVariants 
              ? (minPrice !== maxPrice ? `Rp ${minPrice.toLocaleString('id-ID')} - Rp ${maxPrice.toLocaleString('id-ID')}` : `Rp ${minPrice.toLocaleString('id-ID')}`)
              : `Rp ${(product.price || 0).toLocaleString('id-ID')}`;

            return (
              <div key={product.id} className={`bg-white p-4 md:p-5 flex flex-col relative transition-all ${!product.is_available ? 'opacity-75' : 'hover:bg-gray-50'}`}>
                
                {/* Out of stock overlay */}
                {!product.is_available && (
                   <div className="absolute top-4 right-4 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-md z-10 uppercase tracking-widest">
                     Habis
                   </div>
                )}

                <div className="flex gap-4 mb-4">
                  {/* Image */}
                  <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center relative">
                    {product.image_url ? (
                        <img className={`w-full h-full object-cover ${!product.is_available ? 'grayscale opacity-50' : ''}`} src={product.image_url} alt={product.name} />
                    ) : (
                        <i className="ph ph-image text-3xl text-gray-300"></i>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {product.category && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{product.category}</span>}
                      {product.badge && product.badge !== 'None' && <span className="bg-accent-100 text-accent-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{product.badge}</span>}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 leading-tight mb-1 truncate">{product.name}</h3>
                    <p className="text-brand-600 font-black text-sm">{priceDisplay}</p>
                  </div>
                </div>

                {/* Variants Info */}
                {product.variants && product.variants.length > 0 && (
                  <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex flex-col gap-1">
                      {product.variants.map((g, i) => (
                        <div key={i} className="text-xs text-gray-600 flex">
                          <span className="font-bold w-20 shrink-0">{g.name}</span>
                          <span className="truncate text-gray-500">{g.options ? g.options.map(opt => opt.label).join(', ') : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isPending && (
                  <div className="mt-auto pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.is_available)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all ${
                        product.is_available 
                          ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200' 
                          : 'bg-green-600 text-white hover:bg-green-700 border border-green-700 shadow-sm'
                      }`}
                    >
                      <i className={`ph-fill ${product.is_available ? 'ph-power' : 'ph-check-circle'} text-sm`}></i>
                      {product.is_available ? 'Set Habis' : 'Set Tersedia'}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(product)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 py-2 rounded-xl text-[11px] uppercase tracking-wider font-bold hover:bg-brand-100 transition-all"
                    >
                      <i className="ph-fill ph-pencil-simple text-sm"></i>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="w-10 bg-red-50 border border-red-200 text-red-600 py-2 rounded-xl text-xs flex items-center justify-center hover:bg-red-100 transition-all shrink-0"
                      title="Hapus Produk"
                    >
                      <i className="ph-fill ph-trash text-base"></i>
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      <ProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        merchantId={merchant?.id}
        onSuccess={fetchProducts}
      />
    </div>
  );
}

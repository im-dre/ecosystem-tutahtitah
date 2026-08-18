import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ProductModal({ isOpen, onClose, product, onSuccess }) {
  const { merchant } = useAuth();
  const merchantId = merchant?.id;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [badge, setBadge] = useState('None');
  const [isAvailable, setIsAvailable] = useState(true);

  // Image handling
  const [imageFile, setImageFile] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  // Variants handling
  const [variants, setVariants] = useState([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setPrice(product.price || '');
      setCategory(product.category || 'Makanan');
      setBadge(product.badge || 'None');
      setIsAvailable(product.is_available ?? true);
      setCurrentImageUrl(product.image_url || '');
      setImageFile(null);

      const savedVariants = product.variants || [];
      if (savedVariants.length > 0) {
        if (savedVariants[0].options === undefined) {
          // Graceful migration from old flat array format to grouped format
          const hasPrice = savedVariants.some(v => v.price !== undefined && v.price !== null && v.price !== "" && v.price !== 0);
          setVariants([{
            name: 'Varian',
            has_price: hasPrice,
            options: savedVariants.map(v => ({ label: v.name, price: v.price || '' }))
          }]);
        } else {
          setVariants(savedVariants);
        }
      } else {
        setVariants([]);
      }
    } else {
      // Reset for new product
      setName('');
      setPrice('');
      setCategory('Makanan');
      setBadge('None');
      setIsAvailable(true);
      setCurrentImageUrl('');
      setImageFile(null);
      setVariants([]);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleAddVariantGroup = () => {
    setVariants([...variants, { name: '', has_price: true, options: [{ label: '', price: '' }] }]);
  };

  const handleRemoveVariantGroup = (groupIndex) => {
    setVariants(variants.filter((_, i) => i !== groupIndex));
  };

  const handleChangeGroupName = (groupIndex, newName) => {
    const newVariants = [...variants];
    newVariants[groupIndex].name = newName;
    setVariants(newVariants);
  };

  const handleToggleGroupPrice = (groupIndex, hasPrice) => {
    const newVariants = [...variants];
    newVariants[groupIndex].has_price = hasPrice;
    setVariants(newVariants);
  };

  const handleAddOption = (groupIndex) => {
    const newVariants = [...variants];
    newVariants[groupIndex].options.push({ label: '', price: '' });
    setVariants(newVariants);
  };

  const handleRemoveOption = (groupIndex, optIndex) => {
    const newVariants = [...variants];
    newVariants[groupIndex].options = newVariants[groupIndex].options.filter((_, i) => i !== optIndex);
    setVariants(newVariants);
  };

  const handleChangeOption = (groupIndex, optIndex, field, value) => {
    const newVariants = [...variants];
    newVariants[groupIndex].options[optIndex][field] = value;
    setVariants(newVariants);
  };

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'mitra_umkm_tutahtitah');

    const res = await fetch('https://api.cloudinary.com/v1_1/bvxkjuf5/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Gagal mengunggah gambar ke Cloudinary');
    }

    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!merchant || !merchant.id) {
      toast.error('Data toko belum siap');
      console.error('Submit Error: merchantId is null or undefined', { merchantId: merchant?.id });
      return;
    }

    setSaving(true);

    try {
      let finalImageUrl = currentImageUrl;

      if (imageFile) {
        finalImageUrl = await uploadImageToCloudinary(imageFile);
      }

      // Clean variants before saving
      const cleanVariants = variants.map(group => {
        const cleanOptions = group.options
          .filter(opt => opt.label.trim() !== '')
          .map(opt => ({
            label: opt.label,
            price: group.has_price ? (parseFloat(opt.price) || 0) : 0
          }));
        return {
          name: group.name,
          has_price: group.has_price,
          options: cleanOptions
        };
      }).filter(group => group.name.trim() !== '' && group.options.length > 0);

      const productData = {
        merchant_id: merchant.id,
        name,
        price: parseFloat(price),
        category,
        badge: badge === 'None' ? null : badge,
        is_available: isAvailable,
        image_url: finalImageUrl,
        variants: cleanVariants.length > 0 ? cleanVariants : null
      };

      if (product) {
        // Update
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        if (error) throw error;
        toast.success('Produk berhasil diperbarui');
      } else {
        // Insert
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
        toast.success('Produk berhasil ditambahkan');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Terjadi kesalahan saat menyimpan produk');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 overflow-hidden backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-3xl md:m-4 relative flex flex-col h-[90vh] md:max-h-[90vh] animate-drive-in-right">
        {/* Mobile Drag Indicator */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0 bg-white rounded-t-3xl">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        <div className="px-5 py-4 md:p-6 border-b border-gray-100 shrink-0 flex justify-between items-center sticky top-0 bg-white md:rounded-t-3xl z-10">
          <h3 className="text-lg md:text-xl font-black text-gray-900">{product ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Produk *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Harga Dasar (Rp) *</label>
                <input type="number" required min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  <option value="Makanan">Makanan</option>
                  <option value="Minuman">Minuman</option>
                  <option value="Cemilan">Cemilan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Badge</label>
                <select value={badge} onChange={(e) => setBadge(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  <option value="None">Tidak Ada</option>
                  <option value="Terlaris">Terlaris</option>
                  <option value="Promo">Promo</option>
                  <option value="Baru">Baru</option>
                  <option value="Rekomendasi">Rekomendasi</option>
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Produk</label>
              <input
                id="product-image-input"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md p-1"
              />
              {imageFile && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-2">Preview gambar baru:</p>
                  <div className="relative inline-block">
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-24 w-24 object-cover rounded-lg border-2 border-blue-200 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        const fileInput = document.getElementById('product-image-input');
                        if (fileInput) fileInput.value = '';
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md transition-colors"
                      title="Batal pilih gambar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-green-600 truncate max-w-xs">{imageFile.name}</p>
                </div>
              )}
              {!imageFile && currentImageUrl && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">Gambar saat ini:</p>
                  <img src={currentImageUrl} alt="Current product" className="h-20 w-20 object-cover rounded-md border" />
                </div>
              )}
            </div>

            <div className="flex items-center pt-2">
              <input id="is_available" type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor="is_available" className="ml-2 block text-sm font-medium text-gray-900">Produk Tersedia (Bisa Dipesan)</label>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Dynamic Variants */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/80 space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-black text-blue-900">Varian / Opsi Produk (Opsional)</label>
                <button type="button" onClick={handleAddVariantGroup} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl transition flex items-center gap-1 shadow-sm shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  Tambah Grup Varian
                </button>
              </div>

              <p className="text-xs text-gray-500 leading-tight">Tambahkan grup opsi seperti Ukuran, Level Pedas, Rasa, dll.</p>

              <div className="space-y-4">
                {variants.map((group, groupIndex) => (
                  <div key={groupIndex} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <input
                        type="text"
                        placeholder="Nama Grup Varian (Cth: Level Pedas / Ukuran)"
                        required
                        value={group.name}
                        onChange={(e) => handleChangeGroupName(groupIndex, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-bold text-gray-800 focus:outline-none focus:border-blue-500"
                      />
                      <button type="button" onClick={() => handleRemoveVariantGroup(groupIndex)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition shrink-0" title="Hapus Grup">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none pl-1">
                      <input
                        type="checkbox"
                        checked={group.has_price}
                        onChange={(e) => handleToggleGroupPrice(groupIndex, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-gray-600">Opsi pada grup ini memengaruhi harga produk?</span>
                    </label>

                    <div className="space-y-2 pl-1 border-l-2 border-blue-100 mt-3">
                      {group.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm relative">
                          <div className="flex-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nama Opsi</label>
                            <input
                              type="text"
                              placeholder="Cth: Level 1 / Jumbo"
                              required
                              value={opt.label}
                              onChange={(e) => handleChangeOption(groupIndex, optIndex, 'label', e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 font-bold focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {group.has_price && (
                            <div className="w-full sm:w-40 shrink-0">
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Harga (Rp)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2.5 text-xs font-bold text-gray-400">Rp</span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  required={group.has_price}
                                  value={opt.price}
                                  onChange={(e) => handleChangeOption(groupIndex, optIndex, 'price', e.target.value)}
                                  className="w-full pl-8 pr-2 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 font-bold focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          )}

                          <button type="button" onClick={() => handleRemoveOption(groupIndex, optIndex)} className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 mt-6 sm:mt-0 self-end p-2 sm:py-2 sm:px-2.5 bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition shrink-0">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <button type="button" onClick={() => handleAddOption(groupIndex)} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-2 rounded-lg transition flex items-center gap-1 mt-3">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                      Tambah Opsi
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </form>
        </div>

        <div className="px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-6 border-t border-gray-100 shrink-0 bg-white md:rounded-b-3xl z-10">
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-red-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={saving}
              className="flex-1 bg-brand-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-colors"
            >
              {saving ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

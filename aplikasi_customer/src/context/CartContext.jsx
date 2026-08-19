import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

const CartContext = createContext();

export const useCart = () => {
  return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const isUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. Listen to Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      handleSessionChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      handleSessionChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSessionChange = async (currentSession) => {
    setIsInitializing(true);
    if (currentSession?.user) {
      const authId = currentSession.user.id;
      
      // Cek local storage untuk keranjang guest
      const saved = localStorage.getItem('customer_cart');
      let guestItems = [];
      if (saved) {
        try {
          guestItems = JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse local storage cart");
        }
      }

      // Sinkronisasi guest items ke Supabase jika ada
      if (guestItems.length > 0) {
        try {
          const itemsToInsert = guestItems.map(item => ({
             auth_id: authId,
             product_id: item.id,
             merchant_id: item.merchant_id,
             name: item.name,
             price: item.price, // Base price
             qty: item.qty,
             image_url: item.image || item.image_url || '',
             // Simpan selections dan schema variants agar bisa hitung harga nanti
             selected_variants: {
               selections: item.selectedVariants || {},
               variants_schema: item.variants || [],
               merchant_name: item.merchant_name
             }
          }));
          
          const { error } = await supabase.from('cart_items').insert(itemsToInsert);
          
          if (!error) {
            localStorage.removeItem('customer_cart');
            toast.success('Keranjang berhasil disinkronkan!');
          } else {
            console.error("Error syncing cart to Supabase:", error);
          }
        } catch(e) {
          console.error("Exception syncing cart", e);
        }
      }

      // Fetch data terbaru dari DB
      await fetchCartFromDB(authId);
    } else {
      // Guest user, load from local storage
      const saved = localStorage.getItem('customer_cart');
      if (saved) {
        try {
          setCartItems(JSON.parse(saved));
        } catch (e) {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
      setIsInitializing(false);
    }
  };

  const fetchCartFromDB = async (authId) => {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('auth_id', authId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const merchantIdsToFetch = data
        .filter(d => !d.selected_variants?.merchant_name && d.merchant_id)
        .map(d => d.merchant_id);
        
      let merchantMap = {};
      if (merchantIdsToFetch.length > 0) {
        const { data: merchants } = await supabase
          .from('merchants')
          .select('id, name')
          .in('id', [...new Set(merchantIdsToFetch)]);
        if (merchants) {
          merchantMap = merchants.reduce((acc, m) => {
            acc[m.id] = m.name;
            return acc;
          }, {});
        }
      }

      const mappedItems = data.map(dbItem => ({
        id: dbItem.product_id, // original product id
        cart_item_id: dbItem.id, // Supabase generated uuid
        merchant_id: dbItem.merchant_id,
        merchant_name: dbItem.selected_variants?.merchant_name || merchantMap[dbItem.merchant_id] || '',
        name: dbItem.name,
        price: dbItem.price,
        qty: dbItem.qty,
        image: dbItem.image_url,
        image_url: dbItem.image_url,
        selectedVariants: dbItem.selected_variants?.selections || {},
        variants: dbItem.selected_variants?.variants_schema || []
      }));
      setCartItems(mappedItems);
    } else {
      console.error("Error fetching cart from DB:", error);
    }
    setIsInitializing(false);
  };

  // 2. Fallback sinkronisasi Local Storage (hanya jika guest)
  useEffect(() => {
    if (!session && !isInitializing) {
      localStorage.setItem('customer_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, session, isInitializing]);

  const addToCart = async (product, merchant, options = { showToast: true }) => {
    // Siapkan default variants
    let defaultVariants = product.preSelectedVariants || {};
    if (!product.preSelectedVariants && product.variants && Array.isArray(product.variants)) {
      product.variants.forEach(group => {
        if (group.options && group.options.length > 0) {
          defaultVariants[group.name] = ''; // Require explicit selection
        }
      });
    }

    const qtyToAdd = product.preQty || 1;

    // Cek apakah item sudah ada di keranjang (tanpa varian spesifik)
    const existingIndex = cartItems.findIndex(item => item.id === product.id);
    const existing = existingIndex >= 0 ? cartItems[existingIndex] : null;

    if (existing && !product.preSelectedVariants) {
      // Update Qty
      updateQuantity(existing.cart_item_id, qtyToAdd);
      if (options.showToast) toast.success("Berhasil ditambahkan ke keranjang");
      return;
    }

    // Insert Item Baru
    const cartItemId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const itemToAdd = { 
      ...product, 
      cart_item_id: cartItemId,
      qty: qtyToAdd, 
      merchant_id: merchant.id, 
      merchant_name: merchant.name,
      selectedVariants: defaultVariants
    };

    if (session?.user) {
      // DB Insert
      const dbPayload = {
        auth_id: session.user.id,
        product_id: product.id,
        merchant_id: merchant.id,
        name: product.name,
        price: product.price,
        qty: qtyToAdd,
        image_url: product.image || product.image_url || '',
        selected_variants: {
          selections: defaultVariants,
          variants_schema: product.variants || [],
          merchant_name: merchant.name
        }
      };

      // Optimistic update
      setCartItems(prev => [...prev, itemToAdd]);

      const { data, error } = await supabase.from('cart_items').insert(dbPayload).select().single();
      if (error) {
        console.error("Add to cart error:", error);
        toast.error("Gagal menambahkan ke keranjang");
        // Rollback
        setCartItems(prev => prev.filter(item => item.cart_item_id !== cartItemId));
      } else if (data) {
        // Update cart_item_id with DB uuid
        setCartItems(prev => prev.map(item => 
          item.cart_item_id === cartItemId ? { ...item, cart_item_id: data.id } : item
        ));
        if (options.showToast) toast.success("Berhasil ditambahkan ke keranjang");
      }
    } else {
      // Local Storage Update
      setCartItems(prev => [...prev, itemToAdd]);
      if (options.showToast) toast.success("Berhasil ditambahkan ke keranjang");
    }
  };

  const removeFromCart = async (cartItemId) => {
    // Optimistic update
    const previousCart = [...cartItems];
    setCartItems(prev => prev.filter(item => item.cart_item_id !== cartItemId));

    if (session?.user && isUUID(cartItemId)) {
      const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
      if (error) {
        console.error("Remove from cart error:", error);
        toast.error("Gagal menghapus item");
        setCartItems(previousCart); // Rollback
      }
    }
  };

  const updateQuantity = async (cartItemId, amount) => {
    const itemToUpdate = cartItems.find(item => item.cart_item_id === cartItemId);
    if (!itemToUpdate) return;

    const newQty = itemToUpdate.qty + amount;

    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    // Optimistic update
    setCartItems(prev => prev.map(item => 
      item.cart_item_id === cartItemId ? { ...item, qty: newQty } : item
    ));

    if (session?.user && isUUID(cartItemId)) {
      const { error } = await supabase.from('cart_items').update({ qty: newQty }).eq('id', cartItemId);
      if (error) {
        console.error("Update qty error:", error);
        toast.error("Gagal mengubah jumlah");
        // Rollback
        setCartItems(prev => prev.map(item => 
          item.cart_item_id === cartItemId ? { ...item, qty: itemToUpdate.qty } : item
        ));
      }
    }
  };

  const updateItemVariant = async (cartItemId, groupName, optionLabel) => {
    const itemToUpdate = cartItems.find(item => item.cart_item_id === cartItemId);
    if (!itemToUpdate) return;

    const newSelectedVariants = {
      ...itemToUpdate.selectedVariants,
      [groupName]: optionLabel
    };

    // Optimistic update
    setCartItems(prev => prev.map(item => 
      item.cart_item_id === cartItemId ? { ...item, selectedVariants: newSelectedVariants } : item
    ));

    if (session?.user && isUUID(cartItemId)) {
      const dbPayload = {
        selected_variants: {
          selections: newSelectedVariants,
          variants_schema: itemToUpdate.variants || []
        }
      };
      
      const { error } = await supabase.from('cart_items').update(dbPayload).eq('id', cartItemId);
      if (error) {
        console.error("Update variant error:", error);
        toast.error("Gagal mengubah varian");
        // Rollback
        setCartItems(prev => prev.map(item => 
          item.cart_item_id === cartItemId ? { ...item, selectedVariants: itemToUpdate.selectedVariants } : item
        ));
      }
    }
  };

  const duplicateItem = async (cartItemId) => {
    const itemToDuplicate = cartItems.find(item => item.cart_item_id === cartItemId);
    if (!itemToDuplicate) return;

    const newCartItemId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const duplicatedItem = {
      ...itemToDuplicate,
      cart_item_id: newCartItemId,
      qty: 1
    };

    // Insert it right after the original item
    const index = cartItems.findIndex(item => item.cart_item_id === cartItemId);
    
    if (session?.user) {
      const dbPayload = {
        auth_id: session.user.id,
        product_id: duplicatedItem.id,
        merchant_id: duplicatedItem.merchant_id,
        name: duplicatedItem.name,
        price: duplicatedItem.price,
        qty: 1,
        image_url: duplicatedItem.image_url || duplicatedItem.image || '',
        selected_variants: {
          selections: duplicatedItem.selectedVariants,
          variants_schema: duplicatedItem.variants || [],
          merchant_name: duplicatedItem.merchant_name
        }
      };

      // Optimistic
      setCartItems(prev => {
        const newItems = [...prev];
        newItems.splice(index + 1, 0, duplicatedItem);
        return newItems;
      });

      const { data, error } = await supabase.from('cart_items').insert(dbPayload).select().single();
      if (error) {
        console.error("Duplicate item error:", error);
        toast.error("Gagal menduplikasi item");
        // Rollback
        setCartItems(prev => prev.filter(item => item.cart_item_id !== newCartItemId));
      } else if (data) {
        setCartItems(prev => prev.map(item => 
          item.cart_item_id === newCartItemId ? { ...item, cart_item_id: data.id } : item
        ));
      }
    } else {
      setCartItems(prev => {
        const newItems = [...prev];
        newItems.splice(index + 1, 0, duplicatedItem);
        return newItems;
      });
    }
  };

  const clearCart = async () => {
    const previousCart = [...cartItems];
    setCartItems([]);

    if (session?.user) {
      const { error } = await supabase.from('cart_items').delete().eq('auth_id', session.user.id);
      if (error) {
        console.error("Clear cart error:", error);
        toast.error("Gagal mengosongkan keranjang");
        setCartItems(previousCart);
      }
    }
  };

  const calculateItemPrice = (item) => {
    let price = item.price || 0;
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

  const cartTotal = cartItems.reduce((sum, item) => sum + (calculateItemPrice(item) * item.qty), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <CartContext.Provider value={{ 
      cartItems, addToCart, removeFromCart, updateQuantity, updateItemVariant, duplicateItem, clearCart, cartTotal, cartCount, calculateItemPrice, isInitializing 
    }}>
      {children}
    </CartContext.Provider>
  );
};

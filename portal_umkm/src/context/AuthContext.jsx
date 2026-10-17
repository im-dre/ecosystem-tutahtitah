import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Supabase auth user
  const [merchant, setMerchant] = useState(null); // merchants table row
  const [loading, setLoading] = useState(true);

  // Fetch merchant row tied to the logged-in user
  const fetchMerchant = async (userId) => {
    // Every authenticated portal user is identified by the merchant owner_id.
    // This includes merchants that are still in the draft registration state.
    const { data, error } = await supabase
      .from('merchants')
      .select('id, owner_id, name, description, address, logo_url, banner_url, operating_hours, status, rejection_reason, suspension_reason, resubmission_note, is_active, is_custom_order, warning_points, created_at')
      .eq('owner_id', userId)
      .maybeSingle();
      
    if (error) {
      console.warn('fetchMerchant error:', error.message);
      return null;
    }
    return data || null;
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const m = await fetchMerchant(session.user.id);
        setMerchant(m);
      }
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const m = await fetchMerchant(session.user.id);
          setMerchant(m);
        } else {
          setUser(null);
          setMerchant(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshMerchant = async () => {
    if (!user) return;
    const m = await fetchMerchant(user.id);
    setMerchant(m);
    return m;
  };

  const signIn = async ({ email, password }) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async ({ email, password }) => {
    return await supabase.auth.signUp({ email, password });
  };

  const submitMerchantForReview = async (merchantId, note = null) => {
    return await supabase.rpc('submit_merchant_for_review', {
      p_merchant_id: merchantId,
      p_note: note
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, merchant, loading, refreshMerchant, signOut, signIn, signUp, submitMerchantForReview }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

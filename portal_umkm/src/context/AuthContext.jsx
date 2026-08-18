import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Supabase auth user
  const [merchant, setMerchant] = useState(null); // merchants table row
  const [loading, setLoading] = useState(true);

  // Fetch merchant row tied to the logged-in user
  const fetchMerchant = async (userId) => {
    // 1. Get customer record linked to auth_id
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_id', userId)
      .maybeSingle();

    if (custError || !customer) {
      console.warn('Customer not found for auth user:', userId);
      return null;
    }

    // 2. Fetch merchant using auth userId as owner_id
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, merchant, loading, refreshMerchant, signOut, signIn, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

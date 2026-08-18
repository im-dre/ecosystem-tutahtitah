import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/tutahtitah-ecosystem/aplikasi_customer/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

console.log("Listening to products...");
const channel = supabase.channel('test-products')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
    console.log("RECEIVED PRODUCT EVENT:", payload);
  })
  .subscribe(status => {
    console.log("Subscription status:", status);
  });

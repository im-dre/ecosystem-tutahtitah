import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/tutahtitah-ecosystem/aplikasi_customer/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtime() {
  const { data, error } = await supabase.rpc('get_realtime_tables'); // If RPC exists
  if (error) {
     console.log("RPC Error:", error.message);
     // Let's just try to query pg_publication_tables directly using an insert/select if we had a secret key
  }
}

checkRealtime();

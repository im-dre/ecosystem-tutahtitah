import { createClient } from '@supabase/supabase-js';

// Setup Supabase client (Gunakan env var dari Vite)
const supabaseUrl = 'https://tphaeukukktjykorkcxi.supabase.co'; 
const supabaseKey = 'sb_publishable_XQdY7plphwCcoEEt7M1_bw_bdgpa0j6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Cart_Items Error:', error);
  } else {
    console.log('Cart_Items Data:', data && data.length > 0 ? Object.keys(data[0]) : 'empty');
  }
}

checkSchema();

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tphaeukukktjykorkcxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_XQdY7plphwCcoEEt7M1_bw_bdgpa0j6';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: mer, error: mere } = await supabase.from('merchants').select('*').eq('is_custom_order', true);
  console.log("Merchants Data:", mer);
  console.log("Merchants Error:", mere);
}

check();

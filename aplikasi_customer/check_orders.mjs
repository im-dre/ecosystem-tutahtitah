import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tphaeukukktjykorkcxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_XQdY7plphwCcoEEt7M1_bw_bdgpa0j6';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOrders() {
  const { data, error } = await supabase.from('orders').select('*').limit(3).order('id', { ascending: false });
  console.log("Raw orders:", data);
  if (error) console.log("Error raw:", error);

  const { data: dataJoin, error: errJoin } = await supabase.from('orders').select('*, employees!assigned_courier_id(full_name)').limit(3).order('id', { ascending: false });
  console.log("Joined orders:", dataJoin);
  if (errJoin) console.log("Error join:", errJoin);
}

checkOrders();

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tphaeukukktjykorkcxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_XQdY7plphwCcoEEt7M1_bw_bdgpa0j6';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: emp, error: empe } = await supabase.from('employees').select('*').limit(1);
  console.log("Employees Data:", emp);
  console.log("Employees Error:", empe);
}

check();

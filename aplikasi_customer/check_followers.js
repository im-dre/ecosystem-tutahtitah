import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const supabaseUrlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const supabaseAnonKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = supabaseUrlMatch[1].trim();
const supabaseAnonKey = supabaseAnonKeyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .rpc('get_schema_info', { table_name: 'merchant_followers' }); // Or just select * if rpc fails

  if (error) {
    // Let's just fetch one row and see its types, or try to intentionally cause an error to see if customer_id is int or uuid
    const { error: err2 } = await supabase.from('merchant_followers').select('*').limit(1);
    console.error("Schema fetch error:", error.message);
    if (err2) {
      console.log("Error selecting row:", err2.message);
    } else {
      console.log("Select succeeded. Let's try inserting a fake uuid to customer_id to see the error.");
      const { error: err3 } = await supabase.from('merchant_followers').select('*').eq('customer_id', 'a-fake-uuid-format');
      console.log("Error querying uuid on customer_id:", err3?.message || "No error");
    }
  } else {
    console.log(data);
  }
}

check();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const envVars = Object.fromEntries(
  env.split('\n').filter(Boolean).map(line => line.split('='))
);

const supabaseUrl = envVars.VITE_SUPABASE_URL.replace('\r', '');
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY.replace('\r', '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmins() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, email, role, is_super_admin')
    .eq('role', 'admin');

  if (error) {
    console.error('Error fetching admins:', error);
  } else {
    console.table(data);
  }
}

checkAdmins();

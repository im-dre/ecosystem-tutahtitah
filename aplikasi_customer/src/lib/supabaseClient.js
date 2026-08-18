import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tphaeukukktjykorkcxi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XQdY7plphwCcoEEt7M1_bw_bdgpa0j6';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

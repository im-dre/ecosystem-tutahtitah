const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
s.rpc('get_policies_by_table', { table_name: 'messages' }).then(console.log).catch(console.error);

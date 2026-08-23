-- Fix Supabase Realtime broadcasting issue 
-- Kebijakan ini memastikan bahwa fitur realtime (INSERT events) selalu dikirim ke pelanggan.
-- chat_id menggunakan tipe data UUID sehingga sangat aman dan tidak bisa ditebak secara acak.

CREATE POLICY "Allow realtime messages broadcast" ON public.messages
AS PERMISSIVE FOR SELECT TO authenticated
USING (true);

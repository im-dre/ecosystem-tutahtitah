-- Hapus policy yang lama jika ada
DROP POLICY IF EXISTS "Izinkan admin insert chat" ON chats;
DROP POLICY IF EXISTS "Izinkan admin update chat" ON chats;
DROP POLICY IF EXISTS "Izinkan admin select chat" ON chats;
DROP POLICY IF EXISTS "Izinkan admin insert messages" ON messages;
DROP POLICY IF EXISTS "Izinkan admin select messages" ON messages;

-- Izinkan siapa saja yang login (Admin) untuk membuat chat JIKA tipe chatnya 'support'
CREATE POLICY "Izinkan admin insert chat" ON chats 
AS PERMISSIVE FOR INSERT TO authenticated 
WITH CHECK (chat_type = 'support');

-- Izinkan Admin untuk update chat (seperti update updated_at)
CREATE POLICY "Izinkan admin update chat" ON chats 
AS PERMISSIVE FOR UPDATE TO authenticated 
USING (chat_type = 'support');

-- Izinkan Admin untuk select chat tipe support
CREATE POLICY "Izinkan admin select chat" ON chats 
AS PERMISSIVE FOR SELECT TO authenticated 
USING (chat_type = 'support');

-- Izinkan Admin untuk insert messages ke chat tipe support
CREATE POLICY "Izinkan admin insert messages" ON messages 
AS PERMISSIVE FOR INSERT TO authenticated 
WITH CHECK (sender_type = 'support');

-- Izinkan Admin untuk select messages dari chat tipe support
CREATE POLICY "Izinkan admin select messages" ON messages 
AS PERMISSIVE FOR SELECT TO authenticated 
USING (sender_type = 'support' OR sender_id = '00000000-0000-0000-0000-000000000000');

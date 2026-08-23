-- ========================================================
-- MIGRATION: Add initiator_id for internal employee chats
-- ========================================================

-- 1. Tambah kolom initiator_id ke tabel chats
-- Kolom ini menyimpan employee_id (admin/kurir) yang memulai chat
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS initiator_id UUID;

-- 2. RLS Policies untuk employee bisa akses chats
-- (Menambah di atas yang sudah ada untuk support type)

-- Employee bisa INSERT chat yang dia mulai
DROP POLICY IF EXISTS "Employee can insert chat" ON chats;
CREATE POLICY "Employee can insert chat" ON chats
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.employees)
);

-- Employee bisa SELECT chat yang dia ada di dalamnya
DROP POLICY IF EXISTS "Employee can select their chats" ON chats;
CREATE POLICY "Employee can select their chats" ON chats
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.employees)
);

-- Employee bisa UPDATE chat yang dia ada di dalamnya  
DROP POLICY IF EXISTS "Employee can update their chats" ON chats;
CREATE POLICY "Employee can update their chats" ON chats
AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.employees)
);

-- Employee bisa INSERT messages
DROP POLICY IF EXISTS "Employee can insert messages" ON messages;
CREATE POLICY "Employee can insert messages" ON messages
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.employees)
);

-- Employee bisa SELECT messages
DROP POLICY IF EXISTS "Employee can select messages" ON messages;
CREATE POLICY "Employee can select messages" ON messages
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.employees)
);

-- Employee bisa UPDATE messages (untuk mark as read)
DROP POLICY IF EXISTS "Employee can update messages" ON messages;
CREATE POLICY "Employee can update messages" ON messages
AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.employees)
);

-- Perbaikan RLS Policies untuk akses Internal Chat (Karyawan)
-- Sebelumnya menggunakan `SELECT id FROM employees`, padahal `auth.uid()` harus dibandingkan dengan `auth_id`

-- 1. Employee bisa INSERT chat (semua tipe)
DROP POLICY IF EXISTS "Employee can insert chat" ON chats;
CREATE POLICY "Employee can insert chat" ON chats
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT auth_id FROM public.employees)
);

-- 2. Employee bisa SELECT chat
DROP POLICY IF EXISTS "Employee can select their chats" ON chats;
CREATE POLICY "Employee can select their chats" ON chats
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  auth.uid() IN (SELECT auth_id FROM public.employees)
);

-- 3. Employee bisa UPDATE chat
DROP POLICY IF EXISTS "Employee can update their chats" ON chats;
CREATE POLICY "Employee can update their chats" ON chats
AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  auth.uid() IN (SELECT auth_id FROM public.employees)
);

-- 4. Employee bisa INSERT messages
DROP POLICY IF EXISTS "Employee can insert messages" ON messages;
CREATE POLICY "Employee can insert messages" ON messages
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT auth_id FROM public.employees)
);

-- 5. Employee bisa SELECT messages
DROP POLICY IF EXISTS "Employee can select messages" ON messages;
CREATE POLICY "Employee can select messages" ON messages
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  auth.uid() IN (SELECT auth_id FROM public.employees)
);

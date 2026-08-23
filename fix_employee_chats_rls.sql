-- Fix Employee can update their chats RLS policy
-- Harus menggunakan auth_id, bukan id (karena auth.uid() mengembalikan auth_id dari tabel auth.users)

DROP POLICY IF EXISTS "Employee can update their chats" ON chats;
CREATE POLICY "Employee can update their chats" ON chats
AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  auth.uid() IN (SELECT auth_id FROM public.employees)
);

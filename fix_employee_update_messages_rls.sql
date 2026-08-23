-- Fix Employee can update messages RLS policy
-- Harus menggunakan auth_id, bukan id (karena auth.uid() mengembalikan auth_id)

DROP POLICY IF EXISTS "Employee can update messages" ON messages;
CREATE POLICY "Employee can update messages" ON messages
AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  auth.uid() IN (SELECT auth_id FROM public.employees)
);

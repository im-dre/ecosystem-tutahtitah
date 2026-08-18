-- Script untuk memperbaiki akses (RLS Policy) agar Customer bisa ngelakuin Soft Delete

-- 1. Izinkan customer nge-UPDATE tabel chats yang miliknya sendiri
DROP POLICY IF EXISTS "Izinkan customer update chat miliknya" ON chats;
CREATE POLICY "Izinkan customer update chat miliknya" 
ON chats 
FOR UPDATE 
USING (auth.uid() = customer_id);

-- 2. Izinkan customer nge-UPDATE pesan (messages) yang ada di dalam chat miliknya
-- (Ini penting biar customer bisa hapus riwayat pesan di layarnya, baik pesannya sendiri maupun dari merchant)
DROP POLICY IF EXISTS "Izinkan customer update pesan di chat miliknya" ON messages;
CREATE POLICY "Izinkan customer update pesan di chat miliknya" 
ON messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM chats 
    WHERE chats.id = messages.chat_id 
    AND chats.customer_id = auth.uid()
  )
);

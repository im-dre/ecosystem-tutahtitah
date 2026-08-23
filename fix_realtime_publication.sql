-- Fix Supabase Realtime Publication
-- Tambahkan tabel messages dan chats ke publication supabase_realtime
-- agar event INSERT/UPDATE bisa di-broadcast ke semua subscriber.

-- Aktifkan realtime untuk tabel messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Aktifkan realtime untuk tabel chats (untuk update last_message, etc)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Set REPLICA IDENTITY FULL untuk tabel messages agar event UPDATE
-- menyertakan data lengkap (termasuk nilai lama), diperlukan untuk
-- memantau perubahan is_read secara realtime.
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;

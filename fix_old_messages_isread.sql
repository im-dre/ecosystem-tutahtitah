-- Fix: Mark semua pesan lama sebagai sudah dibaca
-- Pesan dari employee/support ke sesama internal tidak perlu dianggap unread
-- Ini membersihkan data historis sebelum fitur is_read diimplementasikan

-- 1. Mark semua pesan dari employee/support sebagai sudah dibaca
--    (pesan dari admin/kurir ke customer sudah selesai dibaca sejak dibuka)
UPDATE public.messages
SET is_read = true
WHERE is_read = false
  AND (sender_type = 'employee' OR sender_type = 'support');

-- 2. Mark semua pesan yang dibuat lebih dari 1 jam lalu sebagai sudah dibaca
--    (asumsi: pesan lama pasti sudah pernah dilihat)
UPDATE public.messages
SET is_read = true
WHERE is_read = false
  AND created_at < NOW() - INTERVAL '1 hour';

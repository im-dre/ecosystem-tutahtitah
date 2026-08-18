-- Menambahkan fitur soft delete untuk tabel chats dan messages
-- Sehingga pengguna (customer) bisa menghapus riwayat tanpa benar-benar menghilangkan data dari database

-- 1. Tambah kolom soft delete untuk tabel chats
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS is_deleted_by_customer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_deleted_by_participant BOOLEAN DEFAULT FALSE; -- Opsional buat merchant/kurir kedepannya

-- 2. Tambah kolom soft delete untuk tabel messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_deleted_by_customer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_deleted_by_participant BOOLEAN DEFAULT FALSE; -- Opsional buat merchant/kurir kedepannya

-- Optional: Create index to improve performance when querying active chats/messages
CREATE INDEX IF NOT EXISTS idx_chats_customer_active ON chats(customer_id) WHERE is_deleted_by_customer = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_chat_active ON messages(chat_id) WHERE is_deleted_by_customer = FALSE;

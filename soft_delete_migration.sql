-- 1. Tambahkan kolom is_deleted ke tabel orders dengan default false
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Karena defaultnya false, semua orderan lama otomatis akan bernilai false.

-- 2. Hapus policy DELETE lama (termasuk yang baru kita buat untuk super admin)
DROP POLICY IF EXISTS "Enable delete for admin users only" ON public.orders;
DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Hanya Super Admin yang bisa menghapus permanen orderan" ON public.orders;

-- 3. (Opsional) Jika ingin benar-benar mengamankan database dari hard delete:
-- Pastikan tidak ada satupun role (selain postgres superuser bawaan server) yang bisa menjalankan perintah DELETE.
-- Mulai sekarang, Super Admin pun hanya melakukan operasi UPDATE (is_deleted = true).
-- Hak akses UPDATE untuk Super Admin sudah dicakup oleh Policy UPDATE yang ada sebelumnya,
-- karena admin sudah memiliki hak untuk mengupdate baris di tabel orders.

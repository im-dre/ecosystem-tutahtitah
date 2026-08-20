-- Menambahkan kolom order_id ke tabel reports dan menghubungkannya dengan tabel orders
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE;

-- Force reload schema cache (jaga-jaga)
NOTIFY pgrst, 'reload schema';

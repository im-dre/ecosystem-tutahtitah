-- 1. Tambahkan kolom is_super_admin ke tabel employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 2. Update status 3 admin utama menjadi super admin
UPDATE public.employees 
SET is_super_admin = true 
WHERE email IN (
  'ikbal-admin@tutahtitah.id',
  'hafid-admin@tutahtitah.id',
  'jihad-admin@tutahtitah.id'
);

-- 3. Hapus (drop) policy DELETE lama di tabel orders jika ada
DROP POLICY IF EXISTS "Enable delete for admin users only" ON public.orders;
DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;

-- 4. Buat policy DELETE baru yang HANYA mengizinkan super admin
-- Menggunakan subquery untuk mengecek tabel employees berdasarkan auth.uid()
CREATE POLICY "Hanya Super Admin yang bisa menghapus permanen orderan" 
ON public.orders
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND is_super_admin = true
  )
);

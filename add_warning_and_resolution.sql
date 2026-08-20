-- Tambah kolom warning_points di employees (untuk kurir)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS warning_points INT DEFAULT 0;

-- Tambah kolom warning_points di merchants (untuk toko/merchant)
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS warning_points INT DEFAULT 0;

-- Tambah kolom resolution_action di reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_action TEXT;

-- Force reload schema cache (jaga-jaga)
NOTIFY pgrst, 'reload schema';

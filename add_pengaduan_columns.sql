-- Menambahkan kolom-kolom baru ke tabel reports untuk keperluan fitur Pengaduan di Admin & Kurir
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS target_feedback TEXT,
ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMP WITH TIME ZONE;

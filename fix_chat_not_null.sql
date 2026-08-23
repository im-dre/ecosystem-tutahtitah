-- Mengubah kolom customer_id menjadi opsional (Boleh NULL)
-- Karena untuk chat internal (admin ke kurir, dsb) tidak ada customer yang terlibat
ALTER TABLE public.chats 
ALTER COLUMN customer_id DROP NOT NULL;

-- Berjaga-jaga jika participant_id juga ada NOT NULL
ALTER TABLE public.chats
ALTER COLUMN participant_id DROP NOT NULL;

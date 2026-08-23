-- Step 1: Hapus data duplikat dulu, pertahankan yang paling lama (created_at terkecil)
DELETE FROM public.reports
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY order_id, customer_id, target_id, target_type
             ORDER BY created_at ASC
           ) AS rn
    FROM public.reports
    WHERE order_id IS NOT NULL
  ) sub
  WHERE sub.rn > 1
);

-- Step 2: Baru pasang unique constraint-nya
ALTER TABLE public.reports 
ADD CONSTRAINT reports_unique_per_order_target 
UNIQUE (order_id, customer_id, target_id, target_type);

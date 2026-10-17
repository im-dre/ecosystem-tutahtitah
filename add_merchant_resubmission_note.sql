-- Fitur Banding / Ajukan Kembali UMKM
-- Jalankan setelah portal_umkm_migration_v1.sql.

BEGIN;

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS resubmission_note text;

-- Hapus signature lama agar default argument pada signature baru tidak ambigu.
DROP FUNCTION IF EXISTS public.submit_merchant_for_review(uuid);

CREATE OR REPLACE FUNCTION public.submit_merchant_for_review(
  p_merchant_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('app.merchant_lifecycle', 'on', true);

  UPDATE public.merchants
  SET status = 'pending_review',
      submitted_at = now(),
      rejected_at = NULL,
      rejected_by = NULL,
      resubmission_note = NULLIF(trim(p_note), '')
  WHERE id = p_merchant_id
    AND owner_id = auth.uid()
    AND status IN ('draft', 'rejected', 'suspended');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant tidak ditemukan atau belum dapat diajukan'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_merchant_for_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_merchant_for_review(uuid, text) TO authenticated;

COMMIT;
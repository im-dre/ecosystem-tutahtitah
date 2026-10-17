-- Universal Activity Timeline untuk merchant.
-- Jalankan setelah portal_umkm_migration_v1.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.merchant_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_activities_merchant_created_idx
  ON public.merchant_activities (merchant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_merchant_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees AS e
    WHERE e.id = auth.uid() AND e.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.log_merchant_activity(
  p_merchant_id uuid,
  p_type text,
  p_title text,
  p_desc text DEFAULT NULL
)
RETURNS public.merchant_activities
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_activity public.merchant_activities;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.merchants AS m
    WHERE m.id = p_merchant_id
      AND (m.owner_id = auth.uid() OR public.is_merchant_admin())
  ) THEN
    RAISE EXCEPTION 'Akses merchant activity ditolak' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.merchant_activities (merchant_id, activity_type, title, description)
  VALUES (p_merchant_id, NULLIF(trim(p_type), ''), NULLIF(trim(p_title), ''), NULLIF(trim(p_desc), ''))
  RETURNING * INTO v_activity;
  RETURN v_activity;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_merchant_status_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_reason text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_reason := CASE
      WHEN NEW.status = 'rejected' THEN NEW.rejection_reason
      WHEN NEW.status = 'suspended' THEN NEW.suspension_reason
      ELSE NEW.resubmission_note
    END;
    INSERT INTO public.merchant_activities (merchant_id, activity_type, title, description)
    VALUES (NEW.id, 'STATUS_CHANGE', 'Perubahan Status Toko',
      concat('Status berubah dari ', OLD.status::text, ' menjadi ', NEW.status::text,
        CASE WHEN NULLIF(trim(v_reason), '') IS NOT NULL THEN concat('. Catatan: ', trim(v_reason)) ELSE '' END));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_merchant_status_activity ON public.merchants;
CREATE TRIGGER trg_log_merchant_status_activity
AFTER UPDATE OF status ON public.merchants
FOR EACH ROW EXECUTE FUNCTION public.log_merchant_status_activity();

CREATE OR REPLACE FUNCTION public.log_product_added_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.merchant_activities (merchant_id, activity_type, title, description)
  VALUES (NEW.merchant_id, 'PRODUCT_ADDED', 'Produk Baru Ditambahkan', concat('Nama produk: ', NEW.name));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_product_added_activity ON public.products;
CREATE TRIGGER trg_log_product_added_activity
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_product_added_activity();

ALTER TABLE public.merchant_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Merchant can read own activities" ON public.merchant_activities;
CREATE POLICY "Merchant can read own activities" ON public.merchant_activities
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.merchants AS m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Admin can read all activities" ON public.merchant_activities;
CREATE POLICY "Admin can read all activities" ON public.merchant_activities
FOR SELECT TO authenticated USING (public.is_merchant_admin());

REVOKE ALL ON public.merchant_activities FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.merchant_activities TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_merchant_activity(uuid, text, text, text) TO authenticated;

COMMIT;
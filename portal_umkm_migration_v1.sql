-- portal_umkm_migration_v1.sql
-- Fase 1: canonical merchant lifecycle + audit columns
-- Fase 2: lifecycle RPC yang atomic dan tidak dapat dipalsukan dari client
-- Jalankan setelah tabel public.merchants dan public.employees tersedia.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Canonical status enum dan audit columns
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.merchant_status AS ENUM (
    'draft',
    'pending_review',
    'rejected',
    'approved',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Normalisasi sementara semua nilai legacy sebelum kolom dikonversi ke enum.
-- Nilai null atau legacy yang tidak dikenal diturunkan ke draft, bukan dibiarkan
-- menjadi status yang tidak dapat diproses oleh lifecycle baru.
UPDATE public.merchants
SET status = CASE
  WHEN lower(trim(coalesce(status, ''))) IN ('verified', 'active', 'published', 'approved')
    THEN 'approved'
  WHEN lower(trim(coalesce(status, ''))) IN ('pending', 'pending_review', 'under_review', 'review')
    THEN 'pending_review'
  WHEN lower(trim(coalesce(status, ''))) IN ('rejected', 'declined', 'denied')
    THEN 'rejected'
  WHEN lower(trim(coalesce(status, ''))) IN ('suspended', 'banned', 'blocked', 'inactive')
    THEN 'suspended'
  WHEN lower(trim(coalesce(status, ''))) IN ('draft', 'new', '')
    THEN 'draft'
  ELSE 'draft'
END;

-- Kolom lama di schema saat ini bertipe text/varchar. Konversi dibuat eksplisit
-- agar migration aman bila dijalankan ulang setelah sebagian perubahan berhasil.
DO $$
DECLARE
  v_status_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_status_type
  FROM pg_attribute AS a
  JOIN pg_class AS c ON c.oid = a.attrelid
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'merchants'
    AND a.attname = 'status'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF v_status_type IS NOT NULL AND v_status_type <> 'public.merchant_status' THEN
    ALTER TABLE public.merchants
      ALTER COLUMN status TYPE public.merchant_status
      USING status::public.merchant_status;
  END IF;
END
$$;

ALTER TABLE public.merchants
  ALTER COLUMN status SET DEFAULT 'draft'::public.merchant_status,
  ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS merchants_status_idx
  ON public.merchants (status);
CREATE INDEX IF NOT EXISTS merchants_owner_id_idx
  ON public.merchants (owner_id);

-- -----------------------------------------------------------------------------
-- 2. Security helpers dan guard trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_merchant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees AS e
    WHERE e.auth_id = auth.uid()
      AND (e.role IN ('admin', 'superadmin') OR (e.role = 'admin' AND e.is_super_admin = true))
  );
$$;

REVOKE ALL ON FUNCTION public.is_merchant_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_merchant_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_merchant_lifecycle_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id tidak boleh diubah' USING ERRCODE = '42501';
  END IF;

  IF current_setting('app.merchant_lifecycle', true) IS DISTINCT FROM 'on'
     AND (
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.submitted_at IS DISTINCT FROM OLD.submitted_at OR
       NEW.approved_at IS DISTINCT FROM OLD.approved_at OR
       NEW.approved_by IS DISTINCT FROM OLD.approved_by OR
       NEW.rejected_at IS DISTINCT FROM OLD.rejected_at OR
       NEW.rejected_by IS DISTINCT FROM OLD.rejected_by OR
       NEW.suspended_at IS DISTINCT FROM OLD.suspended_at OR
       NEW.suspended_by IS DISTINCT FROM OLD.suspended_by OR
       NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
     ) THEN
    RAISE EXCEPTION 'Lifecycle merchant hanya boleh diubah melalui RPC resmi'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_merchant_lifecycle_columns ON public.merchants;
CREATE TRIGGER trg_guard_merchant_lifecycle_columns
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_merchant_lifecycle_columns();

-- -----------------------------------------------------------------------------
-- 3. Lifecycle RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_merchant(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login diperlukan' USING ERRCODE = '42501';
  END IF;
  IF nullif(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama merchant wajib diisi' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.merchants (owner_id, name, status)
  VALUES (auth.uid(), trim(p_name), 'draft')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_merchant_for_review(p_merchant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('app.merchant_lifecycle', 'on', true);
  UPDATE public.merchants
  SET status = 'pending_review', submitted_at = now(),
      rejected_at = NULL, rejected_by = NULL
  WHERE id = p_merchant_id AND owner_id = auth.uid() AND status IN ('draft', 'rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Merchant tidak ditemukan atau belum dapat diajukan' USING ERRCODE = 'P0002'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_merchant(p_merchant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_merchant_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan' USING ERRCODE = '42501'; END IF;
  PERFORM set_config('app.merchant_lifecycle', 'on', true);
  UPDATE public.merchants
  SET status = 'approved', approved_at = now(), approved_by = auth.uid(),
      rejected_at = NULL, rejected_by = NULL, rejection_reason = NULL,
      suspended_at = NULL, suspended_by = NULL, suspension_reason = NULL
  WHERE id = p_merchant_id AND status = 'pending_review';
  IF NOT FOUND THEN RAISE EXCEPTION 'Merchant tidak ditemukan atau bukan pending_review' USING ERRCODE = 'P0002'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_merchant(p_merchant_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_merchant_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan' USING ERRCODE = '42501'; END IF;
  IF nullif(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'Alasan penolakan wajib diisi' USING ERRCODE = '22023'; END IF;
  PERFORM set_config('app.merchant_lifecycle', 'on', true);
  UPDATE public.merchants
  SET status = 'rejected', rejected_at = now(), rejected_by = auth.uid(),
      rejection_reason = trim(p_reason)
  WHERE id = p_merchant_id AND status = 'pending_review';
  IF NOT FOUND THEN RAISE EXCEPTION 'Merchant tidak ditemukan atau bukan pending_review' USING ERRCODE = 'P0002'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_suspend_merchant(p_merchant_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_merchant_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan' USING ERRCODE = '42501'; END IF;
  IF nullif(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'Alasan suspend wajib diisi' USING ERRCODE = '22023'; END IF;
  PERFORM set_config('app.merchant_lifecycle', 'on', true);
  UPDATE public.merchants
  SET status = 'suspended', suspended_at = now(), suspended_by = auth.uid(),
      suspension_reason = trim(p_reason)
  WHERE id = p_merchant_id AND status IN ('approved', 'pending_review');
  IF NOT FOUND THEN RAISE EXCEPTION 'Merchant tidak ditemukan atau tidak dapat di-suspend' USING ERRCODE = 'P0002'; END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. RLS dan privilege boundary
-- -----------------------------------------------------------------------------
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchant owner can read own profile" ON public.merchants;
CREATE POLICY "Merchant owner can read own profile" ON public.merchants
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Admin can read all merchants" ON public.merchants;
CREATE POLICY "Admin can read all merchants" ON public.merchants
  FOR SELECT TO authenticated USING (public.is_merchant_admin());

DROP POLICY IF EXISTS "Merchant owner can update profile only" ON public.merchants;
CREATE POLICY "Merchant owner can update profile only" ON public.merchants
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

REVOKE INSERT, DELETE ON public.merchants FROM authenticated;
REVOKE UPDATE ON public.merchants FROM authenticated;
GRANT UPDATE (name, description, address, logo_url, banner_url, operating_hours, is_custom_order)
  ON public.merchants TO authenticated;

REVOKE ALL ON FUNCTION public.register_merchant(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_merchant_for_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_approve_merchant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_merchant(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_suspend_merchant(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_merchant(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_merchant_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_merchant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_merchant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_merchant(uuid, text) TO authenticated;

COMMIT;
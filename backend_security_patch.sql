-- backend_security_patch.sql
-- Database hardening patch untuk Supabase.
-- Prasyarat: public.merchants, public.products, public.orders, dan
-- public.is_merchant_admin() sudah tersedia.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. RPC pemulihan merchant yang suspended
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unsuspend_merchant(p_merchant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_merchant_admin() THEN
    RAISE EXCEPTION 'Akses admin diperlukan' USING ERRCODE = '42501';
  END IF;

  -- Wajib melewati jalur lifecycle resmi agar guard trigger tidak dibypass.
  PERFORM set_config('app.merchant_lifecycle', 'on', true);

  UPDATE public.merchants
  SET status = 'approved'::public.merchant_status,
      suspended_at = NULL,
      suspended_by = NULL,
      suspension_reason = NULL
  WHERE id = p_merchant_id
    AND status = 'suspended'::public.merchant_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant tidak ditemukan atau tidak sedang suspended'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- Jangan biarkan PUBLIC/anon mengeksekusi RPC administratif.
REVOKE ALL ON FUNCTION public.admin_unsuspend_merchant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_merchant(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Optimasi pencarian ILIKE dengan pg_trgm + GIN
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Riwayat order/admin dan pencarian kurir.
CREATE INDEX IF NOT EXISTS orders_customer_name_trgm_idx
  ON public.orders USING gin (customer_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS orders_customer_wa_trgm_idx
  ON public.orders USING gin (customer_wa gin_trgm_ops);

-- Pencarian katalog produk dan merchant ke depannya.
CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS merchants_name_trgm_idx
  ON public.merchants USING gin (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 3. Zero-leakage privilege boundary untuk role anon
-- -----------------------------------------------------------------------------
-- RLS tetap berlaku, tetapi privilege table-level ini memastikan anon tidak
-- dapat melakukan SELECT langsung ke tabel sumber utama.
REVOKE SELECT ON TABLE public.merchants FROM anon;
REVOKE SELECT ON TABLE public.products FROM anon;

COMMIT;

-- Catatan:
-- Akses katalog publik sebaiknya tetap melalui view allowlist seperti
-- public.public_catalog_merchants dan public.public_catalog_products, bukan
-- melalui SELECT langsung ke tabel merchants/products.
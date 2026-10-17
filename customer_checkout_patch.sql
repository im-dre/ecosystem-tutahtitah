-- Tahap 2: customer checkout melalui RPC dan guard lifecycle order.
-- Jalankan setelah order_schema_migration.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_order_status_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND current_setting('app.order_lifecycle', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Perubahan status order wajib melalui lifecycle resmi'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_order_status_update ON public.orders;
CREATE TRIGGER guard_order_status_update
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_order_status_update();

CREATE OR REPLACE FUNCTION public.customer_checkout(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_wa text,
  p_customer_address text,
  p_tipe_layanan text,
  p_merchant_id uuid,
  p_items jsonb,
  p_total_amount numeric,
  p_raw_order_text text,
  p_draft_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id bigint;
BEGIN
  IF auth.uid() IS NULL OR p_customer_id IS DISTINCT FROM (
    SELECT c.id FROM public.customers AS c WHERE c.auth_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Customer tidak valid' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Items checkout harus berupa array JSON' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.order_lifecycle', 'on', true);

  INSERT INTO public.orders (
    customer_id, customer_name, customer_wa, customer_address,
    tipe_layanan, merchant_id, items, total_amount, status, raw_order_text
  )
  VALUES (
    p_customer_id, p_customer_name, p_customer_wa, p_customer_address,
    p_tipe_layanan, p_merchant_id, p_items, p_total_amount,
    'pending'::public.order_status_enum, p_raw_order_text
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, price_per_item, quantity, subtotal
  )
  SELECT
    v_order_id,
    COALESCE(item->>'product_id', item->>'id')::uuid,
    COALESCE(NULLIF(item->>'price_per_item', '')::numeric,
             NULLIF(item->>'price', '')::numeric),
    COALESCE(NULLIF(item->>'quantity', '')::integer,
             NULLIF(item->>'qty', '')::integer),
    COALESCE(
      NULLIF(item->>'subtotal', '')::numeric,
      COALESCE(NULLIF(item->>'price_per_item', '')::numeric,
               NULLIF(item->>'price', '')::numeric)
        * COALESCE(NULLIF(item->>'quantity', '')::integer,
                   NULLIF(item->>'qty', '')::integer)
    )
  FROM jsonb_array_elements(p_items) AS entry(item)
  WHERE COALESCE(item->>'product_id', item->>'id') ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    AND (item->>'price_per_item' IS NOT NULL OR item->>'price' IS NOT NULL)
    AND (item->>'quantity' IS NOT NULL OR item->>'qty' IS NOT NULL)
    AND COALESCE(NULLIF(item->>'quantity', '')::integer,
                 NULLIF(item->>'qty', '')::integer) > 0;

  IF p_draft_id IS NOT NULL THEN
    DELETE FROM public.draft_orders
    WHERE id = p_draft_id
      AND auth_id = auth.uid();
  END IF;

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_set_order_favorite(
  p_order_id bigint,
  p_is_favorite boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.orders
  SET is_favorite = p_is_favorite
  WHERE id = p_order_id
    AND customer_id = (
      SELECT c.id FROM public.customers AS c WHERE c.auth_id = auth.uid()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order tidak ditemukan' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.customer_checkout(
  uuid, text, text, text, text, uuid, jsonb, numeric, text, uuid
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_checkout(
  uuid, text, text, text, text, uuid, jsonb, numeric, text, uuid
) TO authenticated;

REVOKE ALL ON FUNCTION public.customer_set_order_favorite(bigint, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_set_order_favorite(bigint, boolean) TO authenticated;

COMMIT;
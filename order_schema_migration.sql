-- Order Flow Refactoring - Tahap 1 & 2
-- Jalankan satu kali pada database Supabase.

BEGIN;

-- Status resmi order. Status legacy dipetakan di bawah sebelum tipe kolom diganti.
DO $$
BEGIN
  CREATE TYPE public.order_status_enum AS ENUM (
    'pending',
    'processing',
    'hold',
    'waiting_customer',
    'delivering',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Kolom yang dipakai oleh input order manual versi aplikasi internal.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inputted_by text;

-- Normalisasi nilai lama sebelum cast ke enum.
UPDATE public.orders
SET status = CASE lower(trim(status::text))
  WHEN 'new' THEN 'pending'
  WHEN 'open' THEN 'pending'
  WHEN 'admin_accepted' THEN 'processing'
  WHEN 'merchant_accepted' THEN 'processing'
  WHEN 'process' THEN 'processing'
  WHEN 'searching_courier' THEN 'processing'
  WHEN 'courier_found' THEN 'processing'
  WHEN 'picking_up' THEN 'processing'
  WHEN 'item_ready' THEN 'processing'
  WHEN 'on_delivery' THEN 'delivering'
  WHEN 'rejected' THEN 'cancelled'
  WHEN 'unreachable' THEN 'cancelled'
  WHEN 'failed' THEN 'cancelled'
  WHEN 'done' THEN 'completed'
  WHEN 'success' THEN 'completed'
  WHEN 'pending' THEN 'pending'
  WHEN 'processing' THEN 'processing'
  WHEN 'hold' THEN 'hold'
  WHEN 'waiting_customer' THEN 'waiting_customer'
  WHEN 'delivering' THEN 'delivering'
  WHEN 'completed' THEN 'completed'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END
WHERE status IS NOT NULL;

ALTER TABLE public.orders
  ALTER COLUMN status TYPE public.order_status_enum
  USING status::text::public.order_status_enum;

-- order_items: lengkapi schema tanpa mengganggu data yang sudah ada.
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  price_per_item numeric NOT NULL,
  quantity integer NOT NULL,
  subtotal numeric NOT NULL
);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS order_id bigint,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS price_per_item numeric,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS subtotal numeric;

CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);

-- RPC atomik untuk input order manual dan item terstruktur opsional.
CREATE OR REPLACE FUNCTION public.admin_create_manual_order(
  customer_name text,
  customer_wa text,
  customer_address text,
  raw_order_text text,
  tipe_layanan text,
  status public.order_status_enum,
  total_price numeric,
  delivery_fee numeric,
  image_url text,
  assigned_courier_id uuid,
  dispatched_at timestamptz,
  inputted_by text,
  items jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  created_order_id bigint;
BEGIN
  INSERT INTO public.orders (
    customer_name,
    customer_wa,
    customer_address,
    raw_order_text,
    tipe_layanan,
    status,
    total_price,
    delivery_fee,
    image_url,
    assigned_courier_id,
    dispatched_at,
    inputted_by
  )
  VALUES (
    customer_name,
    customer_wa,
    customer_address,
    raw_order_text,
    tipe_layanan,
    status,
    total_price,
    delivery_fee,
    image_url,
    assigned_courier_id,
    dispatched_at,
    inputted_by
  )
  RETURNING id INTO created_order_id;

  IF jsonb_typeof(items) = 'array' THEN
    INSERT INTO public.order_items (
      order_id, product_id, price_per_item, quantity, subtotal
    )
    SELECT
      created_order_id,
      item.product_id,
      item.price_per_item,
      item.quantity,
      COALESCE(item.subtotal, item.price_per_item * item.quantity)
    FROM jsonb_to_recordset(items) AS item(
      product_id uuid,
      price_per_item numeric,
      quantity integer,
      subtotal numeric
    )
    WHERE item.product_id IS NOT NULL
      AND item.price_per_item IS NOT NULL
      AND item.quantity IS NOT NULL
      AND item.quantity > 0;
  END IF;

  RETURN created_order_id;
END;
$$;

COMMENT ON FUNCTION public.admin_create_manual_order(
  text, text, text, text, text, public.order_status_enum, numeric, numeric,
  text, uuid, timestamptz, text, jsonb
) IS 'Atomically creates an internal manual order and optional order_items.';

COMMIT;
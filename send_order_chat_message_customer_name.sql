-- Keeps order chat creation and message insertion atomic while preserving the
-- real customer identity in message metadata for merchant-side rendering.
CREATE OR REPLACE FUNCTION public.send_order_chat_message(
  p_order_id bigint,
  p_chat_type text,
  p_sender_type text,
  p_content text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order_customer_id uuid;
  v_order_merchant_id uuid;
  v_customer_name text;
  v_merchant_name text;
  v_chat_id uuid;
  v_sender_name text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF p_chat_type <> 'customer_merchant' OR p_sender_type NOT IN ('customer', 'merchant') THEN
    RAISE EXCEPTION 'Invalid order chat type or sender type';
  END IF;

  IF btrim(COALESCE(p_content, '')) = '' THEN
    RAISE EXCEPTION 'Message content is required';
  END IF;

  SELECT customer_id, merchant_id
  INTO v_order_customer_id, v_order_merchant_id
  FROM public.orders
  WHERE id = p_order_id
    AND COALESCE(is_deleted, false) = false;

  IF NOT FOUND OR v_order_customer_id IS NULL OR v_order_merchant_id IS NULL THEN
    RAISE EXCEPTION 'Order chat is not available';
  END IF;

  IF p_sender_type = 'customer' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.customers
      WHERE id = v_order_customer_id
        AND auth_id = v_actor_id
    ) THEN
      RAISE EXCEPTION 'Only the order customer may send this message';
    END IF;

    SELECT name
    INTO v_customer_name
    FROM public.customers
    WHERE id = v_order_customer_id;

    v_sender_name := v_customer_name;
  ELSE
    SELECT name
    INTO v_merchant_name
    FROM public.merchants
    WHERE id = v_order_merchant_id
      AND owner_id = v_actor_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Only the order merchant may send this message';
    END IF;

    v_sender_name := v_merchant_name;
  END IF;

  SELECT id
  INTO v_chat_id
  FROM public.chats
  WHERE order_id = p_order_id
    AND chat_type = p_chat_type
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (chat_type, customer_id, participant_id, order_id)
    VALUES (p_chat_type, v_actor_id, v_order_merchant_id, p_order_id)
    RETURNING id INTO v_chat_id;
  END IF;

  INSERT INTO public.messages (chat_id, sender_id, sender_type, content, metadata)
  VALUES (
    v_chat_id,
    v_actor_id,
    p_sender_type,
    btrim(p_content),
    jsonb_build_object('sender_name', COALESCE(NULLIF(btrim(v_sender_name), ''), 'Pengguna'))
      || COALESCE(p_metadata, '{}'::jsonb)
  );

  UPDATE public.chats
  SET updated_at = now()
  WHERE id = v_chat_id;

  RETURN v_chat_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_order_chat_message(bigint, text, text, text, jsonb) TO authenticated;
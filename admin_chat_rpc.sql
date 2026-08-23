CREATE OR REPLACE FUNCTION admin_resolve_report_chat(
  p_customer_id uuid,
  p_content text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  -- 1. Cari chat support yang ada
  SELECT id INTO v_chat_id
  FROM chats
  WHERE customer_id = p_customer_id AND chat_type = 'support'
  LIMIT 1;

  -- 2. Jika tidak ada, buat baru
  IF v_chat_id IS NULL THEN
    INSERT INTO chats (chat_type, customer_id, participant_id)
    VALUES ('support', p_customer_id, '00000000-0000-0000-0000-000000000000')
    RETURNING id INTO v_chat_id;
  END IF;

  -- 3. Insert pesan
  INSERT INTO messages (chat_id, sender_id, sender_type, content)
  VALUES (v_chat_id, '00000000-0000-0000-0000-000000000000', 'support', p_content);

  -- 4. Update chat (biar posisinya naik di daftar chat customer)
  UPDATE chats SET updated_at = now() WHERE id = v_chat_id;

  RETURN v_chat_id;
END;
$$;

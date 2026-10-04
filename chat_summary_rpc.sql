-- Fase 2: ringkasan daftar chat diproses sepenuhnya di database.
-- Tidak mengirim seluruh histori messages ke client.
CREATE OR REPLACE FUNCTION public.get_chat_summaries()
RETURNS TABLE (
  id uuid,
  chat_type text,
  participant_id uuid,
  initiator_id uuid,
  customer_id uuid,
  status text,
  display_name text,
  display_avatar text,
  display_subtitle text,
  last_message text,
  last_time timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee public.employees%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT e.* INTO v_employee
  FROM public.employees AS e
  WHERE e.auth_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized employee';
  END IF;

  v_is_admin := v_employee.role = 'admin' OR COALESCE(v_employee.is_super_admin, false);

  RETURN QUERY
  SELECT
    c.id,
    c.chat_type::text,
    c.participant_id,
    c.initiator_id,
    c.customer_id,
    c.status::text,
    CASE
      WHEN c.chat_type = 'support' THEN COALESCE(cu.name, cu.phone, 'Customer')
      WHEN c.chat_type IN ('admin_merchant', 'courier_merchant') THEN COALESCE(me.name, 'Mitra Toko')
      ELSE COALESCE(other_employee.full_name, 'Admin/Kurir')
    END,
    CASE WHEN c.chat_type IN ('admin_merchant', 'courier_merchant') THEN me.logo_url ELSE NULL END,
    CASE
      WHEN c.chat_type = 'support' THEN 'Customer'
      WHEN c.chat_type IN ('admin_merchant', 'courier_merchant') THEN 'Mitra'
      WHEN other_employee.role = 'admin' OR COALESCE(other_employee.is_super_admin, false) THEN 'Admin'
      ELSE 'Kurir'
    END,
    COALESCE(last_msg.content, CASE WHEN last_msg.metadata IS NOT NULL THEN '[Attachment]' ELSE '' END),
    last_msg.created_at,
    COALESCE(unread.total, 0)
  FROM public.chats AS c
  LEFT JOIN public.customers AS cu ON cu.auth_id = c.customer_id
  LEFT JOIN public.merchants AS me ON me.id = c.participant_id
  LEFT JOIN public.employees AS other_employee
    ON other_employee.id = CASE WHEN c.participant_id = v_employee.id THEN c.initiator_id ELSE c.participant_id END
  LEFT JOIN LATERAL (
    SELECT m.content, m.metadata, m.created_at
    FROM public.messages AS m
    WHERE m.chat_id = c.id
      AND COALESCE(m.is_deleted_by_participant, false) = false
    ORDER BY m.created_at DESC NULLS LAST
    LIMIT 1
  ) AS last_msg ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS total
    FROM public.messages AS m
    WHERE m.chat_id = c.id
      AND COALESCE(m.is_deleted_by_participant, false) = false
      AND COALESCE(m.is_read, false) = false
      AND m.sender_id <> v_employee.id
  ) AS unread ON true
  WHERE COALESCE(c.is_deleted_by_participant, false) = false
    AND (
      v_is_admin
      OR c.participant_id = v_employee.id
      OR c.initiator_id = v_employee.id
    )
  ORDER BY last_msg.created_at DESC NULLS LAST, c.updated_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_summaries() TO authenticated;

-- Global Inbox hanya memanggil fungsi ini untuk chat baru yang belum ada di
-- state perangkat. Kontraknya satu row terotorisasi, bukan refetch seluruh inbox.
CREATE OR REPLACE FUNCTION public.get_chat_summary(p_chat_id uuid)
RETURNS TABLE (
  id uuid,
  chat_type text,
  participant_id uuid,
  initiator_id uuid,
  customer_id uuid,
  status text,
  display_name text,
  display_avatar text,
  display_subtitle text,
  last_message text,
  last_time timestamptz,
  unread_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    summaries.id,
    summaries.chat_type,
    summaries.participant_id,
    summaries.initiator_id,
    summaries.customer_id,
    summaries.status,
    summaries.display_name,
    summaries.display_avatar,
    summaries.display_subtitle,
    summaries.last_message,
    summaries.last_time,
    summaries.unread_count
  FROM public.get_chat_summaries() AS summaries
  WHERE id = p_chat_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_chat_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_summary(uuid) TO authenticated;

-- Mendukung kontrak Fase 2: identity employee diambil dari JWT, bukan input client.
DROP FUNCTION IF EXISTS public.rpc_soft_delete_all_chats(uuid);

CREATE OR REPLACE FUNCTION public.rpc_soft_delete_all_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT e.id INTO v_employee_id
  FROM public.employees AS e
  WHERE e.auth_id = auth.uid();

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized employee';
  END IF;

  UPDATE public.chats AS c
  SET is_deleted_by_participant = true
  WHERE c.participant_id = v_employee_id OR c.initiator_id = v_employee_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_soft_delete_all_chats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_soft_delete_all_chats() TO authenticated;
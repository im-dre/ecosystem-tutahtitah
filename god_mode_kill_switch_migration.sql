-- ================================================================
-- GOD MODE (admin monitoring) + KILL SWITCH (disable chat)
-- Run this file once through a Supabase migration / SQL Editor.
-- Only SELECT policies are added below; existing INSERT/UPDATE/DELETE
-- policies are intentionally left untouched.
-- ================================================================

-- Admin check is based on the authenticated user's employees.auth_id,
-- never on an id supplied by the client.
CREATE OR REPLACE FUNCTION public.is_admin_employee()
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
      AND e.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_employee() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_employee() TO authenticated;

-- Kill-switch state. Existing chats remain enabled by default.
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS is_disabled_by_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chats_admin_monitoring
  ON public.chats (updated_at DESC, id DESC);

-- Read-only God Mode policies. These are separate permissive SELECT policies,
-- so no existing user-facing INSERT/UPDATE/DELETE policy is altered.
DROP POLICY IF EXISTS "Admin can monitor all chats" ON public.chats;
CREATE POLICY "Admin can monitor all chats"
  ON public.chats
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.is_admin_employee());

DROP POLICY IF EXISTS "Admin can monitor all messages" ON public.messages;
CREATE POLICY "Admin can monitor all messages"
  ON public.messages
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.is_admin_employee());

-- Kept explicit even if another public policy already grants image reads.
DROP POLICY IF EXISTS "Admin can monitor all chat images" ON storage.objects;
CREATE POLICY "Admin can monitor all chat images"
  ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND public.is_admin_employee()
  );

-- Block every new message after a room is disabled. The narrow setting-based
-- exception is only set inside rpc_disable_chat_by_admin() to write its audit
-- system message; clients cannot use it through the REST API.
CREATE OR REPLACE FUNCTION public.prevent_message_in_disabled_chat()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.chats AS c
    WHERE c.id = NEW.chat_id
      AND c.is_disabled_by_admin = true
  )
  AND NOT (
    NEW.sender_type = 'system'
    AND current_setting('app.allow_disabled_system_message', true) = 'on'
  ) THEN
    RAISE EXCEPTION 'Chat dinonaktifkan sistem'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_message_in_disabled_chat ON public.messages;
CREATE TRIGGER trg_prevent_message_in_disabled_chat
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_message_in_disabled_chat();

-- Atomic admin-only kill switch. SECURITY DEFINER is required because the
-- existing normal chat UPDATE policy is deliberately not changed.
CREATE OR REPLACE FUNCTION public.rpc_disable_chat_by_admin(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin_employee() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.chats
  SET is_disabled_by_admin = true,
      updated_at = now()
  WHERE id = p_chat_id
    AND is_disabled_by_admin = false;

  IF NOT FOUND THEN
    -- Idempotent for an already-disabled existing room, but do not leak or
    -- silently accept an unknown chat id.
    IF EXISTS (SELECT 1 FROM public.chats WHERE id = p_chat_id) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Chat tidak ditemukan' USING ERRCODE = 'P0002';
  END IF;

  PERFORM set_config('app.allow_disabled_system_message', 'on', true);

  INSERT INTO public.messages (chat_id, sender_id, sender_type, content, is_read)
  VALUES (
    p_chat_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'system',
    'Chat dinonaktifkan oleh Admin terkait indikasi pelanggaran.',
    true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_disable_chat_by_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_disable_chat_by_admin(uuid) TO authenticated;

-- Include the state in the existing lightweight inbox summary so normal chat
-- rooms can lock their composer immediately after the next summary refresh.
DROP FUNCTION IF EXISTS public.get_chat_summary(uuid);
DROP FUNCTION IF EXISTS public.get_chat_summaries();

CREATE OR REPLACE FUNCTION public.get_chat_summaries()
RETURNS TABLE (
  id uuid,
  chat_type text,
  participant_id uuid,
  initiator_id uuid,
  customer_id uuid,
  status text,
  is_disabled_by_admin boolean,
  display_name text,
  display_avatar text,
  display_subtitle text,
  last_message text,
  last_time timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_employee_id uuid;
  v_is_admin boolean;
BEGIN
  SELECT e.id, (e.role = 'admin' OR COALESCE(e.is_super_admin, false))
  INTO v_employee_id, v_is_admin
  FROM public.employees AS e
  WHERE e.auth_id = auth.uid();

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized employee';
  END IF;

  RETURN QUERY
  SELECT
    c.id, c.chat_type::text, c.participant_id, c.initiator_id, c.customer_id,
    c.status::text, c.is_disabled_by_admin,
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
    WHERE m.chat_id = c.id AND COALESCE(m.is_deleted_by_participant, false) = false
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
    AND (v_is_admin OR c.participant_id = v_employee_id OR c.initiator_id = v_employee_id)
  ORDER BY last_msg.created_at DESC NULLS LAST, c.updated_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_summaries() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chat_summary(p_chat_id uuid)
RETURNS TABLE (
  id uuid,
  chat_type text,
  participant_id uuid,
  initiator_id uuid,
  customer_id uuid,
  status text,
  is_disabled_by_admin boolean,
  display_name text,
  display_avatar text,
  display_subtitle text,
  last_message text,
  last_time timestamptz,
  unread_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    summaries.id, summaries.chat_type, summaries.participant_id,
    summaries.initiator_id, summaries.customer_id, summaries.status,
    summaries.is_disabled_by_admin, summaries.display_name,
    summaries.display_avatar, summaries.display_subtitle,
    summaries.last_message, summaries.last_time, summaries.unread_count
  FROM public.get_chat_summaries() AS summaries
  WHERE summaries.id = p_chat_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_chat_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_summary(uuid) TO authenticated;

-- Dedicated, paginated CCTV feed. This intentionally does not reuse the
-- normal inbox endpoint or return the full message history.
CREATE OR REPLACE FUNCTION public.fetch_cctv_chats(p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  chat_type text,
  status text,
  is_disabled_by_admin boolean,
  display_name text,
  display_subtitle text,
  last_message text,
  last_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin_employee() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.chat_type::text,
    c.status::text,
    c.is_disabled_by_admin,
    CASE
      WHEN c.chat_type = 'support' THEN COALESCE(cu.name, cu.phone, 'Customer')
      WHEN c.chat_type IN ('admin_merchant', 'courier_merchant') THEN COALESCE(me.name, 'Mitra Toko')
      ELSE COALESCE(initiator.full_name, participant.full_name, 'Admin/Kurir')
    END,
    CASE
      WHEN c.chat_type = 'support' THEN 'Customer'
      WHEN c.chat_type IN ('admin_merchant', 'courier_merchant') THEN 'Mitra'
      ELSE 'Internal'
    END,
    COALESCE(last_msg.content, CASE WHEN last_msg.metadata IS NOT NULL THEN '[Attachment]' ELSE '' END),
    last_msg.created_at
  FROM public.chats AS c
  LEFT JOIN public.customers AS cu ON cu.auth_id = c.customer_id
  LEFT JOIN public.merchants AS me ON me.id = c.participant_id
  LEFT JOIN public.employees AS initiator ON initiator.id = c.initiator_id
  LEFT JOIN public.employees AS participant ON participant.id = c.participant_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.metadata, m.created_at
    FROM public.messages AS m
    WHERE m.chat_id = c.id AND COALESCE(m.is_deleted_by_participant, false) = false
    ORDER BY m.created_at DESC NULLS LAST
    LIMIT 1
  ) AS last_msg ON true
  ORDER BY last_msg.created_at DESC NULLS LAST, c.updated_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_cctv_chats(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_cctv_chats(integer, integer) TO authenticated;

-- Prevent direct client INSERTs from forging a system announcement. This is
-- intentionally a guard trigger, not a change to any INSERT RLS policy.
CREATE OR REPLACE FUNCTION public.guard_system_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.sender_type = 'system'
    AND current_setting('app.allow_disabled_system_message', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'System message hanya dapat dibuat oleh sistem'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_system_message_insert ON public.messages;
CREATE TRIGGER trg_guard_system_message_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_system_message_insert();
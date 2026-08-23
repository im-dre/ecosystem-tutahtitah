CREATE OR REPLACE FUNCTION rpc_soft_delete_message(p_msg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE messages SET is_deleted_by_participant = true WHERE id = p_msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_soft_delete_chat(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE chats SET is_deleted_by_participant = true WHERE id = p_chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_soft_delete_all_chats(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE chats 
  SET is_deleted_by_participant = true 
  WHERE participant_id = p_employee_id OR initiator_id = p_employee_id;
END;
$$;

-- RPC to get member counts for a list of servers without RLS recursion
-- Ensures caller is at least a member of each server to receive its count

CREATE OR REPLACE FUNCTION rpc_get_server_member_counts(_server_ids uuid[])
RETURNS TABLE (server_id uuid, member_count integer) AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  SELECT sm.server_id, COUNT(*)::int AS member_count
  FROM server_members sm
  WHERE sm.server_id = ANY(_server_ids)
    AND EXISTS (
      SELECT 1 FROM server_members me
      WHERE me.server_id = sm.server_id
        AND me.user_id = current_user_id
    )
  GROUP BY sm.server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rpc_get_server_member_counts(uuid[]) IS 'Returns member counts for given servers if caller is a member';



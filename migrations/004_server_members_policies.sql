-- Enable RLS and policies so users can see servers they joined

-- Ensure RLS on server_members
ALTER TABLE IF EXISTS server_members ENABLE ROW LEVEL SECURITY;

-- Select own membership rows
CREATE POLICY IF NOT EXISTS "Users can view their own memberships" ON server_members
  FOR SELECT USING (user_id = auth.uid());

-- Allow insert of own membership (primarily for RPCs SECURITY DEFINER)
CREATE POLICY IF NOT EXISTS "Users can be inserted by RPC" ON server_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Optional: prevent arbitrary deletes via client
CREATE POLICY IF NOT EXISTS "Users can delete their own membership" ON server_members
  FOR DELETE USING (user_id = auth.uid());

-- Allow members to select servers they belong to via a membership join
ALTER TABLE IF EXISTS servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Members can select servers they belong to" ON servers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = servers.id
      AND sm.user_id = auth.uid()
    ) OR servers.owner_id = auth.uid()
  );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON server_members(user_id);
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON server_members(server_id);



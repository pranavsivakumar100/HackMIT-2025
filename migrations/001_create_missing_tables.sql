-- Migration: Create Missing Tables for Multi-User Collaboration
-- Date: 2025-01-27
-- Description: Adds server_files, shared_vaults, and user_presence tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create server_files table for server file sharing
CREATE TABLE IF NOT EXISTS server_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  size text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text, -- Optional: for actual file storage path
  file_type text, -- Optional: MIME type
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shared_vaults table for vault sharing between server members
CREATE TABLE IF NOT EXISTS shared_vaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  vault_id uuid NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  vault_name text NOT NULL,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(server_id, vault_id) -- Prevent duplicate sharing
);

-- Create user_presence table for online status tracking
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen timestamptz DEFAULT now(),
  status text DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_server_files_server_id ON server_files(server_id);
CREATE INDEX IF NOT EXISTS idx_server_files_uploaded_by ON server_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_server_files_created_at ON server_files(created_at);

CREATE INDEX IF NOT EXISTS idx_shared_vaults_server_id ON shared_vaults(server_id);
CREATE INDEX IF NOT EXISTS idx_shared_vaults_vault_id ON shared_vaults(vault_id);
CREATE INDEX IF NOT EXISTS idx_shared_vaults_shared_by ON shared_vaults(shared_by);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE server_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for server_files
CREATE POLICY "Users can view files in servers they belong to" ON server_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM server_members 
      WHERE server_members.server_id = server_files.server_id 
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload files to servers they belong to" ON server_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM server_members 
      WHERE server_members.server_id = server_files.server_id 
      AND server_members.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete files they uploaded" ON server_files
  FOR DELETE USING (uploaded_by = auth.uid());

-- Create RLS policies for shared_vaults
CREATE POLICY "Users can view shared vaults in servers they belong to" ON shared_vaults
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM server_members 
      WHERE server_members.server_id = shared_vaults.server_id 
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can share vaults they own to servers they belong to" ON shared_vaults
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM server_members 
      WHERE server_members.server_id = shared_vaults.server_id 
      AND server_members.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM vaults 
      WHERE vaults.id = shared_vaults.vault_id 
      AND vaults.user_id = auth.uid()
    )
    AND shared_by = auth.uid()
  );

CREATE POLICY "Users can unshare vaults they shared" ON shared_vaults
  FOR DELETE USING (shared_by = auth.uid());

-- Create RLS policies for user_presence
CREATE POLICY "Users can view presence of users in their servers" ON user_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM server_members sm1
      JOIN server_members sm2 ON sm1.server_id = sm2.server_id
      WHERE sm1.user_id = auth.uid()
      AND sm2.user_id = user_presence.user_id
    )
  );

CREATE POLICY "Users can update their own presence" ON user_presence
  FOR ALL USING (user_id = auth.uid());

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_server_files_updated_at 
  BEFORE UPDATE ON server_files 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_vaults_updated_at 
  BEFORE UPDATE ON shared_vaults 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at 
  BEFORE UPDATE ON user_presence 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE server_files IS 'Files shared within server channels for team collaboration';
COMMENT ON TABLE shared_vaults IS 'Vaults shared between server members for collaborative AI workspaces';
COMMENT ON TABLE user_presence IS 'Real-time user presence tracking for online status indicators';

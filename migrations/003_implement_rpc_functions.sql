-- Migration: Implement Missing RPC Functions
-- Date: 2025-01-27
-- Description: Creates all missing RPC functions for server management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create server_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'server_role') THEN
        CREATE TYPE server_role AS ENUM ('owner', 'admin', 'member');
    END IF;
END $$;

-- Helper function: Check if user is member of server
CREATE OR REPLACE FUNCTION is_server_member(_server_id uuid, _user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM server_members 
        WHERE server_id = _server_id AND user_id = _user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get user's role in server
CREATE OR REPLACE FUNCTION server_role_of(_server_id uuid, _user_id uuid)
RETURNS server_role AS $$
DECLARE
    user_role server_role;
BEGIN
    SELECT role INTO user_role
    FROM server_members 
    WHERE server_id = _server_id AND user_id = _user_id;
    
    RETURN COALESCE(user_role, 'member'::server_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is owner or admin
CREATE OR REPLACE FUNCTION is_owner_or_admin(_server_id uuid, _user_id uuid)
RETURNS boolean AS $$
DECLARE
    user_role server_role;
BEGIN
    SELECT role INTO user_role
    FROM server_members 
    WHERE server_id = _server_id AND user_id = _user_id;
    
    RETURN user_role IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Create server and add creator as owner
CREATE OR REPLACE FUNCTION rpc_create_server(_name text, _icon text DEFAULT '🚀')
RETURNS uuid AS $$
DECLARE
    new_server_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create a server';
    END IF;
    
    -- Create the server
    INSERT INTO servers (name, icon, created_by)
    VALUES (_name, _icon, current_user_id)
    RETURNING id INTO new_server_id;
    
    -- Add creator as owner
    INSERT INTO server_members (server_id, user_id, role)
    VALUES (new_server_id, current_user_id, 'owner'::server_role);
    
    RETURN new_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Create channel in server
CREATE OR REPLACE FUNCTION rpc_create_channel(_server uuid, _name text, _type text DEFAULT 'text')
RETURNS uuid AS $$
DECLARE
    new_channel_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create a channel';
    END IF;
    
    -- Check if user is member of the server
    IF NOT is_server_member(_server, current_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this server';
    END IF;
    
    -- Check if user has permission to create channels (owner or admin)
    IF NOT is_owner_or_admin(_server, current_user_id) THEN
        RAISE EXCEPTION 'Only owners and admins can create channels';
    END IF;
    
    -- Create the channel
    INSERT INTO channels (server_id, name, type, created_by)
    VALUES (_server, _name, _type::channel_type, current_user_id)
    RETURNING id INTO new_channel_id;
    
    RETURN new_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Generate server invite code
CREATE OR REPLACE FUNCTION rpc_create_server_invite(
    _server_id uuid, 
    _expires_at timestamptz DEFAULT NULL, 
    _max_uses integer DEFAULT NULL
)
RETURNS text AS $$
DECLARE
    invite_code text;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create invites';
    END IF;
    
    -- Check if user is member of the server
    IF NOT is_server_member(_server_id, current_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this server';
    END IF;
    
    -- Check if user has permission to create invites (owner or admin)
    IF NOT is_owner_or_admin(_server_id, current_user_id) THEN
        RAISE EXCEPTION 'Only owners and admins can create invites';
    END IF;
    
    -- Generate unique invite code
    invite_code := encode(gen_random_bytes(8), 'base64');
    
    -- Create the invite
    INSERT INTO server_invites (server_id, invite_code, created_by, expires_at, max_uses)
    VALUES (_server_id, invite_code, current_user_id, _expires_at, _max_uses);
    
    RETURN invite_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Accept server invite
CREATE OR REPLACE FUNCTION rpc_accept_server_invite(_invite_code text)
RETURNS uuid AS $$
DECLARE
    invite_record server_invites%ROWTYPE;
    current_user_id uuid;
    server_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to accept invites';
    END IF;
    
    -- Find the invite
    SELECT * INTO invite_record
    FROM server_invites
    WHERE invite_code = _invite_code;
    
    -- Check if invite exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;
    
    -- Check if invite is expired
    IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < now() THEN
        RAISE EXCEPTION 'Invite code has expired';
    END IF;
    
    -- Check if invite has reached max uses
    IF invite_record.max_uses IS NOT NULL AND invite_record.uses_count >= invite_record.max_uses THEN
        RAISE EXCEPTION 'Invite code has reached maximum uses';
    END IF;
    
    -- Check if user is already a member
    IF is_server_member(invite_record.server_id, current_user_id) THEN
        RAISE EXCEPTION 'User is already a member of this server';
    END IF;
    
    -- Add user to server as member
    INSERT INTO server_members (server_id, user_id, role)
    VALUES (invite_record.server_id, current_user_id, 'member'::server_role);
    
    -- Update invite usage count
    UPDATE server_invites
    SET uses_count = uses_count + 1
    WHERE id = invite_record.id;
    
    RETURN invite_record.server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION rpc_create_server(text, text) IS 'Creates a new server and adds the creator as owner';
COMMENT ON FUNCTION rpc_create_channel(uuid, text, text) IS 'Creates a new channel in a server (requires owner/admin role)';
COMMENT ON FUNCTION rpc_create_server_invite(uuid, timestamptz, integer) IS 'Generates an invite code for a server (requires owner/admin role)';
COMMENT ON FUNCTION rpc_accept_server_invite(text) IS 'Accepts an invite code and joins the server as a member';
COMMENT ON FUNCTION is_server_member(uuid, uuid) IS 'Checks if a user is a member of a server';
COMMENT ON FUNCTION server_role_of(uuid, uuid) IS 'Returns the role of a user in a server';
COMMENT ON FUNCTION is_owner_or_admin(uuid, uuid) IS 'Checks if a user is an owner or admin of a server';


-- Migration: Fix Role Enum Mismatch
-- Date: 2025-01-27
-- Description: Updates server_members role enum to match frontend expectations

-- First, let's check if the server_role enum exists and what values it has
-- If it doesn't exist, create it
DO $$ 
BEGIN
    -- Check if server_role enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'server_role') THEN
        CREATE TYPE server_role AS ENUM ('owner', 'admin', 'member');
    ELSE
        -- If it exists but has different values, we need to handle this carefully
        -- For now, let's just ensure our expected values exist
        BEGIN
            -- Try to add our values if they don't exist
            ALTER TYPE server_role ADD VALUE IF NOT EXISTS 'owner';
            ALTER TYPE server_role ADD VALUE IF NOT EXISTS 'admin';
            ALTER TYPE server_role ADD VALUE IF NOT EXISTS 'member';
        EXCEPTION
            WHEN duplicate_object THEN
                -- Values already exist, continue
                NULL;
        END;
    END IF;
END $$;

-- Update the server_members table to use the correct enum type
-- First, let's see what the current column type is
DO $$
DECLARE
    current_type text;
BEGIN
    -- Get the current column type
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_name = 'server_members' 
    AND column_name = 'role';
    
    -- If it's not already our enum type, we need to convert it
    IF current_type != 'USER-DEFINED' THEN
        -- Convert text to enum
        ALTER TABLE server_members 
        ALTER COLUMN role TYPE server_role 
        USING role::server_role;
    END IF;
END $$;

-- Ensure the default value is correct
ALTER TABLE server_members 
ALTER COLUMN role SET DEFAULT 'member';

-- Add a check constraint to ensure only valid roles
ALTER TABLE server_members 
DROP CONSTRAINT IF EXISTS server_members_role_check;

ALTER TABLE server_members 
ADD CONSTRAINT server_members_role_check 
CHECK (role IN ('owner', 'admin', 'member'));

-- Update any existing data to use lowercase values
UPDATE server_members 
SET role = LOWER(role)::server_role 
WHERE role IN ('OWNER', 'ADMIN', 'MEMBER');

-- Add comment for documentation
COMMENT ON COLUMN server_members.role IS 'User role in the server: owner (full control), admin (manage members/channels), member (basic access)';

# Database Migrations

This directory contains database migrations for the HackMIT 2025 AI Agent Platform.

## Overview

The migrations add the missing database tables and fix schema issues to support full multi-user collaboration:

- **server_files**: File sharing within servers
- **shared_vaults**: Vault sharing between server members  
- **user_presence**: Real-time user presence tracking
- **Role enum fixes**: Standardize server member roles

## Running Migrations

### Prerequisites

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set your database URL:
```bash
export SUPABASE_DB_URL="postgresql://user:password@host:port/database"
```

### Apply All Migrations

```bash
python run_migrations.py
```

### Dry Run (Preview Changes)

```bash
python run_migrations.py --dry-run
```

### Run Specific Migration

```bash
python run_migrations.py --migration-file 001_create_missing_tables.sql
```

## Migration Files

### 001_create_missing_tables.sql
- Creates `server_files` table for server file sharing
- Creates `shared_vaults` table for vault sharing
- Creates `user_presence` table for online status
- Adds proper indexes and RLS policies
- Includes comprehensive security policies

### 002_fix_role_enum.sql
- Fixes server member role enum mismatch
- Converts existing data to lowercase format
- Ensures proper constraints and defaults

## Security Features

All new tables include:
- **Row Level Security (RLS)** enabled
- **Comprehensive policies** for data access control
- **Proper foreign key constraints**
- **Indexes** for performance optimization
- **Triggers** for automatic timestamp updates

## Rollback

To rollback migrations, you can manually drop the tables:

```sql
DROP TABLE IF EXISTS user_presence;
DROP TABLE IF EXISTS shared_vaults;
DROP TABLE IF EXISTS server_files;
```

## Verification

After running migrations, verify the tables exist:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('server_files', 'shared_vaults', 'user_presence');
```

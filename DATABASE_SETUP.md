# Database Setup Guide

This guide will help you set up the complete database schema for the HackMIT 2025 AI Agent Platform with full multi-user collaboration support.

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Set your database URL
export SUPABASE_DB_URL="postgresql://user:password@host:port/database"

# Run the automated setup script
./setup_database.sh
```

### Option 2: Manual Setup

```bash
# Install dependencies
pip install -r migrations/requirements.txt

# Run migrations
cd migrations
python run_migrations.py
```

## 📋 Prerequisites

1. **Supabase Project**: You need an active Supabase project
2. **Database Access**: Connection string to your PostgreSQL database
3. **Python 3.7+**: For running migrations
4. **Storage Buckets**: Create storage buckets for file uploads

## 🗄️ Database Schema Overview

The setup creates the following new tables:

### **server_files**
- Stores files shared within server channels
- Includes file metadata, uploader info, and storage paths
- Full RLS policies for secure access

### **shared_vaults**
- Manages vault sharing between server members
- Prevents duplicate sharing with unique constraints
- Owner-only sharing permissions

### **user_presence**
- Real-time user presence tracking
- Online/offline status with timestamps
- Automatic cleanup of stale presence data

## 🔧 Migration Details

### Migration 001: Create Missing Tables
- Creates `server_files`, `shared_vaults`, `user_presence` tables
- Adds comprehensive indexes for performance
- Implements Row Level Security (RLS) policies
- Sets up automatic timestamp triggers

### Migration 002: Fix Role Enum
- Standardizes server member roles to lowercase
- Updates existing data to match new format
- Adds proper constraints and defaults

## 🔒 Security Features

### Row Level Security (RLS)
All new tables have RLS enabled with comprehensive policies:

- **server_files**: Only server members can view/upload files
- **shared_vaults**: Only vault owners can share, server members can view
- **user_presence**: Users can only update their own presence

### Data Validation
- File size limits (10MB per file)
- Email format validation
- Role-based permission checks
- Foreign key constraints

## 📁 Storage Setup

### Required Storage Buckets

Create these buckets in your Supabase dashboard:

#### **server-files**
```sql
-- Storage policies for server-files bucket
CREATE POLICY "Server members can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'server-files' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM server_members 
    WHERE server_members.server_id = (storage.foldername(name))[1]::uuid
    AND server_members.user_id = auth.uid()
  )
);

CREATE POLICY "Server members can view files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'server-files' AND
  EXISTS (
    SELECT 1 FROM server_members 
    WHERE server_members.server_id = (storage.foldername(name))[1]::uuid
    AND server_members.user_id = auth.uid()
  )
);
```

#### **vault-files** (if not already created)
```sql
-- Storage policies for vault-files bucket
CREATE POLICY "Vault owners can manage files" ON storage.objects
FOR ALL USING (
  bucket_id = 'vault-files' AND
  EXISTS (
    SELECT 1 FROM vaults 
    WHERE vaults.id = (storage.foldername(name))[1]::uuid
    AND vaults.user_id = auth.uid()
  )
);
```

## 🧪 Testing the Setup

### Verify Tables Exist
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('server_files', 'shared_vaults', 'user_presence');
```

### Test RLS Policies
```sql
-- Test server file access
SELECT * FROM server_files LIMIT 1;

-- Test shared vault access
SELECT * FROM shared_vaults LIMIT 1;

-- Test user presence
SELECT * FROM user_presence LIMIT 1;
```

### Check Indexes
```sql
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('server_files', 'shared_vaults', 'user_presence');
```

## 🚨 Troubleshooting

### Common Issues

#### **Migration Fails**
```bash
# Check database connection
psql $SUPABASE_DB_URL -c "SELECT version();"

# Verify permissions
psql $SUPABASE_DB_URL -c "SELECT current_user, session_user;"
```

#### **RLS Policy Errors**
```sql
-- Disable RLS temporarily for debugging
ALTER TABLE server_files DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE server_files ENABLE ROW LEVEL SECURITY;
```

#### **Storage Upload Fails**
- Verify storage buckets exist
- Check storage policies are correct
- Ensure user has proper permissions

### Error Codes

- **23505**: Unique constraint violation (duplicate data)
- **23503**: Foreign key constraint violation
- **PGRST116**: Row not found (expected for some queries)

## 📊 Performance Optimization

### Indexes Created
- `idx_server_files_server_id`: Fast server file lookups
- `idx_server_files_uploaded_by`: User file queries
- `idx_shared_vaults_server_id`: Server vault lookups
- `idx_user_presence_last_seen`: Presence queries

### Query Optimization Tips
- Use `LIMIT` for large result sets
- Filter by server_id first for server-specific queries
- Use `created_at` for time-based queries

## 🔄 Rollback Instructions

If you need to rollback the migrations:

```sql
-- Drop new tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS user_presence CASCADE;
DROP TABLE IF EXISTS shared_vaults CASCADE;
DROP TABLE IF EXISTS server_files CASCADE;

-- Drop the enum if needed
DROP TYPE IF EXISTS server_role CASCADE;
```

## 📈 Monitoring

### Database Metrics to Monitor
- Table sizes and growth
- Query performance
- RLS policy effectiveness
- Storage usage

### Useful Queries
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor active users
SELECT COUNT(*) as active_users 
FROM user_presence 
WHERE last_seen > NOW() - INTERVAL '5 minutes';
```

## 🎉 Success!

Once the setup is complete, your platform will have:

✅ **Full multi-user collaboration**  
✅ **Real-time messaging**  
✅ **File sharing and storage**  
✅ **Vault sharing between teams**  
✅ **User presence tracking**  
✅ **Secure access controls**  
✅ **Performance optimizations**  

Your HackMIT 2025 AI Agent Platform is ready for production use! 🚀

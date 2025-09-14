# HackMIT 2025 - AI Agent Collaboration Platform

A comprehensive AI agent collaboration platform built for HackMIT 2025 with multi-user vaults, server-based teams, and vector search capabilities.

## 🏗️ **Complete Supabase Schema Documentation**

### **Database Overview**
- **Project**: `HackMIT2025` (ID: `ggsnykpbdqcveziawnob`)
- **Region**: `us-east-2`
- **Status**: `ACTIVE_HEALTHY`
- **Database**: PostgreSQL 17.6.1 with Vector Extension v0.8.0

## 🗄️ **Complete Table Schema**

### **1. Authentication & User Management**

#### **`auth.users`** (Supabase Auth)
```sql
-- Supabase managed authentication table
-- Contains: id, email, encrypted_password, email_confirmed_at, etc.
```

#### **`user_profiles`** (RLS: ✅ Enabled)
```sql
user_profiles (
  id: uuid (PK) DEFAULT gen_random_uuid()
  user_id: uuid (FK → auth.users.id) UNIQUE
  email: text
  google_drive_connected: boolean DEFAULT false
  google_drive_refresh_token: text
  google_drive_access_token: text
  google_drive_token_expires_at: timestamptz
  is_first_login: boolean DEFAULT true
  created_at: timestamptz DEFAULT now()
  updated_at: timestamptz DEFAULT now()
)
```

### **2. Vault System (Individual AI Workspaces)**

#### **`vaults`** (RLS: ✅ Enabled, 5 rows)
```sql
vaults (
  id: uuid (PK) DEFAULT gen_random_uuid()
  user_id: uuid (FK → auth.users.id)
  name: text NOT NULL
  description: text
  created_at: timestamptz DEFAULT now()
  updated_at: timestamptz DEFAULT now()
)
```

#### **`files`** (RLS: ✅ Enabled, 27 rows)
```sql
files (
  id: uuid (PK) DEFAULT gen_random_uuid()
  vault_id: uuid (FK → vaults.id)
  name: text NOT NULL
  file_path: text NOT NULL
  file_size: bigint NOT NULL
  file_type: text
  uploaded_at: timestamptz DEFAULT now()
  processed: boolean DEFAULT false
  processing_status: text DEFAULT 'NEW'
  processing_error: text
  processed_at: timestamptz
)
```

#### **`chunk_embeddings`** (RLS: ✅ Enabled, 0 rows)
```sql
chunk_embeddings (
  file_id: uuid (FK → files.id) ON DELETE CASCADE
  chunk_idx: integer NOT NULL
  embedding: vector(1536) NOT NULL
  chunk_text: text
  chunk_metadata: jsonb
  created_at: timestamptz DEFAULT now()
  PRIMARY KEY (file_id, chunk_idx)
)
-- Index: ivfflat vector similarity search
```

### **3. Server System (Team Collaboration)**

#### **`servers`** (RLS: ✅ Enabled, 1 row)
```sql
servers (
  id: uuid (PK) DEFAULT gen_random_uuid()
  owner_id: uuid (FK → auth.users.id) NOT NULL
  name: text NOT NULL CHECK (length(name) <= 120)
  icon: text DEFAULT '🚀'
  created_at: timestamptz DEFAULT now()
)
```

#### **`server_members`** (RLS: ✅ Enabled, 1 row)
```sql
server_members (
  id: uuid (PK) DEFAULT gen_random_uuid()
  server_id: uuid (FK → servers.id) NOT NULL
  user_id: uuid (FK → auth.users.id) NOT NULL
  role: server_role DEFAULT 'MEMBER'
  joined_at: timestamptz DEFAULT now()
  PRIMARY KEY (server_id, user_id)
)
```

#### **`channels`** (RLS: ✅ Enabled, 1 row)
```sql
channels (
  id: uuid (PK) DEFAULT gen_random_uuid()
  server_id: uuid (FK → servers.id) NOT NULL
  name: text NOT NULL CHECK (length(name) <= 120)
  type: text NOT NULL CHECK (type IN ('text', 'voice', 'cloud'))
  created_at: timestamptz DEFAULT now()
  UNIQUE (server_id, name)
)
```

#### **`channel_attrs`** (RLS: ✅ Enabled, 0 rows)
```sql
channel_attrs (
  channel_id: uuid (FK → channels.id) NOT NULL
  key: text NOT NULL CHECK (length(key) <= 64)
  value: jsonb NOT NULL
  updated_at: timestamptz DEFAULT now()
  PRIMARY KEY (channel_id, key)
)
```

### **4. Messaging System**

#### **`messages`** (RLS: ✅ Enabled, 0 rows)
```sql
messages (
  id: uuid (PK) DEFAULT gen_random_uuid()
  channel_id: uuid (FK → channels.id) NOT NULL
  user_id: uuid (FK → auth.users.id) NOT NULL
  content: text NOT NULL
  message_type: text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system'))
  reply_to: uuid (FK → messages.id)
  created_at: timestamptz DEFAULT now()
  updated_at: timestamptz DEFAULT now()
)
```

#### **`server_invites`** (RLS: ✅ Enabled, 0 rows)
```sql
server_invites (
  id: uuid (PK) DEFAULT gen_random_uuid()
  server_id: uuid (FK → servers.id) NOT NULL
  created_by: uuid (FK → auth.users.id) NOT NULL
  invite_code: text NOT NULL UNIQUE
  expires_at: timestamptz
  max_uses: integer
  uses_count: integer DEFAULT 0
  created_at: timestamptz DEFAULT now()
)
```

### **5. Vault Sharing System**

#### **`vault_permission_names`** (RLS: ❌ Disabled, 4 rows)
```sql
vault_permission_names (
  perm: text PRIMARY KEY
)
-- Contains: 'read', 'write', 'delete', 'manage'
```

#### **`vault_shares`** (RLS: ✅ Enabled, 0 rows)
```sql
vault_shares (
  vault_id: uuid (FK → vaults.id) NOT NULL
  grantee_id: uuid (FK → auth.users.id) NOT NULL
  perms: text[] NOT NULL
  granted_by: uuid (FK → auth.users.id) NOT NULL
  granted_at: timestamptz DEFAULT now()
  PRIMARY KEY (vault_id, grantee_id)
)
```

#### **`server_vault_links`** (RLS: ✅ Enabled, 0 rows)
```sql
server_vault_links (
  server_id: uuid (FK → servers.id) NOT NULL
  vault_id: uuid (FK → vaults.id) NOT NULL
  perms: text[] DEFAULT array['read']::text[]
  linked_by: uuid (FK → auth.users.id) NOT NULL
  linked_at: timestamptz DEFAULT now()
  PRIMARY KEY (server_id, vault_id)
)
```

## 🔧 **Enums & Types**

### **`server_role` Enum**
```sql
CREATE TYPE server_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
```

## 🚀 **RPC Functions (API Endpoints)**

### **Server Management**
```sql
-- Create server and add creator as owner
rpc_create_server(_name text) → uuid

-- Add member to server with role
rpc_add_member(_server uuid, _user uuid, _role server_role) → void

-- Create channel in server
rpc_create_channel(_server uuid, _name text) → uuid
```

### **AI Agent Configuration**
```sql
-- Set channel AI agent configuration
rpc_set_channel_attr(_channel uuid, _key text, _value jsonb) → void
```

### **Vault Sharing**
```sql
-- Share vault with specific user
rpc_share_vault_with_user(_vault uuid, _grantee uuid, _perms text[]) → void

-- Link vault to entire server
rpc_link_vault_to_server(_server uuid, _vault uuid, _perms text[]) → void
```

### **Utility Functions**
```sql
-- Generate invite codes
generate_invite_code() → text
```

## 🔍 **Helper Functions**

### **Server Management**
```sql
-- Check if user is member of server
is_server_member(_sid uuid, _uid uuid) → boolean

-- Get user's role in server
server_role_of(_sid uuid, _uid uuid) → server_role

-- Check if user is owner or admin
is_owner_or_admin(_sid uuid, _uid uuid) → boolean
```

### **Vault Permissions**
```sql
-- Check vault permissions (owner/direct/server-based)
has_vault_perm(_vault_id uuid, _uid uuid, _perm text) → boolean
```

## 🔒 **Row Level Security (RLS)**

### **RLS Status by Table:**
- ✅ **Enabled**: `user_profiles`, `vaults`, `files`, `chunk_embeddings`, `servers`, `server_members`, `channels`, `channel_attrs`, `messages`, `server_invites`, `vault_shares`, `server_vault_links`
- ❌ **Disabled**: `vault_permission_names`

### **Key RLS Patterns:**
1. **User Isolation**: `auth.uid() = user_id` for user-owned resources
2. **Server Membership**: `EXISTS (SELECT 1 FROM server_members WHERE ...)` for server access
3. **Role-based Access**: Owner/Admin permissions for server management
4. **Vault Permissions**: Multi-level access (owner/direct/server-based)

## 🗄️ **Storage Buckets**

### **`vault-files`** (Private Bucket)
- **Purpose**: Stores uploaded files for vaults
- **Access**: Private with RLS policies
- **File Limits**: None configured
- **MIME Types**: None restricted

## 🔄 **Real-time Subscriptions**

### **Available Channels:**
- `vault-files`: File uploads and processing status
- `channel-messages`: New messages in channels
- `server-members`: Server membership changes
- `vault-shares`: Vault sharing updates

## 📊 **Current Data Summary**

### **Row Counts:**
- **Vaults**: 5 (multiple users)
- **Files**: 27 (with processing status tracking)
- **Servers**: 1 (with owner/member structure)
- **Channels**: 1 (server-cloud type)
- **Server Members**: 1 (OWNER role)
- **Chunk Embeddings**: 0 (ready for AI vector storage)

## 🤖 **AI Agent Development Workflow**

### **1. Basic Agent Setup**
```typescript
// Create a new server for your AI agent team
const serverId = await supabase.rpc('rpc_create_server', { _name: 'AI Agent Team' });

// Create channels for different agent types
const generalChannel = await supabase.rpc('rpc_create_channel', { 
  _server: serverId, 
  _name: 'general-ai' 
});

const documentChannel = await supabase.rpc('rpc_create_channel', { 
  _server: serverId, 
  _name: 'document-analysis' 
});
```

### **2. Configure AI Agents**
```typescript
// Set up document analysis agent
await supabase.rpc('rpc_set_channel_attr', {
  _channel: documentChannel,
  _key: 'agent_config',
  _value: {
    type: 'document_analyzer',
    model: 'gpt-4',
    capabilities: ['summarize', 'extract_keywords', 'sentiment_analysis'],
    max_file_size: '10MB',
    supported_formats: ['pdf', 'docx', 'txt']
  }
});

// Set up general AI agent
await supabase.rpc('rpc_set_channel_attr', {
  _channel: generalChannel,
  _key: 'agent_config',
  _value: {
    type: 'general_assistant',
    model: 'gpt-4',
    capabilities: ['chat', 'code_generation', 'problem_solving'],
    temperature: 0.7,
    max_tokens: 4000
  }
});
```

### **3. Vault Integration**
```typescript
// Share user's vault with the server for AI processing
await supabase.rpc('rpc_link_vault_to_server', {
  _server: serverId,
  _vault: userVaultId,
  _perms: ['read', 'write'] // AI can read and process files
});

// Or share specific vault with specific users
await supabase.rpc('rpc_share_vault_with_user', {
  _vault: userVaultId,
  _grantee: collaboratorUserId,
  _perms: ['read', 'write', 'manage']
});
```

### **4. File Processing Workflow**
```typescript
// Upload file to vault
const { data: file } = await supabase
  .from('files')
  .insert({
    vault_id: vaultId,
    name: 'document.pdf',
    file_path: 'uploads/document.pdf',
    file_size: 1024000,
    file_type: 'application/pdf'
  });

// Update processing status
await supabase
  .from('files')
  .update({ 
    processing_status: 'processing',
    processed: false 
  })
  .eq('id', file.id);

// After AI processing completes
await supabase
  .from('files')
  .update({ 
    processing_status: 'completed',
    processed: true,
    processed_at: new Date().toISOString()
  })
  .eq('id', file.id);
```

### **5. Multi-User AI Collaboration**
```typescript
// Add team members to server
await supabase.rpc('rpc_add_member', {
  _server: serverId,
  _user: teamMemberId,
  _role: 'MEMBER'
});

// Send AI-generated message to channel
await supabase
  .from('messages')
  .insert({
    channel_id: documentChannel,
    user_id: aiAgentUserId, // Special AI agent user
    content: 'Analysis complete: Document contains 3 key insights...',
    message_type: 'system'
  });
```

## 📊 **Data Flow Examples**

### **Document Analysis Agent**
1. User uploads document to vault
2. Agent detects new file via real-time subscription
3. Agent reads file from vault (with proper permissions)
4. Agent processes document using AI
5. Agent stores results in channel_attrs
6. Agent sends summary message to channel
7. Team members can access results

### **Collaborative Writing Agent**
1. Team shares writing vault with server
2. Agent monitors vault for new drafts
3. Agent provides real-time suggestions
4. Agent tracks changes and versions
5. Agent facilitates team collaboration

### **Code Review Agent**
1. Developer shares code vault
2. Agent analyzes code for issues
3. Agent creates review comments
4. Agent suggests improvements
5. Agent tracks resolution status

## 🔄 **Real-time Subscriptions**

```typescript
// Listen for new files in vault
supabase
  .channel('vault-files')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'files',
    filter: `vault_id=eq.${vaultId}`
  }, (payload) => {
    // Process new file with AI agent
    processFileWithAI(payload.new);
  })
  .subscribe();

// Listen for new messages in channel
supabase
  .channel('channel-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `channel_id=eq.${channelId}`
  }, (payload) => {
    // Respond to user messages with AI
    respondWithAI(payload.new);
  })
  .subscribe();
```

## 🎯 **Agent Types You Can Build**

### **1. Document Processing Agents**
- PDF analysis and summarization
- Contract review and extraction
- Research paper analysis
- Legal document processing

### **2. Code Development Agents**
- Code review and suggestions
- Bug detection and fixing
- Documentation generation
- Test case creation

### **3. Content Creation Agents**
- Blog post writing
- Social media content
- Marketing copy generation
- Technical documentation

### **4. Data Analysis Agents**
- Spreadsheet analysis
- Chart generation
- Trend identification
- Report creation

### **5. Communication Agents**
- Meeting transcription
- Email summarization
- Translation services
- Customer support

## 🛠️ **Development Tips**

### **Permission Checking**
```typescript
// Always check permissions before operations
const hasPermission = await supabase.rpc('has_vault_perm', {
  _vault_id: vaultId,
  _uid: userId,
  _perm: 'read'
});

if (!hasPermission) {
  throw new Error('Insufficient permissions');
}
```

### **Error Handling**
```typescript
// Handle AI processing errors
try {
  const result = await processWithAI(file);
  await supabase
    .from('files')
    .update({ 
      processing_status: 'completed',
      processed: true 
    })
    .eq('id', fileId);
} catch (error) {
  await supabase
    .from('files')
    .update({ 
      processing_status: 'error',
      processing_error: error.message 
    })
    .eq('id', fileId);
}
```

### **Configuration Management**
```typescript
// Store agent configurations as JSON
const agentConfig = {
  model: 'gpt-4',
  temperature: 0.7,
  max_tokens: 4000,
  system_prompt: 'You are a helpful AI assistant...',
  tools: ['web_search', 'file_analysis', 'code_generation']
};

await supabase.rpc('rpc_set_channel_attr', {
  _channel: channelId,
  _key: 'agent_config',
  _value: agentConfig
});
```

## 🚀 **Getting Started**

1. **Set up your Supabase project** with the provided schema
2. **Create your first server** using `rpc_create_server`
3. **Add team members** with `rpc_add_member`
4. **Create channels** for different agent types
5. **Configure agents** using `rpc_set_channel_attr`
6. **Share vaults** for AI processing
7. **Build your AI agents** using the real-time subscriptions

## 🏗️ **Project Structure**

- **Backend**: FastAPI with JWT authentication
- **Frontend**: React + Vite with Supabase integration

## Prerequisites
- Node 18+ (Node 20+ recommended for Vite 7)
- Python 3.10+

## Quick Start

### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./run.sh
```

### Frontend Setup
```bash
cd frontend
cp env.example .env.local   # fill with your Supabase credentials
npm install
npm run dev
```

## Features
- JWT-based authentication
- Supabase integration
- Real-time collaboration
- Modern React UI
- AI agent collaboration platform
- Vector search capabilities
- Multi-user vault sharing
- Server-based team management

## Docker Setup (Recommended)

### Prerequisites
- Docker and Docker Compose installed

### Quick Start with Docker
```bash
# Clone the repository
git clone <your-repo-url>
cd HackMIT-2025

# Copy environment files and fill in your values
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local

# Start both services
docker-compose up

# Access your app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup (Alternative)
If you prefer to run without Docker, follow the Quick Start section above.

## Deployment

### Railway (Easiest for HackMIT)
1. Install Railway CLI: `npm install -g @railway/cli`
2. Deploy backend: `cd backend && railway up`
3. Deploy frontend: `cd frontend && railway up`

### Other Platforms
- **Vercel**: Great for frontend, supports full-stack
- **Render**: Free tier available, supports both services
- **Heroku**: Classic choice, easy deployment
- **DigitalOcean App Platform**: Simple container deployment

## Environment Variables

You'll need to create these accounts and get credentials:

### 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy your Project URL and anon public key

### 2. Environment Files
Fill in these values in your `.env` files:

**Backend (.env):**
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET_KEY=your-super-secret-jwt-key
```

**Frontend (.env.local):**
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE=http://localhost:8000
```

This schema provides a complete foundation for building sophisticated AI agent collaboration platforms with file processing, vector search, multi-user access control, and real-time collaboration! 🚀🤖

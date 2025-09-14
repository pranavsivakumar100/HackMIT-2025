# AI Agent Collaboration Platform - Schema Documentation

## 🏗️ **Database Schema Overview**

This platform provides a comprehensive foundation for building AI agents with multi-user collaboration, vault management, and server-based team interactions.

### **Core Tables**

#### **1. User Management**
```sql
-- User profiles with Google Drive integration
user_profiles (
  id: uuid (PK)
  user_id: uuid (FK → auth.users.id)
  email: text
  google_drive_connected: boolean
  google_drive_refresh_token: text
  google_drive_access_token: text
  google_drive_token_expires_at: timestamptz
  is_first_login: boolean
  created_at: timestamptz
  updated_at: timestamptz
)
```

#### **2. Vault System (Individual AI Workspaces)**
```sql
-- Personal vaults for AI agent interactions
vaults (
  id: uuid (PK)
  user_id: uuid (FK → auth.users.id)
  name: text
  description: text
  created_at: timestamptz
  updated_at: timestamptz
)

-- Files stored in vaults
files (
  id: uuid (PK)
  vault_id: uuid (FK → vaults.id)
  name: text
  file_path: text
  file_size: bigint
  file_type: text
  uploaded_at: timestamptz
  processed: boolean (AI processing status)
  processing_status: text (pending/processing/completed/error)
  processing_error: text
  processed_at: timestamptz
)
```

#### **3. Server System (Team Collaboration)**
```sql
-- Discord-like servers for team AI collaboration
servers (
  id: uuid (PK)
  owner_id: uuid (FK → auth.users.id)
  name: text
  icon: text (emoji)
  created_at: timestamptz
)

-- Server membership with roles
server_members (
  id: uuid (PK)
  server_id: uuid (FK → servers.id)
  user_id: uuid (FK → auth.users.id)
  role: server_role (OWNER/ADMIN/MEMBER)
  joined_at: timestamptz
)

-- Channels within servers
channels (
  id: uuid (PK)
  server_id: uuid (FK → servers.id)
  name: text
  type: text (text/voice/cloud)
  created_at: timestamptz
  UNIQUE(server_id, name)
)
```

#### **4. AI Agent Configuration**
```sql
-- Channel-specific AI agent settings
channel_attrs (
  channel_id: uuid (FK → channels.id)
  key: text (configuration key)
  value: jsonb (AI agent configuration)
  updated_at: timestamptz
  PRIMARY KEY (channel_id, key)
)
```

#### **5. Vault Sharing System**
```sql
-- Permission definitions
vault_permission_names (
  perm: text (read/write/delete/manage)
)

-- Direct user-to-user vault sharing
vault_shares (
  vault_id: uuid (FK → vaults.id)
  grantee_id: uuid (FK → auth.users.id)
  perms: text[] (array of permissions)
  granted_by: uuid (FK → auth.users.id)
  granted_at: timestamptz
  PRIMARY KEY (vault_id, grantee_id)
)

-- Server-wide vault access
server_vault_links (
  server_id: uuid (FK → servers.id)
  vault_id: uuid (FK → vaults.id)
  perms: text[] (default: ['read'])
  linked_by: uuid (FK → auth.users.id)
  linked_at: timestamptz
  PRIMARY KEY (server_id, vault_id)
)
```

#### **6. Messaging System**
```sql
-- Chat messages in channels
messages (
  id: uuid (PK)
  channel_id: uuid (FK → channels.id)
  user_id: uuid (FK → auth.users.id)
  content: text
  message_type: text (text/file/system)
  reply_to: uuid (FK → messages.id)
  created_at: timestamptz
  updated_at: timestamptz
)

-- Server invites
server_invites (
  id: uuid (PK)
  server_id: uuid (FK → servers.id)
  created_by: uuid (FK → auth.users.id)
  invite_code: text (UNIQUE)
  expires_at: timestamptz
  max_uses: integer
  uses_count: integer
  created_at: timestamptz
)
```

## 🔧 **Helper Functions**

### **Server Management**
```sql
-- Check if user is member of server
CREATE FUNCTION is_server_member(_sid uuid, _uid uuid) 
RETURNS boolean;

-- Get user's role in server
CREATE FUNCTION server_role_of(_sid uuid, _uid uuid) 
RETURNS server_role;

-- Check if user is owner or admin
CREATE FUNCTION is_owner_or_admin(_sid uuid, _uid uuid) 
RETURNS boolean;
```

### **Vault Permissions**
```sql
-- Check vault permissions (owner/direct/server-based)
CREATE FUNCTION has_vault_perm(_vault_id uuid, _uid uuid, _perm text) 
RETURNS boolean;
```

## 🚀 **RPC Functions (API Endpoints)**

### **Server Operations**
```sql
-- Create server and add creator as owner
CREATE FUNCTION rpc_create_server(_name text) 
RETURNS uuid;

-- Add member to server with role
CREATE FUNCTION rpc_add_member(_server uuid, _user uuid, _role server_role) 
RETURNS void;

-- Create channel in server
CREATE FUNCTION rpc_create_channel(_server uuid, _name text) 
RETURNS uuid;
```

### **AI Agent Configuration**
```sql
-- Set channel AI agent configuration
CREATE FUNCTION rpc_set_channel_attr(_channel uuid, _key text, _value jsonb) 
RETURNS void;
```

### **Vault Sharing**
```sql
-- Share vault with specific user
CREATE FUNCTION rpc_share_vault_with_user(_vault uuid, _grantee uuid, _perms text[]) 
RETURNS void;

-- Link vault to entire server
CREATE FUNCTION rpc_link_vault_to_server(_server uuid, _vault uuid, _perms text[]) 
RETURNS void;
```

## 🔒 **Row Level Security (RLS)**

All tables have comprehensive RLS policies ensuring:
- **User Isolation**: Users can only access their own data
- **Server Membership**: Access based on server membership
- **Role-based Permissions**: Owner/Admin/Member hierarchy
- **Vault Permissions**: Granular access control

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

This schema provides a robust foundation for building sophisticated AI agent collaboration platforms! 🤖✨

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import type { User } from '@supabase/supabase-js'

type View = 'sign_in' | 'sign_up'

export function AuthView() {
  const [view, setView] = useState<View>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1')
  const [selectedVault, setSelectedVault] = useState<string | null>(null)
  const [vaultView, setVaultView] = useState<'list' | 'detail'>('list')
  const [activeVaultTab, setActiveVaultTab] = useState<'agents' | 'files'>('files')
  const [vaults, setVaults] = useState<Array<{id: string, name: string, fileCount: number}>>([])
  const [showCreateVault, setShowCreateVault] = useState(false)
  const [newVaultName, setNewVaultName] = useState('')
  const [files, setFiles] = useState<{[key: string]: Array<{id: string, name: string, size: string, type: string}>}>({})
  const [agents] = useState<{[key: string]: Array<{id: string, name: string, description: string, type: string}>}>({
    // Default agents that appear in every vault
    default: [
      { id: 'a1', name: 'Document Analyzer', description: 'Analyze and summarize your documents', type: 'analysis' },
      { id: 'a2', name: 'Writing Assistant', description: 'Help improve your writing and grammar', type: 'writing' },
      { id: 'a3', name: 'File Organizer', description: 'Help organize and categorize your files', type: 'productivity' }
    ]
  })

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  // Supabase data functions
  const loadUserVaults = async () => {
    if (!user) return

    try {
      const { data: vaultsData, error } = await supabase
        .from('vaults')
        .select(`
          id,
          name,
          created_at,
          files(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      const vaultsWithCount = vaultsData?.map(vault => ({
        id: vault.id,
        name: vault.name,
        fileCount: vault.files?.[0]?.count || 0
      })) || []

      setVaults(vaultsWithCount)
    } catch (error) {
      console.error('Error loading vaults:', error)
    }
  }

  const loadVaultFiles = async (vaultId: string) => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('vault_id', vaultId)
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      const formattedFiles = data?.map(file => ({
        id: file.id,
        name: file.name,
        size: formatFileSize(file.file_size),
        type: file.file_type?.split('/')[1] || 'unknown'
      })) || []

      setFiles(prev => ({
        ...prev,
        [vaultId]: formattedFiles
      }))
    } catch (error) {
      console.error('Error loading files:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Load user data when user signs in
  useEffect(() => {
    if (user) {
      loadUserVaults()
    } else {
      // Clear data when user signs out
      setVaults([])
      setFiles({})
      setSelectedVault(null)
      setVaultView('list')
    }
  }, [user])

  // Load files when vault is selected
  useEffect(() => {
    if (selectedVault && !files[selectedVault]) {
      loadVaultFiles(selectedVault)
    }
  }, [selectedVault])

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileMenu && !(event.target as Element)?.closest('.sidebar-profile')) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

  const signIn = async () => {
    setLoading(true); setError(null); setInfo(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const signUp = async () => {
    setLoading(true); setError(null); setInfo(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    if (data?.user && !data.session) setInfo('Check your email to confirm your account, then sign in.')
    setLoading(false)
  }

  const signInWithGoogle = async () => {
    setError(null)
    const redirectTo = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) setError(error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setShowProfileMenu(false)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files
    if (!uploadedFiles || !selectedVault || !user) return

    try {
      const uploadPromises = Array.from(uploadedFiles).map(async (file) => {
        // Create unique file path
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        const filePath = `${user.id}/${selectedVault}/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('vault-files')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Save file metadata to database
        const { data, error: dbError } = await supabase
          .from('files')
          .insert({
            vault_id: selectedVault,
            name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type
          })
          .select()
          .single()

        if (dbError) throw dbError

        return {
          id: data.id,
          name: data.name,
          size: formatFileSize(data.file_size),
          type: data.file_type?.split('/')[1] || 'unknown'
        }
      })

      const newFiles = await Promise.all(uploadPromises)

      // Update local state
      setFiles(prev => ({
        ...prev,
        [selectedVault]: [...(prev[selectedVault] || []), ...newFiles]
      }))

      setVaults(prev => prev.map(vault => 
        vault.id === selectedVault 
          ? { ...vault, fileCount: vault.fileCount + newFiles.length }
          : vault
      ))

      // Clear the input
      event.target.value = ''
    } catch (error) {
      console.error('Error uploading files:', error)
      // You could add a toast notification here
    }
  }

  const handleVaultClick = (vaultId: string) => {
    setSelectedVault(vaultId)
    setVaultView('detail')
    setActiveVaultTab('files')
  }

  const handleBackToVaults = () => {
    setVaultView('list')
    setSelectedVault(null)
  }

  const handleCreateVault = async () => {
    if (!newVaultName.trim() || !user) return

    try {
      const { data, error } = await supabase
        .from('vaults')
        .insert({
          name: newVaultName.trim(),
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      const newVault = {
        id: data.id,
        name: data.name,
        fileCount: 0
      }

      setVaults(prev => [...prev, newVault])
      setFiles(prev => ({ ...prev, [data.id]: [] }))
      setNewVaultName('')
      setShowCreateVault(false)
    } catch (error) {
      console.error('Error creating vault:', error)
      // You could add a toast notification here
    }
  }

  const handleDeleteVault = async (vaultId: string) => {
    try {
      const { error } = await supabase
        .from('vaults')
        .delete()
        .eq('id', vaultId)
        .eq('user_id', user?.id)

      if (error) throw error

      setVaults(prev => prev.filter(v => v.id !== vaultId))
      setFiles(prev => {
        const newFiles = { ...prev }
        delete newFiles[vaultId]
        return newFiles
      })
      
      if (selectedVault === vaultId) {
        setVaultView('list')
        setSelectedVault(null)
      }
    } catch (error) {
      console.error('Error deleting vault:', error)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf': return '📄'
      case 'zip': case 'rar': return '🗂️'
      case 'txt': case 'md': return '📝'
      case 'docx': case 'doc': return '📘'
      case 'pptx': case 'ppt': return '📊'
      case 'fig': return '🎨'
      case 'png': case 'jpg': case 'jpeg': case 'gif': return '🖼️'
      default: return '📎'
    }
  }

  const getAgentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'analysis': return '🔍'
      case 'writing': return '✍️'
      case 'management': return '📊'
      case 'development': return '💻'
      case 'productivity': return '⚡'
      case 'presentation': return '🎯'
      case 'technical': return '🔧'
      default: return '🤖'
    }
  }

  if (user) {
    return (
      <div className="app-layout">
        {/* Left Sidebar Navigation */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-tabs">
              <button 
                className={`sidebar-tab ${activeTab === 'tab1' ? 'active' : ''}`}
                onClick={() => setActiveTab('tab1')}
              >
                📁 Vaults
              </button>
              <button 
                className={`sidebar-tab ${activeTab === 'tab2' ? 'active' : ''}`}
                onClick={() => setActiveTab('tab2')}
              >
                Tab 2
              </button>
            </div>
          </div>
          
          <div className="sidebar-content">
            {activeTab === 'tab1' ? (
              vaultView === 'list' ? (
                <div className="vaults-tab">
                  <div className="vaults-header">
                    <h3>Your Vaults</h3>
                    <p>Organize your files by project or category</p>
                  </div>
                  
                  {vaults.length > 0 ? (
                    <div className="vaults-list">
                      {vaults.map(vault => (
                        <div 
                          key={vault.id}
                          className="vault-item"
                          onClick={() => handleVaultClick(vault.id)}
                        >
                          <div className="vault-icon">🗂️</div>
                          <div className="vault-info">
                            <div className="vault-name">{vault.name}</div>
                            <div className="vault-count">{vault.fileCount} files</div>
                          </div>
                          <div className="vault-arrow">→</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-vaults">
                      <div className="empty-vaults-icon">📁</div>
                      <h4>No vaults yet</h4>
                      <p>Create your first vault to start organizing files</p>
                    </div>
                  )}
                  
                  {/* Create Vault Section */}
                  <div className="create-vault-section">
                    {showCreateVault ? (
                      <div className="create-vault-form">
                        <input
                          type="text"
                          className="vault-name-input"
                          placeholder="Enter vault name..."
                          value={newVaultName}
                          onChange={(e) => setNewVaultName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && void handleCreateVault()}
                          autoFocus
                        />
                        <div className="create-vault-actions">
                          <button className="create-vault-btn" onClick={handleCreateVault}>
                            Create
                          </button>
                          <button 
                            className="cancel-vault-btn" 
                            onClick={() => {
                              setShowCreateVault(false)
                              setNewVaultName('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="add-vault-btn" 
                        onClick={() => setShowCreateVault(true)}
                      >
                        <span className="add-icon">+</span>
                        <span>Create New Vault</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="vault-detail-sidebar">
                  <div className="vault-detail-header">
                    <button className="back-button" onClick={handleBackToVaults}>
                      ← Back to Vaults
                    </button>
                    <h3>{vaults.find(v => v.id === selectedVault)?.name}</h3>
                  </div>
                  
                  <div className="vault-tabs">
                    <button 
                      className={`vault-tab ${activeVaultTab === 'agents' ? 'active' : ''}`}
                      onClick={() => setActiveVaultTab('agents')}
                    >
                      🤖 Agents
                    </button>
                    <button 
                      className={`vault-tab ${activeVaultTab === 'files' ? 'active' : ''}`}
                      onClick={() => setActiveVaultTab('files')}
                    >
                      📁 Files
                    </button>
                  </div>
                  
                  <div className="vault-tab-content">
                    {activeVaultTab === 'agents' ? (
                      <div className="agents-list">
                        {(agents.default || []).map(agent => (
                          <div key={agent.id} className="agent-item">
                            <div className="agent-icon">{getAgentIcon(agent.type)}</div>
                            <div className="agent-info">
                              <div className="agent-name">{agent.name}</div>
                              <div className="agent-description">{agent.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="files-list">
                        {(files[selectedVault || ''] || []).map(file => (
                          <div key={file.id} className="file-item">
                            <div className="file-icon">{getFileIcon(file.type)}</div>
                            <div className="file-info">
                              <div className="file-name">{file.name}</div>
                              <div className="file-size">{file.size}</div>
                            </div>
                          </div>
                        ))}
                        <label className="upload-file-item">
                          <div className="upload-icon">📤</div>
                          <div className="upload-text">Upload Files</div>
                          <input 
                            type="file" 
                            multiple 
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="tab-content">
                <h3>Tab 2 Content</h3>
                <p>This is the content for Tab 2</p>
                <ul>
                  <li>Feature A</li>
                  <li>Feature B</li>
                  <li>Feature C</li>
                </ul>
              </div>
            )}
          </div>

          {/* Profile section in sidebar */}
          <div className="sidebar-profile">
            <div className="sidebar-profile-divider"></div>
            <div className="sidebar-profile-content">
              <button 
                className="sidebar-profile-button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="sidebar-profile-avatar">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="sidebar-avatar-img" />
                  ) : (
                    <div className="sidebar-avatar-placeholder">
                      {user.email?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="sidebar-profile-info">
                  <div className="sidebar-profile-name">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="sidebar-profile-email">{user.email}</div>
                </div>
                <div className="sidebar-profile-menu-icon">⋯</div>
              </button>

              {showProfileMenu && (
                <div className="sidebar-profile-menu">
                  <button className="sidebar-profile-menu-item" onClick={signOut}>
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {activeTab === 'tab1' ? (
            vaultView === 'detail' && selectedVault ? (
              <div className="chat-interface">
                <div className="chat-header">
                  <h2>Chat with your {activeVaultTab === 'files' ? 'Files' : 'Agents'}</h2>
                  <p>Ask questions about your documents or interact with AI agents</p>
                </div>
                
                <div className="chat-messages">
                  <div className="message assistant-message">
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                      <p>Hello! I'm here to help you with your {vaults.find(v => v.id === selectedVault)?.name} vault. 
                      You can ask me questions about your {activeVaultTab === 'files' ? 'uploaded files' : 'available agents'}.</p>
                    </div>
                  </div>
                  
                  <div className="message user-message">
                    <div className="message-content">
                      <p>What files do I have in this vault?</p>
                    </div>
                    <div className="message-avatar">👤</div>
                  </div>
                  
                  <div className="message assistant-message">
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                      {files[selectedVault]?.length > 0 ? (
                        <>
                          <p>You have {files[selectedVault]?.length || 0} files in your {vaults.find(v => v.id === selectedVault)?.name} vault:</p>
                          <ul>
                            {(files[selectedVault] || []).map(file => (
                              <li key={file.id}>📄 {file.name} ({file.size})</li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p>Your {vaults.find(v => v.id === selectedVault)?.name} vault is empty. Upload some files to get started!</p>
                      )}
                      {activeVaultTab === 'agents' && (
                        <>
                          <p>Available AI agents in this vault:</p>
                          <ul>
                            {(agents.default || []).map(agent => (
                              <li key={agent.id}>🤖 {agent.name} - {agent.description}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="chat-input-container">
                  <div className="chat-input-wrapper">
                    <input 
                      type="text" 
                      className="chat-input" 
                      placeholder={`Ask about your ${activeVaultTab}...`}
                    />
                    <button className="send-button">
                      <span>Send</span>
                      <span className="send-icon">↗</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="main-app">
                <h1>Your Vaults</h1>
                <p>Select a vault from the sidebar to start chatting with your files and agents</p>
              </div>
            )
          ) : (
            <div className="main-app">
              <h1>Tab 2 Content</h1>
              <p>This will be your second feature!</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
    <div className="auth-card">
      <h2 className="auth-title">{view === 'sign_in' ? 'Sign in' : 'Create account'}</h2>
      <div className="auth-stack">
        {error && <div className="error">{error}</div>}
        {info && <div className="note">{info}</div>}
        <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {view === 'sign_in' ? (
          <button className="btn btn-primary" disabled={loading} onClick={signIn}>{loading ? 'Signing in…' : 'Sign in'}</button>
        ) : (
          <button className="btn btn-primary" disabled={loading} onClick={signUp}>{loading ? 'Creating…' : 'Create account'}</button>
        )}
        <button className="btn btn-google" onClick={signInWithGoogle}>Continue with Google</button>
        <div className="btn-row">
          <button className="btn" onClick={() => setView('sign_in')}>Sign in</button>
          <button className="btn" onClick={() => setView('sign_up')}>Sign up</button>
          </div>
        </div>
      </div>
    </div>
  )
}



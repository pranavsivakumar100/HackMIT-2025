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
  const [selectedServer, setSelectedServer] = useState<string>('b0fe6aab-15a7-421f-9454-0b21b3aeb5a7')
  const [selectedVault, setSelectedVault] = useState<string | null>(null)
  const [vaultView, setVaultView] = useState<'list' | 'detail'>('list')
  const [activeVaultTab, setActiveVaultTab] = useState<'agents' | 'files'>('files')
  const [vaults, setVaults] = useState<Array<{id: string, name: string, fileCount: number, user_id: string | null}>>([])
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
  const [servers, setServers] = useState<Array<{id: string, name: string, icon: string, memberCount: number}>>([])
  const [showCreateServer, setShowCreateServer] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [selectedServerIcon, setSelectedServerIcon] = useState('🚀')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false)
  const [generatedInviteCode, setGeneratedInviteCode] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [channels, setChannels] = useState<{[key: string]: Array<{id: string, name: string, type: 'text' | 'voice' | 'cloud'}>}>({})
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const [channelMenuPosition, setChannelMenuPosition] = useState({ x: 0, y: 0 })
  const [channelMenuType, setChannelMenuType] = useState<'category' | 'channel'>('category')
  const [channelMenuTarget, setChannelMenuTarget] = useState<{categoryType?: 'text' | 'voice', channelId?: string}>({})
  const [showCreateChannelForm, setShowCreateChannelForm] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text')
  
  // Chat/Messaging state
  const [messages, setMessages] = useState<{[channelId: string]: Array<{id: string, content: string, user_id: string, created_at: string | null, user?: {email: string | null}}>}>({})
  const [messageInput, setMessageInput] = useState('')
  const [vaultMessageInput, setVaultMessageInput] = useState('')
  
  // Server member management
  const [serverMembers, setServerMembers] = useState<{[serverId: string]: Array<{id: string, user_id: string, role: 'owner' | 'admin' | 'member' | 'OWNER' | 'ADMIN' | 'MEMBER' | null, user_profiles: {email: string | null}}>}>({})
  const [showMemberList, setShowMemberList] = useState(false)
  
  // Server files
  const [serverFiles, setServerFiles] = useState<{[serverId: string]: Array<{id: string, name: string, size: string, uploaded_by: string, created_at: string | null}>}>({})
  
  // Vault sharing
  const [sharedVaults, setSharedVaults] = useState<{[serverId: string]: Array<{id: string, vault_id: string, vault_name: string, shared_by: string, created_at: string | null}>}>({})
  const [showShareVaultModal, setShowShareVaultModal] = useState(false)
  const [selectedVaultToShare, setSelectedVaultToShare] = useState('')
  
  // User presence
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

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
          user_id,
          files(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      const vaultsWithCount = vaultsData?.map(vault => ({
        id: vault.id,
        name: vault.name,
        fileCount: vault.files?.[0]?.count || 0,
        user_id: vault.user_id
      })) || []

      console.log('Vaults loaded:', vaultsWithCount)
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

    // CAPTURE FILES FIRST before clearing input!
    const filesArray = Array.from(uploadedFiles)
    
    // Clear the input value to prevent double-uploads
    event.target.value = ''

    // Validate file sizes (max 10MB per file)
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = filesArray.filter(file => file.size > maxFileSize)
    
    if (oversizedFiles.length > 0) {
      alert(`Some files are too large (max 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    try {
      // Process files sequentially to avoid overwhelming the server
      const newFiles: Array<{id: string, name: string, size: string, type: string}> = []
      const failedFiles: Array<{name: string, error: string}> = []
      
      for (const file of filesArray) {
        try {
          // Create unique file path
          const fileExt = file.name.split('.').pop() || 'bin'
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `${user.id}/${selectedVault}/${fileName}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('vault-files')
            .upload(filePath, file)

          if (uploadError) {
            console.error('Storage upload error:', uploadError)
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }

          // Save file metadata to database
          const { data, error: dbError } = await supabase
            .from('files')
            .insert({
              vault_id: selectedVault,
              name: file.name,
              file_path: filePath,
              file_size: file.size,
              file_type: file.type || 'application/octet-stream'
            })
            .select()
            .single()

          if (dbError) {
            // If database insert fails, clean up the uploaded file
            try {
              await supabase.storage
                .from('vault-files')
                .remove([filePath])
            } catch (cleanupError) {
              console.warn('Failed to cleanup uploaded file:', cleanupError)
            }
            throw dbError
          }

          newFiles.push({
            id: data.id,
            name: data.name,
            size: formatFileSize(data.file_size),
            type: data.file_type?.split('/')[1] || 'unknown'
          })

        } catch (fileError: any) {
          console.error(`Error uploading file ${file.name}:`, fileError)
          failedFiles.push({ name: file.name, error: fileError.message })
        }
      }

      // Update state with successfully uploaded files
      if (newFiles.length > 0) {
        setFiles(prev => ({
          ...prev,
          [selectedVault]: [...(prev[selectedVault] || []), ...newFiles]
        }))

        setVaults(prev => prev.map(vault => 
          vault.id === selectedVault 
            ? { ...vault, fileCount: vault.fileCount + newFiles.length }
            : vault
        ))
      }

      // Show results to user
      if (newFiles.length > 0 && failedFiles.length === 0) {
        alert(`Successfully uploaded ${newFiles.length} file(s) to your vault!`)
      } else if (newFiles.length > 0 && failedFiles.length > 0) {
        alert(`Uploaded ${newFiles.length} file(s) successfully. Failed: ${failedFiles.map(f => f.name).join(', ')}`)
      } else {
        alert(`Failed to upload all files: ${failedFiles.map(f => f.name).join(', ')}`)
      }

    } catch (error: any) {
      console.error('Error in vault file upload process:', error)
      
      // Provide more specific error messages
      if (error.message?.includes('storage')) {
        alert(`Storage error: ${error.message}`)
      } else if (error.code === '23503') {
        alert('Invalid vault reference. Please refresh and try again.')
      } else if (error.code === '42501') {
        alert('Permission denied. You may not have access to upload files to this vault.')
      } else {
        alert(`Failed to upload files: ${error.message || 'Unknown error'}`)
      }
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
        fileCount: 0,
        user_id: data.user_id
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


  const handleCreateServer = async () => {
    if (!newServerName.trim() || !user) {
      alert('Please enter a server name')
      return
    }

    try {
      // Use the new RPC function to create server
      const { data: serverId, error: serverError } = await supabase
        .rpc('rpc_create_server', { 
          _name: newServerName.trim(),
          _icon: selectedServerIcon || '🚀'
        } as { _name: string; _icon: string })

      if (serverError) {
        console.error('Server creation error:', serverError)
        throw serverError
      }

      // Create default server-cloud channel using RPC
      const { data: channelId, error: channelError } = await supabase
        .rpc('rpc_create_channel', { 
          _server: serverId, 
          _name: 'server-cloud',
          _type: 'cloud'
        } as { _name: string; _server: string; _type: string })

      if (channelError) {
        console.error('Channel creation error:', channelError)
        throw channelError
      }

      // Update local state
      const newServer = {
        id: serverId,
        name: newServerName.trim(),
        icon: selectedServerIcon,
        memberCount: 1 // Creator is the first member
      }

      setServers(prev => [...prev, newServer])
      setChannels(prev => ({ 
        ...prev, 
        [serverId]: [{ id: channelId, name: 'server-cloud', type: 'cloud' as const }]
      }))
      setSelectedServer(serverId)
      setSelectedChannel(channelId)
      setNewServerName('')
      setShowCreateServer(false)
      
      alert(`Server "${newServerName.trim()}" created successfully!`)
    } catch (error: any) {
      console.error('Error creating server:', error)
      alert(`Failed to create server: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDeleteServer = async (serverId: string) => {
    if (!user?.id) return
    
    try {
      const { error } = await supabase
        .from('servers')
        .delete()
        .eq('id', serverId)
        .eq('owner_id', user.id)

      if (error) throw error

      setServers(prev => prev.filter(s => s.id !== serverId))
      setChannels(prev => {
        const newChannels = { ...prev }
        delete newChannels[serverId]
        return newChannels
      })
      
      if (selectedServer === serverId) {
        setSelectedServer(servers.length > 1 ? servers.find(s => s.id !== serverId)?.id || '' : '')
        setSelectedChannel('')
      }
    } catch (error) {
      console.error('Error deleting server:', error)
    }
  }

  // Generate server invite
  const handleGenerateInvite = async () => {
    if (!selectedServer || !user) return

    try {
      const { data: newInviteCode, error } = await supabase
        .rpc('rpc_create_server_invite', {
          _server_id: selectedServer,
          _expires_at: undefined, // No expiration
          _max_uses: undefined    // Unlimited uses
        })

      if (error) throw error

      setGeneratedInviteCode(String(newInviteCode || ''))
      setShowInviteCodeModal(true)
    } catch (error: any) {
      console.error('Error generating invite:', error)
      alert(`Failed to generate invite: ${error.message || 'Unknown error'}`)
    }
  }

  // Accept server invite
  const handleAcceptInvite = async () => {
    console.log('handleAcceptInvite called:', { inviteCode: inviteCode.trim(), user: user?.id })
    if (!inviteCode.trim()) {
      alert('Please enter an invite code')
      return
    }
    if (!user) {
      alert('You must be logged in to join a server')
      return
    }

    try {
      console.log('Calling rpc_accept_server_invite with:', inviteCode.trim())
      const { data: serverId, error } = await supabase
        .rpc('rpc_accept_server_invite', {
          _invite_code: inviteCode.trim()
        })

      if (error) {
        console.error('RPC error:', error)
        throw error
      }

      console.log('RPC success, serverId:', serverId)

      // Reload servers to include the new one
      await loadUserServersAndChannels()
      
      // Switch to the new server
      setSelectedServer(serverId)
      
      setShowInviteModal(false)
      setInviteCode('')
      
      alert('Successfully joined the server!')
    } catch (error: any) {
      console.error('Error accepting invite:', error)
      alert(`Failed to accept invite: ${error.message || 'Unknown error'}`)
    }
  }

  // Load servers and channels from Supabase when user changes
  const loadUserServersAndChannels = async () => {
    if (!user) return

    try {
      // First, get servers user owns
      const { data: ownedServers, error: ownedError } = await supabase
        .from('servers')
        .select(`
          id,
          name,
          icon,
          created_at,
          owner_id
        `)
        .eq('owner_id', user.id)

      if (ownedError) throw ownedError

      // Then get servers user is a member of
      const { data: memberServers, error: memberError } = await supabase
        .from('server_members')
        .select(`
          servers (
            id,
            name,
            icon,
            created_at,
            owner_id
          )
        `)
        .eq('user_id', user.id)

      if (memberError) throw memberError

      // Combine both lists and remove duplicates
      const serversData = [
        ...(ownedServers || []),
        ...(memberServers?.map(m => m.servers).filter(Boolean) || [])
      ].filter((server, index, array) => 
        array.findIndex(s => s.id === server.id) === index
      ).sort((a, b) => {
        // Prioritize "SERVER CLOUD" to appear first
        if (a.name.toLowerCase().includes('server cloud') && !b.name.toLowerCase().includes('server cloud')) {
          return -1
        }
        if (!a.name.toLowerCase().includes('server cloud') && b.name.toLowerCase().includes('server cloud')) {
          return 1
        }
        // For other servers, sort by creation date (newest first)
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })

      const serverIds = serversData?.map(s => s.id) || []

      // Get member counts for each server (owned or joined) using RPC
      let memberCountMap: {[key: string]: number} = {}
      if (serverIds.length > 0) {
        const { data: memberCounts, error: countError } = await supabase
          .rpc('rpc_get_server_member_counts', { _server_ids: serverIds as unknown as string[] })

        if (countError) throw countError

        ;(memberCounts || []).forEach((row: { server_id: string; member_count: number }) => {
          memberCountMap[row.server_id] = row.member_count
        })
      }

      // Load all channels for user's servers
      let channelsData: Array<{id: string, name: string, server_id: string, type: string, created_at: string | null}> = []
      if (serverIds.length > 0) {
        const { data: channelsResult, error: channelsError } = await supabase
          .from('channels')
          .select('*')
          .in('server_id', serverIds)
          .order('created_at', { ascending: true })

        if (channelsError) throw channelsError
        channelsData = channelsResult || []
      }

      // Format servers with member counts
      const formattedServers = serversData?.map(server => ({
        id: server.id,
        name: server.name,
        icon: server.icon,
        memberCount: memberCountMap[server.id] || 0
      })) || []

      // Group channels by server
      const channelsByServer: {[key: string]: Array<{id: string, name: string, type: 'text' | 'voice' | 'cloud'}>} = {}
      
      channelsData.forEach(channel => {
        if (!channelsByServer[channel.server_id]) {
          channelsByServer[channel.server_id] = []
        }
        channelsByServer[channel.server_id].push({
          id: channel.id,
          name: channel.name,
          type: channel.type as 'text' | 'voice' | 'cloud'
        })
      })

      setServers(formattedServers)
      setChannels(channelsByServer)

      if (formattedServers.length > 0) {
        // Preserve currently selected server if it still exists; otherwise pick the first
        const currentServerStillExists = formattedServers.some(s => s.id === selectedServer)
        const nextSelectedServer = currentServerStillExists ? selectedServer : formattedServers[0].id
        if (nextSelectedServer !== selectedServer) {
          setSelectedServer(nextSelectedServer)
        }

        // Preserve currently selected channel if it still exists in the selected server
        const serverChannels = channelsByServer[nextSelectedServer] || []
        const currentChannelStillExists = serverChannels.some(c => c.id === selectedChannel)

        if (!currentChannelStillExists) {
          // Prefer a text channel, otherwise keep cloud or fall back to first
          const textChannel = serverChannels.find(c => c.type === 'text')
          const cloudChannel = serverChannels.find(c => c.type === 'cloud')
          const fallback = textChannel?.id || cloudChannel?.id || serverChannels[0]?.id || ''
          setSelectedChannel(fallback)
        }
      }
    } catch (error) {
      console.error('Error loading servers and channels:', error)
    }
  }

  // Load messages for a channel
  const loadChannelMessages = async (channelId: string) => {
    if (!channelId) return

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          user_id,
          created_at
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get user emails for all messages
      const userIds = [...new Set(messagesData?.map(msg => msg.user_id) || [])]
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds)

      const userEmailMap = new Map(userData?.map(user => [user.id, user.email]) || [])

      const formattedMessages = messagesData?.map(msg => ({
        id: msg.id,
        content: msg.content,
        user_id: msg.user_id,
        created_at: msg.created_at,
        user: { email: userEmailMap.get(msg.user_id) || 'Unknown' }
      })) || []

      setMessages(prev => ({
        ...prev,
        [channelId]: formattedMessages
      }))
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Send message handler
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChannel || !user) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: selectedChannel,
          user_id: user.id,
          content: messageInput.trim()
        })
        .select(`
          id,
          content,
          user_id,
          created_at
        `)
        .single()

      if (error) throw error

      // Get user email
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', user.id)
        .maybeSingle()

      // Add message to local state
      const newMessage = {
        id: data.id,
        content: data.content,
        user_id: data.user_id,
        created_at: data.created_at,
        user: { email: userData?.email || 'Unknown' }
      }

      setMessages(prev => {
        const list = prev[selectedChannel] || []
        const exists = list.some(m => m.id === newMessage.id)
        return {
          ...prev,
          [selectedChannel]: exists ? list : [...list, newMessage]
        }
      })

      setMessageInput('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // Send vault message handler (for AI agent interactions)
  const handleSendVaultMessage = async () => {
    if (!vaultMessageInput.trim() || !selectedVault || !user) return

    // For now, just add to local state as a simple chat
    // Later this will integrate with AI agents
    const newMessage = {
      id: `vault-${Date.now()}`,
      content: vaultMessageInput.trim(),
      user_id: user.id,
      created_at: new Date().toISOString(),
      user: { email: user.email || 'You' }
    }

    setMessages(prev => ({
      ...prev,
      [`vault-${selectedVault}`]: [...(prev[`vault-${selectedVault}`] || []), newMessage]
    }))

    setVaultMessageInput('')
  }

  // Load server members
  const loadServerMembers = async (serverId: string) => {
    if (!serverId) return

    try {
      const { data: membersData, error } = await supabase
        .from('server_members')
        .select(`
          id,
          user_id,
          role
        `)
        .eq('server_id', serverId)

      if (error) throw error

      // Get user emails for all members
      const userIds = [...new Set(membersData?.map(member => member.user_id) || [])]
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds)

      const userEmailMap = new Map(userData?.map(user => [user.id, user.email]) || [])

      setServerMembers(prev => ({
        ...prev,
        [serverId]: membersData?.map(member => ({
          ...member,
          user_profiles: { email: userEmailMap.get(member.user_id) || 'Unknown' }
        })) || []
      }))
    } catch (error) {
      console.error('Error loading server members:', error)
    }
  }


  // Remove member from server
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedServer || !user) return

    // Check if current user is owner or admin
    const currentMember = serverMembers[selectedServer]?.find(m => m.user_id === user.id)
    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      alert('You do not have permission to remove members.')
      return
    }

    // Prevent removing owner
    const memberToRemove = serverMembers[selectedServer]?.find(m => m.id === memberId)
    if (memberToRemove?.role === 'owner') {
      alert('Cannot remove server owner.')
      return
    }

    try {
      const { error } = await supabase
        .from('server_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      // Reload members
      await loadServerMembers(selectedServer)
      alert('Member removed successfully.')
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member. Please try again.')
    }
  }

  // Load server files
  const loadServerFiles = async (serverId: string) => {
    if (!serverId) return

    try {
      const { data: filesData, error } = await supabase
        .from('server_files')
        .select(`
          id,
          name,
          size,
          uploaded_by,
          created_at
        `)
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get user emails for all uploaders
      const userIds = [...new Set(filesData?.map(file => file.uploaded_by) || [])]
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds)

      const userEmailMap = new Map(userData?.map(user => [user.id, user.email]) || [])

      const formattedFiles = filesData?.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        uploaded_by: (userEmailMap.get(file.uploaded_by) || 'unknown').split('@')[0],
        created_at: file.created_at
      })) || []

      setServerFiles(prev => ({
        ...prev,
        [serverId]: formattedFiles
      }))
    } catch (error) {
      console.error('Error loading server files:', error)
    }
  }

  // Upload file to server
  const handleServerFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedServer || !user) {
      console.warn('Missing required data for file upload')
      return
    }

    const files = event.target.files
    if (!files || files.length === 0) {
      console.warn('No files selected for upload')
      return
    }

    // CAPTURE FILES FIRST before clearing input!
    const filesArray = Array.from(files)

    // Validate file sizes (max 10MB per file)
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = filesArray.filter(file => file.size > maxFileSize)
    
    if (oversizedFiles.length > 0) {
      alert(`Some files are too large (max 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    // Clear the input immediately to prevent double-uploads
    event.target.value = ''

    try {
      // Process files sequentially to avoid overwhelming the server
      const uploadedFiles: Array<{id: string, name: string, size: string, uploaded_by: string, created_at: string | null}> = []
      const failedFiles: Array<{name: string, error: string}> = []

      for (const file of filesArray) {
        try {
          // Generate unique file path for storage
          const fileExt = file.name.split('.').pop() || 'bin'
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `server-${selectedServer}/${fileName}`

          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('server-files')
            .upload(filePath, file)

          if (uploadError) {
            console.error('Storage upload error:', uploadError)
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }

          // Create database record with proper schema
          const fileData = {
            server_id: selectedServer,
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            uploaded_by: user.id,
            file_path: filePath,
            file_type: file.type || 'application/octet-stream'
          }

          const { data: dbData, error: dbError } = await supabase
            .from('server_files')
            .insert(fileData)
            .select(`
              id,
              name,
              size,
              uploaded_by,
              created_at
            `)
            .single()

          if (dbError) {
            console.error('Database insert error:', dbError)
            // If database insert fails, clean up the uploaded file
            try {
              await supabase.storage
                .from('server-files')
                .remove([filePath])
            } catch (cleanupError) {
              console.warn('Failed to cleanup uploaded file:', cleanupError)
            }
            throw dbError
          }

          // Get user email for display (with fallback)
          let userEmail = 'unknown'
          try {
            const { data: userData } = await supabase
              .from('user_profiles')
              .select('email')
              .eq('id', user.id)
              .maybeSingle()
            userEmail = userData?.email || 'unknown'
          } catch (emailError) {
            console.warn('Could not fetch user email:', emailError)
            userEmail = 'unknown'
          }

          uploadedFiles.push({
            id: dbData.id,
            name: dbData.name,
            size: dbData.size,
            uploaded_by: userEmail.split('@')[0],
            created_at: dbData.created_at
          })

        } catch (fileError: any) {
          console.error(`Error uploading file ${file.name}:`, fileError)
          failedFiles.push({ name: file.name, error: fileError.message })
        }
      }

      // Update local state with successfully uploaded files
      if (uploadedFiles.length > 0) {
        setServerFiles(prev => ({
          ...prev,
          [selectedServer]: [...uploadedFiles, ...(prev[selectedServer] || [])]
        }))
      }

      // Show results to user
      if (uploadedFiles.length > 0 && failedFiles.length === 0) {
        alert(`Successfully uploaded ${uploadedFiles.length} file(s)!`)
      } else if (uploadedFiles.length > 0 && failedFiles.length > 0) {
        alert(`Uploaded ${uploadedFiles.length} file(s) successfully. Failed: ${failedFiles.map(f => f.name).join(', ')}`)
      } else {
        alert(`Failed to upload all files: ${failedFiles.map(f => f.name).join(', ')}`)
      }

    } catch (error: any) {
      console.error('Error in file upload process:', error)
      
      // Provide more specific error messages
      if (error.message?.includes('storage')) {
        alert(`Storage error: ${error.message}`)
      } else if (error.code === '23503') {
        alert('Invalid server reference. Please refresh and try again.')
      } else if (error.code === '42501') {
        alert('Permission denied. You may not have access to upload files to this server.')
      } else {
        alert(`Failed to upload files: ${error.message || 'Unknown error'}`)
      }
    }
  }

  // Load shared vaults for server
  const loadSharedVaults = async (serverId: string) => {
    if (!serverId) return

    try {
      const { data: sharedVaultsData, error } = await supabase
        .from('shared_vaults')
        .select(`
          id,
          vault_id,
          vault_name,
          shared_by,
          created_at
        `)
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get user emails for all sharers
      const userIds = [...new Set(sharedVaultsData?.map(shared => shared.shared_by) || [])]
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds)

      const userEmailMap = new Map(userData?.map(user => [user.id, user.email]) || [])

      const formattedSharedVaults = sharedVaultsData?.map(shared => ({
        id: shared.id,
        vault_id: shared.vault_id,
        vault_name: shared.vault_name,
        shared_by: (userEmailMap.get(shared.shared_by) || 'unknown').split('@')[0],
        created_at: shared.created_at
      })) || []

      setSharedVaults(prev => ({
        ...prev,
        [serverId]: formattedSharedVaults
      }))
    } catch (error) {
      console.error('Error loading shared vaults:', error)
    }
  }

  // Share vault with server
  const handleShareVault = async () => {
    console.log('handleShareVault called:', { selectedVaultToShare, selectedServer, user: user?.id })
    if (!selectedVaultToShare || !selectedServer || !user) {
      console.warn('Missing required data for vault sharing:', { selectedVaultToShare, selectedServer, user: user?.id })
      return
    }

    try {
      const vaultToShare = vaults.find(v => v.id === selectedVaultToShare)
      if (!vaultToShare) {
        alert('Vault not found. Please refresh and try again.')
        return
      }

      // Verify user owns the vault
      if (!vaultToShare.user_id || vaultToShare.user_id !== user.id) {
        alert('You can only share vaults that you own.')
        return
      }

      // Check if vault is already shared
      const { data: existingShare, error: checkError } = await supabase
        .from('shared_vaults')
        .select('id, vault_name')
        .eq('server_id', selectedServer)
        .eq('vault_id', selectedVaultToShare)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected
        throw checkError
      }

      if (existingShare) {
        alert(`This vault is already shared with this server as "${existingShare.vault_name}".`)
        return
      }

      // Share the vault
      const { error: shareError } = await supabase
        .from('shared_vaults')
        .insert({
          server_id: selectedServer,
          vault_id: selectedVaultToShare,
          vault_name: vaultToShare.name,
          shared_by: user.id
        })
        .select()
        .single()

      if (shareError) throw shareError

      // Reload shared vaults
      await loadSharedVaults(selectedServer)
      
      // Clear form and close modal
      setSelectedVaultToShare('')
      setShowShareVaultModal(false)
      
      alert(`Successfully shared "${vaultToShare.name}" with the server!`)
    } catch (error: any) {
      console.error('Error sharing vault:', error)
      
      // Provide more specific error messages
      if (error.code === '23505') {
        alert('This vault is already shared with this server.')
      } else if (error.code === '23503') {
        alert('Invalid server or vault reference.')
      } else {
        alert(`Failed to share vault: ${error.message || 'Unknown error'}`)
      }
    }
  }

  // Unshare vault from server
  const handleUnshareVault = async (sharedVaultId: string) => {
    if (!selectedServer || !user) return

    try {
      const { error } = await supabase
        .from('shared_vaults')
        .delete()
        .eq('id', sharedVaultId)

      if (error) throw error

      // Reload shared vaults
      await loadSharedVaults(selectedServer)
      alert('Vault unshared successfully.')
    } catch (error) {
      console.error('Error unsharing vault:', error)
      alert('Failed to unshare vault. Please try again.')
    }
  }

  useEffect(() => {
    if (user) {
      loadUserServersAndChannels()
    } else {
      setServers([])
      setChannels({})
      setSelectedServer('')
      setSelectedChannel('')
    }
  }, [user])


  // Load messages when selected channel changes
  useEffect(() => {
    if (selectedChannel) {
      const currentChannel = channels[selectedServer]?.find(c => c.id === selectedChannel)
      // Only load messages for text channels, not cloud channels
      if (currentChannel?.type === 'text') {
        loadChannelMessages(selectedChannel)
      }
    }
  }, [selectedChannel, selectedServer, channels])

  // Load server members when selected server changes
  useEffect(() => {
    if (selectedServer) {
      loadServerMembers(selectedServer)
      loadServerFiles(selectedServer)
      loadSharedVaults(selectedServer)
    }
  }, [selectedServer])

  // Real-time message subscriptions
  useEffect(() => {
    if (!user) return

    // Subscribe to message changes
    const messageSubscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as any
          
          // Load user profile for the message with proper error handling
          void (async () => {
            try {
              const { data: userData } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('id', newMessage.user_id)
                .maybeSingle()

              const formattedMessage = {
                id: newMessage.id,
                content: newMessage.content,
                user_id: newMessage.user_id,
                created_at: newMessage.created_at,
                user: { email: userData?.email || 'Unknown' }
              }

              setMessages(prev => {
                const list = prev[newMessage.channel_id] || []
                const exists = list.some(m => m.id === newMessage.id)
                return {
                  ...prev,
                  [newMessage.channel_id]: exists ? list : [...list, formattedMessage]
                }
              })
            } catch (error: any) {
              console.warn('Error loading user profile for message:', error)
              // Add message without user email
              const formattedMessage = {
                id: newMessage.id,
                content: newMessage.content,
                user_id: newMessage.user_id,
                created_at: newMessage.created_at,
                user: { email: 'Unknown' }
              }

              setMessages(prev => {
                const list = prev[newMessage.channel_id] || []
                const exists = list.some(m => m.id === newMessage.id)
                return {
                  ...prev,
                  [newMessage.channel_id]: exists ? list : [...list, formattedMessage]
                }
              })
            }
          })()
        }
      )
      .subscribe()

    return () => {
      messageSubscription.unsubscribe()
    }
  }, [user])

  // User presence tracking
  useEffect(() => {
    if (!user) return

    let presenceInterval: NodeJS.Timeout | null = null
    let presenceSubscription: any = null

    // Enhanced presence tracking with proper error handling
    const updatePresence = async () => {
      try {
        const { error } = await supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            last_seen: new Date().toISOString(),
            status: 'online'
          }, {
            onConflict: 'user_id'
          })

        if (error) {
          console.error('Error updating presence:', error)
        }
      } catch (error) {
        console.error('Unexpected error updating presence:', error)
      }
    }

    // Set user as offline when component unmounts
    const setOffline = async () => {
      try {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            last_seen: new Date().toISOString(),
            status: 'offline'
          }, {
            onConflict: 'user_id'
          })
      } catch (error) {
        console.error('Error setting offline status:', error)
      }
    }

    // Update presence immediately
    updatePresence()

    // Update presence every 30 seconds
    presenceInterval = setInterval(updatePresence, 30000)

    // Subscribe to presence changes with better error handling
    presenceSubscription = supabase
      .channel('presence-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_presence' 
        },
        (payload) => {
          try {
            const presenceData = payload.new as any
            if (!presenceData?.user_id) return

            const now = new Date()
            const lastSeen = new Date(presenceData.last_seen)
            const timeDiff = now.getTime() - lastSeen.getTime()
            
            // Consider online if seen within last 2 minutes
            const isOnline = timeDiff < 120000 && presenceData.status === 'online'

            setOnlineUsers(prev => {
              const newSet = new Set(prev)
              if (isOnline) {
                newSet.add(presenceData.user_id)
              } else {
                newSet.delete(presenceData.user_id)
              }
              return newSet
            })
          } catch (error) {
            console.error('Error processing presence update:', error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Presence subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Presence subscription error')
        } else if (status === 'CLOSED') {
          console.log('Presence subscription closed')
        }
      })

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline()
      } else {
        updatePresence()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      if (presenceInterval) {
        clearInterval(presenceInterval)
      }
      
      if (presenceSubscription) {
        presenceSubscription.unsubscribe()
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Set offline status synchronously to avoid async cleanup issues
      try {
        // Use a synchronous approach or fire-and-forget
        void setOffline()
      } catch (error) {
        console.warn('Error in presence cleanup:', error)
      }
    }
  }, [user])

  // Real-time server files updates for the selected server (Server Cloud)
  useEffect(() => {
    if (!user || !selectedServer) return

    const filesChannel = supabase
      .channel(`server-files-${selectedServer}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'server_files',
        filter: `server_id=eq.${selectedServer}`
      }, () => {
        // Refresh files list for current server on insert/update/delete
        void loadServerFiles(selectedServer)
      })
      .subscribe()

    return () => {
      filesChannel.unsubscribe()
    }
  }, [user, selectedServer])

  // No longer needed - data is saved directly to Supabase

  const serverIcons = ['🚀', '🤖', '💻', '🎨', '📊', '🎯', '⚡', '🔧', '🌟', '🔥']


  const handleCategoryRightClick = (e: React.MouseEvent, categoryType: 'text' | 'voice') => {
    e.preventDefault()
    console.log('Right-clicked on category:', categoryType)
    setChannelMenuPosition({ x: e.clientX, y: e.clientY })
    setChannelMenuType('category')
    setChannelMenuTarget({ categoryType })
    setShowChannelMenu(true)
  }

  const handleChannelRightClick = (e: React.MouseEvent, channelId: string) => {
    e.preventDefault()
    console.log('handleChannelRightClick called:', { channelId, clientX: e.clientX, clientY: e.clientY })
    setChannelMenuPosition({ x: e.clientX, y: e.clientY })
    setChannelMenuType('channel')
    setChannelMenuTarget({ channelId })
    setShowChannelMenu(true)
    console.log('Context menu should be visible now')
  }

  const handleCreateChannel = async () => {
    console.log('handleCreateChannel called:', { newChannelName, selectedServer, newChannelType, user: user?.id })
    if (!newChannelName.trim() || !selectedServer) {
      console.log('Missing required data:', { newChannelName: newChannelName.trim(), selectedServer })
      alert('Please enter a channel name')
      return
    }
    
    if (!user) {
      console.log('User not authenticated')
      alert('You must be logged in to create channels')
      return
    }

    try {
      // Use the new RPC function to create channel
      const { error } = await supabase
        .rpc('rpc_create_channel', { 
          _server: selectedServer, 
          _name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
          _type: newChannelType || 'text'
        } as { _name: string; _server: string; _type: string })

      if (error) throw error

      // Channel created successfully

      // Reload channels from database to ensure consistency
      await loadUserServersAndChannels()

      setNewChannelName('')
      setShowCreateChannelForm(false)
      setShowChannelMenu(false)
      alert(`Channel "${newChannelName.trim()}" created successfully!`)
    } catch (error: any) {
      console.error('Error creating channel:', error)
      alert(`Failed to create channel: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    console.log('handleDeleteChannel called:', { channelId, selectedServer, user: user?.id })
    if (!selectedServer) {
      console.log('No selected server')
      return
    }

    // Don't allow deleting server-cloud
    const channel = channels[selectedServer]?.find(c => c.id === channelId)
    console.log('Channel found:', channel)
    if (channel?.type === 'cloud') {
      console.log('Cannot delete server-cloud channel')
      return
    }

    try {
      console.log('Attempting to delete channel:', channelId)
      const { data, error } = await supabase
        .rpc('rpc_delete_channel', { _channel_id: channelId })

      if (error) {
        console.error('Delete channel error:', error)
        throw error
      }
      console.log('Channel deleted successfully:', data)

      setChannels(prev => ({
        ...prev,
        [selectedServer]: prev[selectedServer]?.filter(c => c.id !== channelId) || []
      }))

      if (selectedChannel === channelId) {
        const remainingChannels = channels[selectedServer]?.filter(c => c.id !== channelId) || []
        const cloudChannel = remainingChannels.find(c => c.type === 'cloud')
        setSelectedChannel(cloudChannel ? cloudChannel.id : (remainingChannels.length > 0 ? remainingChannels[0].id : ''))
      }

      setShowChannelMenu(false)
      alert(`Channel "${channel?.name || 'Unknown'}" deleted successfully!`)
    } catch (error: any) {
      console.error('Error deleting channel:', error)
      alert(`Failed to delete channel: ${error.message || 'Unknown error'}`)
    }
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close context menu, not the channel creation form
      // The channel creation form has its own overlay click handler
      if (showChannelMenu) {
        // Check if the click is on the context menu itself
        const contextMenu = document.querySelector('.context-menu')
        if (contextMenu && contextMenu.contains(event.target as Node)) {
          return // Don't close if clicking on the context menu
        }
        setShowChannelMenu(false)
      }
    }
    
    if (showChannelMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showChannelMenu])

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
                🏠 Servers
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
                    <button 
                      className="share-vault-btn"
                      onClick={() => setShowShareVaultModal(true)}
                      title="Share Vault with Server"
                    >
                      🔗 Share
                    </button>
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
              <div className="servers-tab">
                <div className="servers-header">
                  <h3>Servers</h3>
                  <p>Your Discord-like servers</p>
                </div>
                
                {servers.length > 0 ? (
                  <div className="servers-list">
                    {servers.map(server => (
                      <div 
                        key={server.id}
                        className={`server-item ${selectedServer === server.id ? 'active' : ''}`}
                        onClick={() => setSelectedServer(server.id)}
                      >
                        <div className="server-icon">{server.icon}</div>
                        <div className="server-info">
                          <div className="server-name">{server.name}</div>
                          <div className="server-count">{server.memberCount} members</div>
                        </div>
                        <button 
                          className="server-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteServer(server.id)
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-servers">
                    <div className="empty-servers-icon">🏠</div>
                    <h4>No servers yet</h4>
                    <p>Create your first server to start collaborating</p>
                  </div>
                )}
                
                {/* Create Server Section */}
                <div className="create-server-section">
                  {showCreateServer ? (
                    <div className="create-server-form">
                      <input
                        type="text"
                        className="server-name-input"
                        placeholder="Enter server name..."
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateServer()}
                        autoFocus
                      />
                      <div className="server-icon-picker">
                        <label>Choose Icon:</label>
                        <div className="icon-grid">
                          {serverIcons.map(icon => (
                            <button
                              key={icon}
                              className={`icon-btn ${selectedServerIcon === icon ? 'selected' : ''}`}
                              onClick={() => setSelectedServerIcon(icon)}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="create-server-actions">
                        <button className="create-server-btn" onClick={handleCreateServer}>
                          Create
                        </button>
                        <button 
                          className="cancel-server-btn" 
                          onClick={() => {
                            setShowCreateServer(false)
                            setNewServerName('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="add-server-btn" 
                      onClick={() => setShowCreateServer(true)}
                    >
                      <span className="add-icon">+</span>
                      <span>Create New Server</span>
                    </button>
                  )}
                </div>
                
                {/* Invitation buttons - Always visible */}
                <div className="invitation-buttons">
                  <button 
                    className="invite-btn" 
                    onClick={handleGenerateInvite}
                    disabled={!selectedServer}
                  >
                    <span className="invite-icon">📤</span>
                    <span>Generate Invite</span>
                  </button>
                  <button 
                    className="join-btn" 
                    onClick={() => {
                      console.log('Join Server button clicked!');
                      console.log('Current showInviteModal state:', showInviteModal);
                      setShowInviteModal(true);
                      console.log('Set showInviteModal to true');
                    }}
                  >
                    <span className="join-icon">🔗</span>
                    <span>Join Server</span>
                  </button>
                </div>
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
                  {/* Welcome message */}
                  <div className="message assistant-message">
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                      <p>Hello! I'm here to help you with your {vaults.find(v => v.id === selectedVault)?.name} vault. 
                      You can ask me questions about your {activeVaultTab === 'files' ? 'uploaded files' : 'available agents'}.</p>
                    </div>
                  </div>
                  
                  {/* Dynamic messages */}
                  {(messages[`vault-${selectedVault}`] || []).map(message => (
                    <div key={`${message.id}-${message.created_at || ''}`} className={`message ${message.user_id === user?.id ? 'user-message' : 'assistant-message'}`}>
                      {message.user_id === user?.id ? (
                        <>
                          <div className="message-content">
                            <p>{message.content}</p>
                          </div>
                          <div className="message-avatar">👤</div>
                        </>
                      ) : (
                        <>
                          <div className="message-avatar">🤖</div>
                          <div className="message-content">
                            <p>{message.content}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {/* File info message */}
                  {activeVaultTab === 'files' && (
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
                      </div>
                    </div>
                  )}
                  
                  {/* Agent info message */}
                  {activeVaultTab === 'agents' && (
                    <div className="message assistant-message">
                      <div className="message-avatar">🤖</div>
                      <div className="message-content">
                        <p>Available AI agents in this vault:</p>
                        <ul>
                          {(agents.default || []).map(agent => (
                            <li key={agent.id}>🤖 {agent.name} - {agent.description}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="chat-input-container">
                  <div className="chat-input-wrapper">
                    <input 
                      type="text" 
                      className="chat-input" 
                      placeholder={`Ask about your ${activeVaultTab}...`}
                      value={vaultMessageInput}
                      onChange={(e) => setVaultMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendVaultMessage()}
                    />
                    <button className="send-button" onClick={handleSendVaultMessage}>
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
          ) : servers.length > 0 ? (
            <div className="server-layout">
              {/* Main Content Area */}
              <div className="server-main-content">
                {(() => {
                  const currentChannel = channels[selectedServer]?.find(c => c.id === selectedChannel)
                  return currentChannel?.type === 'cloud'
                })() ? (
                  <div className="cloud-interface">
                    <div className="cloud-header">
                      <h2>☁️ Server Cloud</h2>
                      <p>Collaborate on files with your team</p>
                    </div>
                    
                    <div className="cloud-files">
                      <div className="cloud-upload-section">
                        <label className="cloud-upload-btn">
                          <input 
                            type="file" 
                            multiple 
                            style={{ display: 'none' }} 
                            onChange={handleServerFileUpload}
                          />
                          <span className="upload-icon">📤</span>
                          <span>Upload Files</span>
                        </label>
                      </div>
                      
                      <div className="cloud-files-grid">
                        {(serverFiles[selectedServer] || []).map(file => (
                          <div key={file.id} className="cloud-file-item">
                            <div className="file-icon">
                              {file.name.endsWith('.pdf') ? '📄' : 
                               file.name.endsWith('.fig') ? '🎨' : 
                               file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? '📊' :
                               file.name.endsWith('.doc') || file.name.endsWith('.docx') ? '📝' :
                               file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.gif') ? '🖼️' :
                               file.name.endsWith('.mp4') || file.name.endsWith('.avi') ? '🎥' :
                               file.name.endsWith('.zip') || file.name.endsWith('.rar') ? '📦' : '📄'}
                            </div>
                            <div className="file-name">{file.name}</div>
                            <div className="file-meta">{file.size} • {file.uploaded_by}</div>
                          </div>
                        ))}
                        
                        {/* Show sample files if no real files */}
                        {(serverFiles[selectedServer] || []).length === 0 && (
                          <div className="empty-state">
                            <div className="empty-icon">📁</div>
                            <div className="empty-text">No files uploaded yet</div>
                            <div className="empty-subtext">Upload files to collaborate with your team</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="channel-interface">
                    <div className="channel-header-bar">
                      <span className="channel-hash">#</span>
                      <span className="channel-name">{channels[selectedServer]?.find(c => c.id === selectedChannel)?.name || 'general'}</span>
                      <div className="channel-divider">|</div>
                      <span className="channel-description">Channel for team discussion</span>
                      
                      <div className="channel-actions">
                        <button 
                          className="member-count-btn"
                          onClick={() => setShowMemberList(!showMemberList)}
                          title="View Members"
                        >
                          👥 {serverMembers[selectedServer]?.length || 0}
                        </button>
                        <button 
                          className="invite-btn"
                          onClick={() => setShowInviteModal(true)}
                          title="Invite Members"
                        >
                          ➕
                        </button>
                      </div>
                    </div>
                    
                    <div className="channel-content">
                      <div className="welcome-message">
                        <h3>Welcome to #{channels[selectedServer]?.find(c => c.id === selectedChannel)?.name || 'general'}!</h3>
                        <p>This is the start of your conversation in this channel.</p>
                      </div>
                      
                      <div className="sample-messages">
                        {(messages[selectedChannel] || []).map(message => (
                          <div key={`${message.id}-${message.created_at || ''}`} className="message">
                            <div className="message-avatar">
                              {message.user_id === user?.id ? '👤' : '👩‍💻'}
                            </div>
                            <div className="message-content">
                              <div className="message-header">
                                <span className="username">
                                  {message.user_id === user?.id ? 'You' : (message.user?.email?.split('@')[0] || 'User')}
                                </span>
                                <span className="timestamp">
                                  {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}
                                </span>
                              </div>
                              <div className="message-text">{message.content}</div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Show empty state if no real messages */}
                        {(messages[selectedChannel] || []).length === 0 && (
                          <div className="empty-state">
                            <div className="empty-icon">💬</div>
                            <div className="empty-text">No messages yet</div>
                            <div className="empty-subtext">Start the conversation!</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="message-input-area">
                      <div className="message-input-wrapper">
                        <input 
                          type="text" 
                          className="message-input" 
                          placeholder={`Message #${channels[selectedServer]?.find(c => c.id === selectedChannel)?.name || 'general'}`}
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button className="send-btn" onClick={handleSendMessage}>➤</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Channel Sidebar - Right Side */}
              <div className="channel-sidebar">
                <div className="channel-header">
                  <h3>{servers.find(s => s.id === selectedServer)?.name || 'Server'}</h3>
                  <div className="server-dropdown">▼</div>
                </div>
                
                <div className="channel-categories">
                  {/* Server Cloud Channel - Always present, no category header */}
                  {(channels[selectedServer] || []).filter(c => c.type === 'cloud').map(channel => (
                    <div 
                      key={channel.id}
                      className={`channel-item cloud-channel ${selectedChannel === channel.id ? 'active' : ''}`}
                      onClick={() => setSelectedChannel(channel.id)}
                    >
                      <span className="channel-hash">☁️</span>
                      <span className="channel-name">{channel.name}</span>
                    </div>
                  ))}
                  
                  {/* Spacer between server-cloud and text channels */}
                  <div className="channel-spacer"></div>
                  
                  <div className="channel-category">
                    <div 
                      className="category-header"
                      onContextMenu={(e) => handleCategoryRightClick(e, 'text')}
                    >
                      <span className="category-arrow">▼</span>
                      <span className="category-name">TEXT CHANNELS</span>
                      <button 
                        className="add-channel-btn-header"
                        onClick={() => {
                          setNewChannelType('text')
                          setShowCreateChannelForm(true)
                        }}
                      >
                        +
                      </button>
                    </div>
                    {(channels[selectedServer] || []).filter(c => c.type === 'text').map(channel => (
                      <div 
                        key={channel.id}
                        className={`channel-item ${selectedChannel === channel.id ? 'active' : ''}`}
                        onClick={() => setSelectedChannel(channel.id)}
                        onContextMenu={(e) => handleChannelRightClick(e, channel.id)}
                      >
                        <span className="channel-hash">#</span>
                        <span className="channel-name">{channel.name}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="channel-category">
                    <div 
                      className="category-header"
                      onContextMenu={(e) => handleCategoryRightClick(e, 'voice')}
                    >
                      <span className="category-arrow">▼</span>
                      <span className="category-name">VOICE CHANNELS</span>
                      <button 
                        className="add-channel-btn-header"
                        onClick={() => {
                          setNewChannelType('voice')
                          setShowCreateChannelForm(true)
                        }}
                      >
                        +
                      </button>
                    </div>
                    {(channels[selectedServer] || []).filter(c => c.type === 'voice').map(channel => (
                      <div 
                        key={channel.id}
                        className="channel-item voice-channel"
                        onContextMenu={(e) => handleChannelRightClick(e, channel.id)}
                      >
                        <span className="channel-hash">🔊</span>
                        <span className="channel-name">{channel.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-server-content">
              <div className="no-server-content-icon">🏠</div>
              <h2>No Servers Yet</h2>
              <p>Create your first server to start collaborating with your team</p>
              <button className="create-first-server-btn" onClick={() => setShowCreateServer(true)}>
                Create Your First Server
              </button>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {showChannelMenu && (
          <div 
            className="context-menu"
            style={{
              position: 'fixed',
              left: channelMenuPosition.x,
              top: channelMenuPosition.y,
              zIndex: 1000
            }}
          >
            {channelMenuType === 'category' ? (
              <div className="context-menu-item" onClick={() => {
                console.log('Clicked Create Channel in context menu')
                setShowChannelMenu(false)
                setShowCreateChannelForm(true)
              }}>
                Create Channel
              </div>
            ) : (
              <div 
                className="context-menu-item delete" 
                onClick={() => {
                  console.log('Delete Channel clicked:', { channelMenuTarget, channelId: channelMenuTarget.channelId })
                  if (channelMenuTarget.channelId) {
                    handleDeleteChannel(channelMenuTarget.channelId)
                  } else {
                    console.error('No channelId in channelMenuTarget:', channelMenuTarget)
                  }
                }}
              >
                Delete Channel
              </div>
            )}
          </div>
        )}

        {/* Channel Creation Form */}
        {showCreateChannelForm && (
          <div className="modal-overlay" onClick={() => setShowCreateChannelForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Create Channel</h3>
                <button className="close-btn" onClick={() => setShowCreateChannelForm(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Channel Type</label>
                  <select 
                    value={newChannelType} 
                    onChange={(e) => setNewChannelType(e.target.value as 'text' | 'voice')}
                    className="form-input"
                  >
                    <option value="text"># Text Channel</option>
                    <option value="voice">🔊 Voice Channel</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Channel Name</label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="new-channel"
                    className="form-input"
                    autoFocus
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setShowCreateChannelForm(false)
                      setNewChannelName('')
                    }}
                  >
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleCreateChannel}>
                    Create Channel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Server Invitation Modal */}
        {showInviteModal && (
          <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Join Server</h3>
                <button 
                  className="close-btn" 
                  onClick={() => setShowInviteModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p>Enter an invite code to join a server:</p>
                <input
                  type="text"
                  className="invite-code-input"
                  placeholder="Enter invite code..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAcceptInvite()}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleAcceptInvite}
                  disabled={!inviteCode.trim()}
                >
                  Join Server
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invite Code Modal */}
        {showInviteCodeModal && (
          <div className="modal-overlay" onClick={() => setShowInviteCodeModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Invite Code</h3>
                <button className="close-btn" onClick={() => setShowInviteCodeModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Share this code to invite others to your server:</p>
                <div className="invite-code-box" style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteCode}
                    className="invite-code-input"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedInviteCode)
                        alert('Invite code copied to clipboard!')
                      } catch {
                        alert('Could not copy. Select the text and copy manually.')
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowInviteCodeModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
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

      {/* Member List Modal */}
      {showMemberList && (
        <div className="modal-overlay" onClick={() => setShowMemberList(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Server Members</h3>
              <button className="close-btn" onClick={() => setShowMemberList(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="member-list">
                {(serverMembers[selectedServer] || []).map(member => (
                  <div key={member.id} className="member-item">
                    <div className="member-info">
                      <div className="member-avatar">
                        👤
                        {onlineUsers.has(member.user_id) && (
                          <div className="online-indicator"></div>
                        )}
                      </div>
                      <div className="member-details">
                        <span className="member-name">
                          {(member.user_profiles.email || 'unknown').split('@')[0]}
                          {onlineUsers.has(member.user_id) && (
                            <span className="online-status">● Online</span>
                          )}
                        </span>
                        <span className="member-role">{member.role}</span>
                      </div>
                    </div>
                    {member.role !== 'owner' && (
                      <button 
                        className="remove-member-btn"
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove Member"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Vault Modal */}
      {showShareVaultModal && (
        <div className="modal-overlay" onClick={() => setShowShareVaultModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Vault with Server</h3>
              <button className="close-btn" onClick={() => setShowShareVaultModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="share-form">
                <label htmlFor="vault-select">Select Vault to Share</label>
                <select
                  id="vault-select"
                  value={selectedVaultToShare}
                  onChange={(e) => setSelectedVaultToShare(e.target.value)}
                >
                  <option value="">Choose a vault...</option>
                  {vaults.map(vault => (
                    <option key={vault.id} value={vault.id}>{vault.name}</option>
                  ))}
                </select>
                
                <div className="shared-vaults-list">
                  <h4>Currently Shared Vaults</h4>
                  {(sharedVaults[selectedServer] || []).map(sharedVault => (
                    <div key={sharedVault.id} className="shared-vault-item">
                      <div className="shared-vault-info">
                        <span className="vault-name">🗄️ {sharedVault.vault_name}</span>
                        <span className="shared-by">Shared by {sharedVault.shared_by}</span>
                      </div>
                      <button 
                        className="unshare-btn"
                        onClick={() => handleUnshareVault(sharedVault.id)}
                        title="Unshare Vault"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  
                  {(sharedVaults[selectedServer] || []).length === 0 && (
                    <p className="no-shared-vaults">No vaults shared yet.</p>
                  )}
                </div>
                
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowShareVaultModal(false)}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleShareVault}
                    disabled={!selectedVaultToShare}
                  >
                    Share Vault
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Server Invitation Modal moved into authenticated view above */}
    </div>
  )
}



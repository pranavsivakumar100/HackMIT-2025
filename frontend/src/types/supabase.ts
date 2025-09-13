export interface Database {
  public: {
    Tables: {
      vaults: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          vault_id: string
          name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          vault_id: string
          name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          vault_id?: string
          name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          uploaded_at?: string
        }
      }
    }
  }
}

export type Vault = Database['public']['Tables']['vaults']['Row']
export type File = Database['public']['Tables']['files']['Row']
export type VaultInsert = Database['public']['Tables']['vaults']['Insert']
export type FileInsert = Database['public']['Tables']['files']['Insert']

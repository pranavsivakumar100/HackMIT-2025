export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      channel_attrs: {
        Row: {
          channel_id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          channel_id: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          channel_id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "channel_attrs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string | null
          id: string
          name: string
          server_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          server_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          server_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      chunk_embeddings: {
        Row: {
          chunk_idx: number
          chunk_metadata: Json | null
          chunk_text: string | null
          created_at: string | null
          embedding: string
          file_id: string
        }
        Insert: {
          chunk_idx: number
          chunk_metadata?: Json | null
          chunk_text?: string | null
          created_at?: string | null
          embedding: string
          file_id: string
        }
        Update: {
          chunk_idx?: number
          chunk_metadata?: Json | null
          chunk_text?: string | null
          created_at?: string | null
          embedding?: string
          file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunk_embeddings_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          file_path: string
          file_size: number
          file_type: string | null
          id: string
          name: string
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string | null
          uploaded_at: string | null
          vault_id: string | null
        }
        Insert: {
          file_path: string
          file_size: number
          file_type?: string | null
          id?: string
          name: string
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          uploaded_at?: string | null
          vault_id?: string | null
        }
        Update: {
          file_path?: string
          file_size?: number
          file_type?: string | null
          id?: string
          name?: string
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          uploaded_at?: string | null
          vault_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          reply_to: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          reply_to?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          reply_to?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      server_files: {
        Row: {
          created_at: string | null
          file_path: string | null
          file_type: string | null
          id: string
          name: string
          server_id: string
          size: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          name: string
          server_id: string
          size: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          name?: string
          server_id?: string
          size?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_files_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_invites: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          invite_code: string
          max_uses: number | null
          server_id: string
          uses_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          invite_code: string
          max_uses?: number | null
          server_id: string
          uses_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          max_uses?: number | null
          server_id?: string
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "server_invites_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_members: {
        Row: {
          id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["server_role"] | null
          server_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["server_role"] | null
          server_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["server_role"] | null
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_vault_links: {
        Row: {
          linked_at: string
          linked_by: string
          perms: string[]
          server_id: string
          vault_id: string
        }
        Insert: {
          linked_at?: string
          linked_by: string
          perms?: string[]
          server_id: string
          vault_id: string
        }
        Update: {
          linked_at?: string
          linked_by?: string
          perms?: string[]
          server_id?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_vault_links_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_vault_links_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      shared_vaults: {
        Row: {
          created_at: string | null
          id: string
          server_id: string
          shared_by: string
          updated_at: string | null
          vault_id: string
          vault_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          server_id: string
          shared_by: string
          updated_at?: string | null
          vault_id: string
          vault_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          server_id?: string
          shared_by?: string
          updated_at?: string | null
          vault_id?: string
          vault_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_vaults_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_vaults_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string | null
          last_seen: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          google_drive_access_token: string | null
          google_drive_connected: boolean | null
          google_drive_refresh_token: string | null
          google_drive_token_expires_at: string | null
          id: string
          is_first_login: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          google_drive_access_token?: string | null
          google_drive_connected?: boolean | null
          google_drive_refresh_token?: string | null
          google_drive_token_expires_at?: string | null
          id?: string
          is_first_login?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          google_drive_access_token?: string | null
          google_drive_connected?: boolean | null
          google_drive_refresh_token?: string | null
          google_drive_token_expires_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      voice_presence: {
        Row: {
          channel_id: string
          user_id: string
          user_name: string
          joined_at: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          user_id: string
          user_name: string
          joined_at?: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          user_id?: string
          user_name?: string
          joined_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_presence_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_permission_names: {
        Row: {
          perm: string
        }
        Insert: {
          perm: string
        }
        Update: {
          perm?: string
        }
        Relationships: []
      }
      vault_shares: {
        Row: {
          granted_at: string
          granted_by: string
          grantee_id: string
          perms: string[]
          vault_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          grantee_id: string
          perms: string[]
          vault_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          grantee_id?: string
          perms?: string[]
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_shares_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      vaults: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_vault_perm: {
        Args: { _perm: string; _uid: string; _vault_id: string }
        Returns: boolean
      }
      is_owner_or_admin: {
        Args: { _sid: string; _uid: string }
        Returns: boolean
      }
      is_server_member: {
        Args: { _sid: string; _uid: string }
        Returns: boolean
      }
      rpc_accept_server_invite: {
        Args: { _invite_code: string }
        Returns: string
      }
      rpc_add_member: {
        Args: {
          _role?: Database["public"]["Enums"]["server_role"]
          _server: string
          _user: string
        }
        Returns: undefined
      }
      rpc_create_channel: {
        Args: { _name: string; _server: string; _type?: string }
        Returns: string
      }
      rpc_delete_channel: {
        Args: { _channel_id: string }
        Returns: boolean
      }
      rpc_create_server: {
        Args: { _icon?: string; _name: string }
        Returns: string
      }
      rpc_create_server_invite: {
        Args: { _expires_at?: string; _max_uses?: number; _server_id: string }
        Returns: string
      }
      rpc_link_vault_to_server: {
        Args: { _perms: string[]; _server: string; _vault: string }
        Returns: undefined
      }
      rpc_set_channel_attr: {
        Args: { _channel: string; _key: string; _value: Json }
        Returns: undefined
      }
      rpc_share_vault_with_user: {
        Args: { _grantee: string; _perms: string[]; _vault: string }
        Returns: undefined
      }
      server_role_of: {
        Args: { _sid: string; _uid: string }
        Returns: Database["public"]["Enums"]["server_role"]
      }
      rpc_get_server_member_counts: {
        Args: { _server_ids: string[] }
        Returns: { server_id: string; member_count: number }[]
      }
    }
    Enums: {
      server_role: "OWNER" | "ADMIN" | "MEMBER" | "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      server_role: ["OWNER", "ADMIN", "MEMBER", "owner", "admin", "member"],
    },
  },
} as const

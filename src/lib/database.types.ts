export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      databases: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          sort: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          sort?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          sort?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      link_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          theme: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          handle: string
          id?: string
          theme?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          theme?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      links: {
        Row: {
          clicks: number
          created_at: string
          enabled: boolean
          id: string
          position: number
          profile_id: string
          title: string
          url: string
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          profile_id: string
          title: string
          url: string
          user_id?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          profile_id?: string
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'links_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'link_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      pages: {
        Row: {
          content: Json | null
          created_at: string
          database_id: string
          icon: string | null
          id: string
          position: number
          title: string
          updated_at: string
          user_id: string
          values: Json
        }
        Insert: {
          content?: Json | null
          created_at?: string
          database_id: string
          icon?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Update: {
          content?: Json | null
          created_at?: string
          database_id?: string
          icon?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'pages_database_id_fkey'
            columns: ['database_id']
            isOneToOne: false
            referencedRelation: 'databases'
            referencedColumns: ['id']
          },
        ]
      }
      properties: {
        Row: {
          created_at: string
          database_id: string
          id: string
          name: string
          options: Json
          position: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          database_id: string
          id?: string
          name: string
          options?: Json
          position?: number
          type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          database_id?: string
          id?: string
          name?: string
          options?: Json
          position?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'properties_database_id_fkey'
            columns: ['database_id']
            isOneToOne: false
            referencedRelation: 'databases'
            referencedColumns: ['id']
          },
        ]
      }
      transcripts: {
        Row: {
          created_at: string
          duration_sec: number | null
          error: string | null
          id: string
          language: string | null
          page_id: string | null
          segments: Json
          source: string
          status: string
          text: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          error?: string | null
          id?: string
          language?: string | null
          page_id?: string | null
          segments?: Json
          source: string
          status?: string
          text?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          error?: string | null
          id?: string
          language?: string | null
          page_id?: string | null
          segments?: Json
          source?: string
          status?: string
          text?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transcripts_page_id_fkey'
            columns: ['page_id']
            isOneToOne: false
            referencedRelation: 'pages'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_profile_view: { Args: { p_handle: string }; Returns: undefined }
      track_link_click: { Args: { p_link_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

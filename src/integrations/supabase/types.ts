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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      agenda_koppelingen: {
        Row: {
          created_at: string
          gebruiker_id: string
          gezin_id: string
          ical_url: string
          id: string
          label: string | null
        }
        Insert: {
          created_at?: string
          gebruiker_id: string
          gezin_id: string
          ical_url: string
          id?: string
          label?: string | null
        }
        Update: {
          created_at?: string
          gebruiker_id?: string
          gezin_id?: string
          ical_url?: string
          id?: string
          label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_koppelingen_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      prikbord_items: {
        Row: {
          created_at: string
          created_by: string | null
          gezin_id: string
          id: string
          storage_pad: string | null
          tags: string[]
          tekst: string
          updated_at: string
          vastgepind: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gezin_id: string
          id?: string
          storage_pad?: string | null
          tags?: string[]
          tekst: string
          updated_at?: string
          vastgepind?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gezin_id?: string
          id?: string
          storage_pad?: string | null
          tags?: string[]
          tekst?: string
          updated_at?: string
          vastgepind?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "prikbord_items_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_items: {
        Row: {
          created_at: string
          created_by: string | null
          datum: string
          gezin_id: string
          id: string
          notitie: string | null
          tijd: string | null
          titel: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          datum: string
          gezin_id: string
          id?: string
          notitie?: string | null
          tijd?: string | null
          titel: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          datum?: string
          gezin_id?: string
          id?: string
          notitie?: string | null
          tijd?: string | null
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      boodschappen_items: {
        Row: {
          afgevinkt: boolean
          bron_recept_id: string | null
          created_at: string
          created_by: string | null
          gezin_id: string
          id: string
          naam: string
          updated_at: string
        }
        Insert: {
          afgevinkt?: boolean
          bron_recept_id?: string | null
          created_at?: string
          created_by?: string | null
          gezin_id: string
          id?: string
          naam: string
          updated_at?: string
        }
        Update: {
          afgevinkt?: boolean
          bron_recept_id?: string | null
          created_at?: string
          created_by?: string | null
          gezin_id?: string
          id?: string
          naam?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boodschappen_items_bron_recept_id_fkey"
            columns: ["bron_recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boodschappen_items_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      dagelijkse_fotos: {
        Row: {
          bijschrift: string | null
          created_at: string
          datum: string
          gebruiker_id: string
          gezin_id: string
          id: string
          storage_pad: string
        }
        Insert: {
          bijschrift?: string | null
          created_at?: string
          datum: string
          gebruiker_id: string
          gezin_id: string
          id?: string
          storage_pad: string
        }
        Update: {
          bijschrift?: string | null
          created_at?: string
          datum?: string
          gebruiker_id?: string
          gezin_id?: string
          id?: string
          storage_pad?: string
        }
        Relationships: [
          {
            foreignKeyName: "dagelijkse_fotos_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      gezin_uitnodigingen: {
        Row: {
          code: string
          created_at: string
          created_by: string
          gebruikt_door: string | null
          gebruikt_op: string | null
          gezin_id: string
          id: string
          rol: Database["public"]["Enums"]["app_rol"]
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          gebruikt_door?: string | null
          gebruikt_op?: string | null
          gezin_id: string
          id?: string
          rol: Database["public"]["Enums"]["app_rol"]
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          gebruikt_door?: string | null
          gebruikt_op?: string | null
          gezin_id?: string
          id?: string
          rol?: Database["public"]["Enums"]["app_rol"]
        }
        Relationships: [
          {
            foreignKeyName: "gezin_uitnodigingen_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      gezinnen: {
        Row: {
          created_at: string
          id: string
          naam: string
        }
        Insert: {
          created_at?: string
          id?: string
          naam: string
        }
        Update: {
          created_at?: string
          id?: string
          naam?: string
        }
        Relationships: []
      }
      klusjes: {
        Row: {
          afgerond: boolean
          afgerond_door: string | null
          afgerond_op: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          gezin_id: string
          id: string
          titel: string
          toegewezen_aan: string | null
          updated_at: string
        }
        Insert: {
          afgerond?: boolean
          afgerond_door?: string | null
          afgerond_op?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          gezin_id: string
          id?: string
          titel: string
          toegewezen_aan?: string | null
          updated_at?: string
        }
        Update: {
          afgerond?: boolean
          afgerond_door?: string | null
          afgerond_op?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          gezin_id?: string
          id?: string
          titel?: string
          toegewezen_aan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "klusjes_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_initial: string | null
          created_at: string
          geboortedatum: string | null
          gezin_id: string | null
          id: string
          naam: string
          rol: Database["public"]["Enums"]["app_rol"]
        }
        Insert: {
          avatar_initial?: string | null
          created_at?: string
          geboortedatum?: string | null
          gezin_id?: string | null
          id: string
          naam: string
          rol?: Database["public"]["Enums"]["app_rol"]
        }
        Update: {
          avatar_initial?: string | null
          created_at?: string
          geboortedatum?: string | null
          gezin_id?: string | null
          id?: string
          naam?: string
          rol?: Database["public"]["Enums"]["app_rol"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      recepten: {
        Row: {
          bereidingstijd_minuten: number | null
          beschrijving: string | null
          created_at: string
          created_by: string | null
          gezin_id: string
          id: string
          ingredienten: string[]
          instructies: string | null
          porties: number | null
          titel: string
          updated_at: string
        }
        Insert: {
          bereidingstijd_minuten?: number | null
          beschrijving?: string | null
          created_at?: string
          created_by?: string | null
          gezin_id: string
          id?: string
          ingredienten?: string[]
          instructies?: string | null
          porties?: number | null
          titel: string
          updated_at?: string
        }
        Update: {
          bereidingstijd_minuten?: number | null
          beschrijving?: string | null
          created_at?: string
          created_by?: string | null
          gezin_id?: string
          id?: string
          ingredienten?: string[]
          instructies?: string | null
          porties?: number | null
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recepten_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
        ]
      }
      weekmenu_items: {
        Row: {
          created_at: string
          created_by: string | null
          datum: string
          gezin_id: string
          id: string
          kok: string | null
          notitie: string | null
          recept_id: string | null
          titel: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          datum: string
          gezin_id: string
          id?: string
          kok?: string | null
          notitie?: string | null
          recept_id?: string | null
          titel: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          datum?: string
          gezin_id?: string
          id?: string
          kok?: string | null
          notitie?: string | null
          recept_id?: string | null
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekmenu_items_gezin_id_fkey"
            columns: ["gezin_id"]
            isOneToOne: false
            referencedRelation: "gezinnen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekmenu_items_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_gezin_id: { Args: never; Returns: string }
      current_rol: {
        Args: never
        Returns: Database["public"]["Enums"]["app_rol"]
      }
      gezin_aanmaken: { Args: { p_naam: string }; Returns: string }
      gezin_lid_worden: { Args: { p_code: string }; Returns: undefined }
      gezin_uitnodiging_aanmaken: {
        Args: { p_rol: Database["public"]["Enums"]["app_rol"] }
        Returns: string
      }
      heeft_eigen_foto_op: { Args: { _datum: string }; Returns: boolean }
    }
    Enums: {
      app_rol: "ouder" | "kind"
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
      app_rol: ["ouder", "kind"],
    },
  },
} as const

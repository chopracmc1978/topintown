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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cheese_options: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          is_default: boolean
          name: string
          price_extra: number
          price_regular: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          is_default?: boolean
          name: string
          price_extra?: number
          price_regular?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          is_default?: boolean
          name?: string
          price_extra?: number
          price_regular?: number
          sort_order?: number
        }
        Relationships: []
      }
      crust_options: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean
          full_name: string | null
          id: string
          password_hash: string | null
          phone: string
          phone_verified: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          password_hash?: string | null
          phone: string
          phone_verified?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          password_hash?: string | null
          phone?: string
          phone_verified?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      free_toppings: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      global_sauces: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      item_default_global_sauces: {
        Row: {
          created_at: string
          global_sauce_id: string
          id: string
          menu_item_id: string
        }
        Insert: {
          created_at?: string
          global_sauce_id: string
          id?: string
          menu_item_id: string
        }
        Update: {
          created_at?: string
          global_sauce_id?: string
          id?: string
          menu_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_default_global_sauces_global_sauce_id_fkey"
            columns: ["global_sauce_id"]
            isOneToOne: false
            referencedRelation: "global_sauces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_default_global_sauces_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_default_sauces: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          sauce_option_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          sauce_option_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          sauce_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_default_sauces_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_default_sauces_sauce_option_id_fkey"
            columns: ["sauce_option_id"]
            isOneToOne: false
            referencedRelation: "sauce_options"
            referencedColumns: ["id"]
          },
        ]
      }
      item_default_toppings: {
        Row: {
          created_at: string
          id: string
          is_removable: boolean
          menu_item_id: string
          topping_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_removable?: boolean
          menu_item_id: string
          topping_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_removable?: boolean
          menu_item_id?: string
          topping_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_default_toppings_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_default_toppings_topping_id_fkey"
            columns: ["topping_id"]
            isOneToOne: false
            referencedRelation: "toppings"
            referencedColumns: ["id"]
          },
        ]
      }
      item_sizes: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          name: string
          price: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_sizes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          base_price: number
          category: Database["public"]["Enums"]["menu_category"]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_popular: boolean
          name: string
          sort_order: number
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number
          category: Database["public"]["Enums"]["menu_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_popular?: boolean
          name: string
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: Database["public"]["Enums"]["menu_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_popular?: boolean
          name?: string
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          customizations: Json | null
          id: string
          menu_item_id: string | null
          name: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          customizations?: Json | null
          id?: string
          menu_item_id?: string | null
          name: string
          order_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          customizations?: Json | null
          id?: string
          menu_item_id?: string | null
          name?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          location_id: string
          notes: string | null
          order_number: string
          order_type: string
          payment_method: string | null
          payment_status: string
          source: string
          status: string
          subtotal: number
          table_number: string | null
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          location_id: string
          notes?: string | null
          order_number: string
          order_type?: string
          payment_method?: string | null
          payment_status?: string
          source?: string
          status?: string
          subtotal?: number
          table_number?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          order_number?: string
          order_type?: string
          payment_method?: string | null
          payment_status?: string
          source?: string
          status?: string
          subtotal?: number
          table_number?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          customer_id: string | null
          email: string | null
          expires_at: string
          id: string
          phone: string | null
          type: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          customer_id?: string | null
          email?: string | null
          expires_at: string
          id?: string
          phone?: string | null
          type: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          phone?: string | null
          type?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "otp_codes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          location_id: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          location_id?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          location_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      sauce_groups: {
        Row: {
          created_at: string
          id: string
          max_selection: number
          menu_item_id: string
          min_selection: number
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_selection?: number
          menu_item_id: string
          min_selection?: number
          name?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          max_selection?: number
          menu_item_id?: string
          min_selection?: number
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sauce_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sauce_options: {
        Row: {
          created_at: string
          has_spicy_option: boolean
          id: string
          is_available: boolean
          is_free: boolean
          name: string
          price: number
          sauce_group_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          has_spicy_option?: boolean
          id?: string
          is_available?: boolean
          is_free?: boolean
          name: string
          price?: number
          sauce_group_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          has_spicy_option?: boolean
          id?: string
          is_available?: boolean
          is_free?: boolean
          name?: string
          price?: number
          sauce_group_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sauce_options_sauce_group_id_fkey"
            columns: ["sauce_group_id"]
            isOneToOne: false
            referencedRelation: "sauce_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      size_crust_availability: {
        Row: {
          created_at: string
          crust_id: string
          id: string
          size_name: string
        }
        Insert: {
          created_at?: string
          crust_id: string
          id?: string
          size_name: string
        }
        Update: {
          created_at?: string
          crust_id?: string
          id?: string
          size_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_crust_availability_crust_id_fkey"
            columns: ["crust_id"]
            isOneToOne: false
            referencedRelation: "crust_options"
            referencedColumns: ["id"]
          },
        ]
      }
      toppings: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          is_veg: boolean
          name: string
          price: number
          price_large: number
          price_medium: number
          price_small: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          is_veg?: boolean
          name: string
          price?: number
          price_large?: number
          price_medium?: number
          price_small?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          is_veg?: boolean
          name?: string
          price?: number
          price_large?: number
          price_medium?: number
          price_small?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_order_number: { Args: { p_location_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
      menu_category:
        | "pizza"
        | "sides"
        | "drinks"
        | "desserts"
        | "dipping_sauce"
        | "chicken_wings"
        | "baked_lasagna"
      sauce_quantity: "regular" | "extra"
      spicy_level: "none" | "mild" | "medium" | "hot"
      topping_quantity: "none" | "less" | "regular" | "extra"
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
      app_role: ["admin", "staff", "user"],
      menu_category: [
        "pizza",
        "sides",
        "drinks",
        "desserts",
        "dipping_sauce",
        "chicken_wings",
        "baked_lasagna",
      ],
      sauce_quantity: ["regular", "extra"],
      spicy_level: ["none", "mild", "medium", "hot"],
      topping_quantity: ["none", "less", "regular", "extra"],
    },
  },
} as const

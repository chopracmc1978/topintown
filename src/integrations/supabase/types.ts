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
      checkout_drafts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          payload: Json
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          payload: Json
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: []
      }
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
      combo_items: {
        Row: {
          combo_id: string
          created_at: string
          id: string
          is_chargeable: boolean
          is_required: boolean
          item_type: string
          quantity: number
          size_restriction: string | null
          sort_order: number
        }
        Insert: {
          combo_id: string
          created_at?: string
          id?: string
          is_chargeable?: boolean
          is_required?: boolean
          item_type: string
          quantity?: number
          size_restriction?: string | null
          sort_order?: number
        }
        Update: {
          combo_id?: string
          created_at?: string
          id?: string
          is_chargeable?: boolean
          is_required?: boolean
          item_type?: string
          quantity?: number
          size_restriction?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          schedule_dates: number[] | null
          schedule_days: number[] | null
          schedule_type: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          schedule_dates?: number[] | null
          schedule_days?: number[] | null
          schedule_type?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          schedule_dates?: number[] | null
          schedule_days?: number[] | null
          schedule_type?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string | null
          customer_id: string | null
          discount_applied: number
          id: string
          order_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          customer_id?: string | null
          discount_applied: number
          id?: string
          order_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          customer_id?: string | null
          discount_applied?: number
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          schedule_dates: number[] | null
          schedule_days: number[] | null
          schedule_type: string | null
          show_on_homepage: boolean | null
          starts_at: string | null
          updated_at: string | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          schedule_dates?: number[] | null
          schedule_days?: number[] | null
          schedule_type?: string | null
          show_on_homepage?: boolean | null
          starts_at?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          schedule_dates?: number[] | null
          schedule_days?: number[] | null
          schedule_type?: string | null
          show_on_homepage?: boolean | null
          starts_at?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
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
      customer_rewards: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          lifetime_points: number
          phone: string
          points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          lifetime_points?: number
          phone: string
          points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          lifetime_points?: number
          phone?: string
          points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_rewards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      location_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_open: boolean
          location_id: string
          open_time: string
          updated_at: string
        }
        Insert: {
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_open?: boolean
          location_id: string
          open_time?: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_open?: boolean
          location_id?: string
          open_time?: string
          updated_at?: string
        }
        Relationships: []
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
          amount_paid: number | null
          coupon_code: string | null
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          id: string
          location_id: string
          notes: string | null
          order_number: string
          order_type: string
          payment_method: string | null
          payment_status: string
          pickup_time: string | null
          rewards_discount: number | null
          rewards_used: number | null
          source: string
          status: string
          stripe_session_id: string | null
          subtotal: number
          table_number: string | null
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          coupon_code?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          id?: string
          location_id: string
          notes?: string | null
          order_number: string
          order_type?: string
          payment_method?: string | null
          payment_status?: string
          pickup_time?: string | null
          rewards_discount?: number | null
          rewards_used?: number | null
          source?: string
          status?: string
          stripe_session_id?: string | null
          subtotal?: number
          table_number?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          coupon_code?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          id?: string
          location_id?: string
          notes?: string | null
          order_number?: string
          order_type?: string
          payment_method?: string | null
          payment_status?: string
          pickup_time?: string | null
          rewards_discount?: number | null
          rewards_used?: number | null
          source?: string
          status?: string
          stripe_session_id?: string | null
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
      popup_posters: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          start_date: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          start_date?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          start_date?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pos_sessions: {
        Row: {
          cash_sales_total: number | null
          created_at: string
          end_cash: number | null
          end_time: string | null
          entered_cash_amount: number | null
          id: string
          is_active: boolean
          location_id: string
          start_cash: number
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_sales_total?: number | null
          created_at?: string
          end_cash?: number | null
          end_time?: string | null
          entered_cash_amount?: number | null
          id?: string
          is_active?: boolean
          location_id: string
          start_cash?: number
          start_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_sales_total?: number | null
          created_at?: string
          end_cash?: number | null
          end_time?: string | null
          entered_cash_amount?: number | null
          id?: string
          is_active?: boolean
          location_id?: string
          start_cash?: number
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      printers: {
        Row: {
          auto_cut: boolean
          created_at: string
          id: string
          ip_address: string
          is_active: boolean
          location_id: string
          name: string
          paper_width: number
          port: number
          station: string
          updated_at: string
        }
        Insert: {
          auto_cut?: boolean
          created_at?: string
          id?: string
          ip_address: string
          is_active?: boolean
          location_id: string
          name: string
          paper_width?: number
          port?: number
          station?: string
          updated_at?: string
        }
        Update: {
          auto_cut?: boolean
          created_at?: string
          id?: string
          ip_address?: string
          is_active?: boolean
          location_id?: string
          name?: string
          paper_width?: number
          port?: number
          station?: string
          updated_at?: string
        }
        Relationships: []
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
      promotions: {
        Row: {
          background_color: string | null
          badge_text: string | null
          coupon_code: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          layout: string | null
          price: number
          price_suffix: string | null
          schedule_dates: number[] | null
          schedule_days: number[] | null
          schedule_type: string | null
          show_order_button: boolean | null
          sort_order: number | null
          subtitle: string | null
          text_color: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          badge_text?: string | null
          coupon_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          layout?: string | null
          price: number
          price_suffix?: string | null
          schedule_dates?: number[] | null
          schedule_days?: number[] | null
          schedule_type?: string | null
          show_order_button?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          text_color?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          badge_text?: string | null
          coupon_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          layout?: string | null
          price?: number
          price_suffix?: string | null
          schedule_dates?: number[] | null
          schedule_days?: number[] | null
          schedule_type?: string | null
          show_order_button?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      receipt_settings: {
        Row: {
          created_at: string
          customer_detail_font_height: number | null
          customer_detail_font_width: number | null
          customer_header_font_height: number | null
          customer_header_font_width: number | null
          customer_name_bold: boolean | null
          customer_name_size: number | null
          customer_phone_bold: boolean | null
          customer_phone_size: number | null
          customer_show_customer_name: boolean | null
          customer_show_customer_phone: boolean | null
          customer_show_logo: boolean | null
          customer_show_notes: boolean | null
          customer_show_order_date: boolean | null
          customer_show_order_id: boolean | null
          customer_show_order_type: boolean | null
          customer_show_payment_method: boolean | null
          customer_show_printed_on: boolean | null
          customer_show_store_address: boolean | null
          customer_show_store_email: boolean | null
          customer_show_store_name: boolean | null
          customer_show_store_phone: boolean | null
          footer_bold: boolean | null
          footer_gst: string | null
          footer_line1: string | null
          footer_line2: string | null
          footer_line3: string | null
          footer_size: number | null
          footer_social: string | null
          footer_text: string | null
          header_address: string | null
          header_email: string | null
          header_line1: string | null
          header_line2: string | null
          header_line3: string | null
          header_phone: string | null
          header_website: string | null
          id: string
          item_details_bold: boolean | null
          item_details_size: number | null
          item_name_bold: boolean | null
          item_name_size: number | null
          item_price_bold: boolean | null
          item_price_size: number | null
          kitchen_detail_font_height: number | null
          kitchen_detail_font_width: number | null
          kitchen_header_font_height: number | null
          kitchen_header_font_width: number | null
          kitchen_show_cashier: boolean | null
          kitchen_show_customer_name: boolean | null
          kitchen_show_customer_phone: boolean | null
          kitchen_show_notes: boolean | null
          kitchen_show_order_date: boolean | null
          kitchen_show_order_id: boolean | null
          kitchen_show_order_number: boolean | null
          kitchen_show_order_type: boolean | null
          kitchen_show_prep_time: boolean | null
          location_id: string
          logo_url: string | null
          order_date_bold: boolean | null
          order_date_size: number | null
          order_id_bold: boolean | null
          order_id_size: number | null
          order_type_bold: boolean | null
          order_type_size: number | null
          store_address_bold: boolean | null
          store_address_size: number | null
          store_name_bold: boolean | null
          store_name_size: number | null
          store_phone_bold: boolean | null
          store_phone_size: number | null
          totals_bold: boolean | null
          totals_size: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_detail_font_height?: number | null
          customer_detail_font_width?: number | null
          customer_header_font_height?: number | null
          customer_header_font_width?: number | null
          customer_name_bold?: boolean | null
          customer_name_size?: number | null
          customer_phone_bold?: boolean | null
          customer_phone_size?: number | null
          customer_show_customer_name?: boolean | null
          customer_show_customer_phone?: boolean | null
          customer_show_logo?: boolean | null
          customer_show_notes?: boolean | null
          customer_show_order_date?: boolean | null
          customer_show_order_id?: boolean | null
          customer_show_order_type?: boolean | null
          customer_show_payment_method?: boolean | null
          customer_show_printed_on?: boolean | null
          customer_show_store_address?: boolean | null
          customer_show_store_email?: boolean | null
          customer_show_store_name?: boolean | null
          customer_show_store_phone?: boolean | null
          footer_bold?: boolean | null
          footer_gst?: string | null
          footer_line1?: string | null
          footer_line2?: string | null
          footer_line3?: string | null
          footer_size?: number | null
          footer_social?: string | null
          footer_text?: string | null
          header_address?: string | null
          header_email?: string | null
          header_line1?: string | null
          header_line2?: string | null
          header_line3?: string | null
          header_phone?: string | null
          header_website?: string | null
          id?: string
          item_details_bold?: boolean | null
          item_details_size?: number | null
          item_name_bold?: boolean | null
          item_name_size?: number | null
          item_price_bold?: boolean | null
          item_price_size?: number | null
          kitchen_detail_font_height?: number | null
          kitchen_detail_font_width?: number | null
          kitchen_header_font_height?: number | null
          kitchen_header_font_width?: number | null
          kitchen_show_cashier?: boolean | null
          kitchen_show_customer_name?: boolean | null
          kitchen_show_customer_phone?: boolean | null
          kitchen_show_notes?: boolean | null
          kitchen_show_order_date?: boolean | null
          kitchen_show_order_id?: boolean | null
          kitchen_show_order_number?: boolean | null
          kitchen_show_order_type?: boolean | null
          kitchen_show_prep_time?: boolean | null
          location_id: string
          logo_url?: string | null
          order_date_bold?: boolean | null
          order_date_size?: number | null
          order_id_bold?: boolean | null
          order_id_size?: number | null
          order_type_bold?: boolean | null
          order_type_size?: number | null
          store_address_bold?: boolean | null
          store_address_size?: number | null
          store_name_bold?: boolean | null
          store_name_size?: number | null
          store_phone_bold?: boolean | null
          store_phone_size?: number | null
          totals_bold?: boolean | null
          totals_size?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_detail_font_height?: number | null
          customer_detail_font_width?: number | null
          customer_header_font_height?: number | null
          customer_header_font_width?: number | null
          customer_name_bold?: boolean | null
          customer_name_size?: number | null
          customer_phone_bold?: boolean | null
          customer_phone_size?: number | null
          customer_show_customer_name?: boolean | null
          customer_show_customer_phone?: boolean | null
          customer_show_logo?: boolean | null
          customer_show_notes?: boolean | null
          customer_show_order_date?: boolean | null
          customer_show_order_id?: boolean | null
          customer_show_order_type?: boolean | null
          customer_show_payment_method?: boolean | null
          customer_show_printed_on?: boolean | null
          customer_show_store_address?: boolean | null
          customer_show_store_email?: boolean | null
          customer_show_store_name?: boolean | null
          customer_show_store_phone?: boolean | null
          footer_bold?: boolean | null
          footer_gst?: string | null
          footer_line1?: string | null
          footer_line2?: string | null
          footer_line3?: string | null
          footer_size?: number | null
          footer_social?: string | null
          footer_text?: string | null
          header_address?: string | null
          header_email?: string | null
          header_line1?: string | null
          header_line2?: string | null
          header_line3?: string | null
          header_phone?: string | null
          header_website?: string | null
          id?: string
          item_details_bold?: boolean | null
          item_details_size?: number | null
          item_name_bold?: boolean | null
          item_name_size?: number | null
          item_price_bold?: boolean | null
          item_price_size?: number | null
          kitchen_detail_font_height?: number | null
          kitchen_detail_font_width?: number | null
          kitchen_header_font_height?: number | null
          kitchen_header_font_width?: number | null
          kitchen_show_cashier?: boolean | null
          kitchen_show_customer_name?: boolean | null
          kitchen_show_customer_phone?: boolean | null
          kitchen_show_notes?: boolean | null
          kitchen_show_order_date?: boolean | null
          kitchen_show_order_id?: boolean | null
          kitchen_show_order_number?: boolean | null
          kitchen_show_order_type?: boolean | null
          kitchen_show_prep_time?: boolean | null
          location_id?: string
          logo_url?: string | null
          order_date_bold?: boolean | null
          order_date_size?: number | null
          order_id_bold?: boolean | null
          order_id_size?: number | null
          order_type_bold?: boolean | null
          order_type_size?: number | null
          store_address_bold?: boolean | null
          store_address_size?: number | null
          store_name_bold?: boolean | null
          store_name_size?: number | null
          store_phone_bold?: boolean | null
          store_phone_size?: number | null
          totals_bold?: boolean | null
          totals_size?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      rewards_history: {
        Row: {
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          order_id: string | null
          phone: string
          points_change: number
          transaction_type: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          phone: string
          points_change: number
          transaction_type: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          phone?: string
          points_change?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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

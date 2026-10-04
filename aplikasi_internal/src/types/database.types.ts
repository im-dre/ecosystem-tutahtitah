// =============================================================
// TutahTitah Ecosystem - Supabase Database Types (Local Blueprint)
// Generated manually from schema snapshot (format follows
// `supabase gen types typescript`). Do NOT run against DB.
// =============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          kas_share: number | null
          profit_share: number | null
        }
        Insert: {
          id: number
          kas_share?: number | null
          profit_share?: number | null
        }
        Update: {
          id?: number
          kas_share?: number | null
          profit_share?: number | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: number
          image_url: string
          is_active: boolean | null
          placement: string
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          image_url: string
          is_active?: boolean | null
          placement: string
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          image_url?: string
          is_active?: boolean | null
          placement?: string
          title?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          auth_id: string
          created_at: string | null
          id: string
          image_url: string | null
          merchant_id: string
          name: string
          price: number
          product_id: string | null
          qty: number
          selected_variants: Json | null
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          merchant_id: string
          name: string
          price?: number
          product_id?: string | null
          qty?: number
          selected_variants?: Json | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          merchant_id?: string
          name?: string
          price?: number
          product_id?: string | null
          qty?: number
          selected_variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          chat_type: string
          created_at: string | null
          customer_id: string | null
          id: string
          initiator_id: string | null
          is_disabled_by_admin: boolean
          is_deleted_by_customer: boolean | null
          is_deleted_by_participant: boolean | null
          order_id: number | null
          participant_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          chat_type: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          initiator_id?: string | null
          is_disabled_by_admin?: boolean
          is_deleted_by_customer?: boolean | null
          is_deleted_by_participant?: boolean | null
          order_id?: number | null
          participant_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          chat_type?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          initiator_id?: string | null
          is_disabled_by_admin?: boolean
          is_deleted_by_customer?: boolean | null
          is_deleted_by_participant?: boolean | null
          order_id?: number | null
          participant_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }

      customer_addresses: {
        Row: {
          auth_id: string | null
          created_at: string | null
          full_address: string
          id: string
          is_default: boolean | null
          label: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          full_address: string
          id?: string
          is_default?: boolean | null
          label: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          full_address?: string
          id?: string
          is_default?: boolean | null
          label?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          auth_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string
          saved_addresses: Json | null
        }
        Insert: {
          address?: string | null
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
          saved_addresses?: Json | null
        }
        Update: {
          address?: string | null
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          saved_addresses?: Json | null
        }
        Relationships: []
      }
      draft_orders: {
        Row: {
          auth_id: string
          created_at: string | null
          id: string
          items: Json
          merchant_id: string | null
          tipe_layanan: string
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          id?: string
          items?: Json
          merchant_id?: string | null
          tipe_layanan?: string
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          id?: string
          items?: Json
          merchant_id?: string | null
          tipe_layanan?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          account_number: string | null
          account_number_2: string | null
          auth_id: string | null
          bank_name: string | null
          bank_name_2: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_online: boolean | null
          is_super_admin: boolean | null
          phone: string | null
          pin: string
          role: "admin" | "courier"
          warning_points: number | null
        }
        Insert: {
          account_number?: string | null
          account_number_2?: string | null
          auth_id?: string | null
          bank_name?: string | null
          bank_name_2?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_online?: boolean | null
          is_super_admin?: boolean | null
          phone?: string | null
          pin: string
          role: "admin" | "courier"
          warning_points?: number | null
        }
        Update: {
          account_number?: string | null
          account_number_2?: string | null
          auth_id?: string | null
          bank_name?: string | null
          bank_name_2?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_online?: boolean | null
          is_super_admin?: boolean | null
          phone?: string | null
          pin?: string
          role?: "admin" | "courier"
          warning_points?: number | null
        }
        Relationships: []
      }
      favorite_products: {
        Row: {
          auth_id: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_followers: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          merchant_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          merchant_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          merchant_id?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          address: string | null
          banner_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_custom_order: boolean | null
          logo_url: string | null
          name: string
          operating_hours: Json | null
          owner_id: string
          rejection_reason: string | null
          status: string | null
          warning_points: number | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_custom_order?: boolean | null
          logo_url?: string | null
          name: string
          operating_hours?: Json | null
          owner_id: string
          rejection_reason?: string | null
          status?: string | null
          warning_points?: number | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_custom_order?: boolean | null
          logo_url?: string | null
          name?: string
          operating_hours?: Json | null
          owner_id?: string
          rejection_reason?: string | null
          status?: string | null
          warning_points?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          is_deleted_by_customer: boolean | null
          is_deleted_by_participant: boolean | null
          is_read: boolean | null
          metadata: Json | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          is_deleted_by_customer?: boolean | null
          is_deleted_by_participant?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          sender_id: string
          sender_type: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_deleted_by_customer?: boolean | null
          is_deleted_by_participant?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: number
          price_per_item: number
          product_id: string
          quantity: number
          subtotal: number
        }
        Insert: {
          id?: string
          order_id: number
          price_per_item: number
          product_id: string
          quantity: number
          subtotal: number
        }
        Update: {
          id?: string
          order_id?: number
          price_per_item?: number
          product_id?: string
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_courier_id: string | null
          bill_details: string | null
          bill_sent: boolean | null
          completed_at: string | null
          created_at: string | null
          customer_address: string | null
          customer_id: string | null
          customer_name: string | null
          customer_wa: string
          delivery_fee: number | null
          dispatched_at: string | null
          failed_couriers: Json | null
          id: number
          image_url: string | null
          is_deleted: boolean | null
          is_favorite: boolean | null
          items: Json | null
          kendala_info: string | null
          merchant_id: string | null
          raw_order_text: string
          status: string | null
          tipe_layanan: string | null
          total_amount: number | null
          total_price: number | null
        }
        Insert: {
          assigned_courier_id?: string | null
          bill_details?: string | null
          bill_sent?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_wa: string
          delivery_fee?: number | null
          dispatched_at?: string | null
          failed_couriers?: Json | null
          id?: never
          image_url?: string | null
          is_deleted?: boolean | null
          is_favorite?: boolean | null
          items?: Json | null
          kendala_info?: string | null
          merchant_id?: string | null
          raw_order_text: string
          status?: string | null
          tipe_layanan?: string | null
          total_amount?: number | null
          total_price?: number | null
        }
        Update: {
          assigned_courier_id?: string | null
          bill_details?: string | null
          bill_sent?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_wa?: string
          delivery_fee?: number | null
          dispatched_at?: string | null
          failed_couriers?: Json | null
          id?: never
          image_url?: string | null
          is_deleted?: boolean | null
          is_favorite?: boolean | null
          items?: Json | null
          kendala_info?: string | null
          merchant_id?: string | null
          raw_order_text?: string
          status?: string | null
          tipe_layanan?: string | null
          total_amount?: number | null
          total_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_courier_id_fkey"
            columns: ["assigned_courier_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }

      products: {
        Row: {
          badge: string | null
          category: string | null
          created_at: string | null
          favorite_count: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          merchant_id: string
          name: string
          price: number
          rating_score: number | null
          total_ratings: number | null
          variants: Json | null
        }
        Insert: {
          badge?: string | null
          category?: string | null
          created_at?: string | null
          favorite_count?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          merchant_id: string
          name: string
          price: number
          rating_score?: number | null
          total_ratings?: number | null
          variants?: Json | null
        }
        Update: {
          badge?: string | null
          category?: string | null
          created_at?: string | null
          favorite_count?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          merchant_id?: string
          name?: string
          price?: number
          rating_score?: number | null
          total_ratings?: number | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      promos: {
        Row: {
          created_at: string
          id: number
          image_url: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: never
          image_url: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          created_at?: string
          id?: never
          image_url?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          order_id: number | null
          rating: number
          review: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          order_id?: number | null
          rating: number
          review?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          order_id?: number | null
          rating?: number
          review?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          customer_id: string
          feedback_at: string | null
          forwarded_at: string | null
          id: string
          order_id: number | null
          reason: string
          resolution_action: string | null
          status: string | null
          target_feedback: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          customer_id: string
          feedback_at?: string | null
          forwarded_at?: string | null
          id?: string
          order_id?: number | null
          reason: string
          resolution_action?: string | null
          status?: string | null
          target_feedback?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          customer_id?: string
          feedback_at?: string | null
          forwarded_at?: string | null
          id?: string
          order_id?: number | null
          reason?: string
          resolution_action?: string | null
          status?: string | null
          target_feedback?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_chat_summaries: {
        Args: Record<PropertyKey, never>
        Returns: {
          chat_type: string
          customer_id: string | null
          display_avatar: string | null
          display_name: string
          display_subtitle: string
          id: string
          initiator_id: string | null
          is_disabled_by_admin: boolean
          last_message: string
          last_time: string | null
          participant_id: string | null
          status: string | null
          unread_count: number
        }[]
      }
      get_chat_summary: {
        Args: { p_chat_id: string }
        Returns: {
          chat_type: string
          customer_id: string | null
          display_avatar: string | null
          display_name: string
          display_subtitle: string
          id: string
          initiator_id: string | null
          is_disabled_by_admin: boolean
          last_message: string
          last_time: string | null
          participant_id: string | null
          status: string | null
          unread_count: number
        }[]
      }
      rpc_soft_delete_all_chats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fetch_cctv_chats: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          chat_type: string
          display_name: string
          display_subtitle: string
          id: string
          is_disabled_by_admin: boolean
          last_message: string
          last_time: string | null
          status: string | null
        }[]
      }
      rpc_disable_chat_by_admin: {
        Args: { p_chat_id: string }
        Returns: undefined
      }
      rpc_soft_delete_chat: {
        Args: { p_chat_id: string }
        Returns: undefined
      }
      rpc_soft_delete_message: {
        Args: { p_msg_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ===== Helper types =====
type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]

// ===== Convenience aliases =====
export type AppSettings = Tables<"app_settings">
export type Banner = Tables<"banners">
export type CartItem = Tables<"cart_items">
export type Chat = Tables<"chats">
export type Customer = Tables<"customers">
export type CustomerAddress = Tables<"customer_addresses">
export type DraftOrder = Tables<"draft_orders">
export type Employee = Tables<"employees">
export type FavoriteProduct = Tables<"favorite_products">
export type Merchant = Tables<"merchants">
export type MerchantFollower = Tables<"merchant_followers">
export type Message = Tables<"messages">
export type Order = Tables<"orders">
export type OrderItem = Tables<"order_items">
export type Product = Tables<"products">
export type Promo = Tables<"promos">
export type Rating = Tables<"ratings">
export type Report = Tables<"reports">



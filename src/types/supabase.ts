export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      payment_orders: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          amount: number
          currency: string
          payment_provider: string
          provider_order_id: string
          status: string
          created_at: string
          updated_at: string
          metadata: Json
          subscription_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          amount: number
          currency: string
          payment_provider: string
          provider_order_id: string
          status: string
          created_at?: string
          updated_at?: string
          metadata?: Json
          subscription_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          amount?: number
          currency?: string
          payment_provider?: string
          provider_order_id?: string
          status?: string
          created_at?: string
          updated_at?: string
          metadata?: Json
          subscription_id?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          provider: string
          provider_subscription_id: string
          status: string
          amount: number
          currency: string
          interval: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          trial_start: string | null
          trial_end: string | null
          canceled_at: string | null
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          provider: string
          provider_subscription_id: string
          status: string
          amount: number
          currency: string
          interval: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          trial_start?: string | null
          trial_end?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          provider?: string
          provider_subscription_id?: string
          status?: string
          amount?: number
          currency?: string
          interval?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          trial_start?: string | null
          trial_end?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
      }
      user_interactions: {
        Row: {
          id: string
          user_id: string
          interaction_type: string
          content: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          interaction_type: string
          content?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          interaction_type?: string
          content?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      transaction_type: "income" | "expense";
      habit_frequency: "daily" | "weekly";
    };
    CompositeTypes: Record<string, never>;
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          duration_minutes: number | null;
          calories_burned: number | null;
          notes: string | null;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          duration_minutes?: number | null;
          calories_burned?: number | null;
          notes?: string | null;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          type?: string;
          duration_minutes?: number | null;
          calories_burned?: number | null;
          notes?: string | null;
          completed_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          workout_id: string;
          name: string;
          sets: number | null;
          reps: number | null;
          weight: number | null;
          duration_seconds: number | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          workout_id: string;
          name: string;
          sets?: number | null;
          reps?: number | null;
          weight?: number | null;
          duration_seconds?: number | null;
          order_index?: number;
        };
        Update: {
          name?: string;
          sets?: number | null;
          reps?: number | null;
          weight?: number | null;
          duration_seconds?: number | null;
          order_index?: number;
        };
        Relationships: [];
      };
      body_metrics: {
        Row: {
          id: string;
          user_id: string;
          weight: number | null;
          body_fat_percentage: number | null;
          notes: string | null;
          recorded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight?: number | null;
          body_fat_percentage?: number | null;
          notes?: string | null;
          recorded_at?: string;
          created_at?: string;
        };
        Update: {
          weight?: number | null;
          body_fat_percentage?: number | null;
          notes?: string | null;
          recorded_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: "income" | "expense";
          category: string;
          description: string | null;
          currency: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: "income" | "expense";
          category: string;
          description?: string | null;
          currency?: string;
          date?: string;
          created_at?: string;
        };
        Update: {
          amount?: number;
          type?: "income" | "expense";
          category?: string;
          description?: string | null;
          currency?: string;
          date?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          amount: number;
          month: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          amount: number;
          month: string;
          created_at?: string;
        };
        Update: {
          category?: string;
          amount?: number;
          month?: string;
        };
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string;
          frequency: "daily" | "weekly";
          target_count: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string;
          frequency?: "daily" | "weekly";
          target_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string;
          frequency?: "daily" | "weekly";
          target_count?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      credit_cards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          last_four: string;
          credit_limit: number;
          balance_crc: number;
          balance_usd: number;
          billing_date: number;
          due_date: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          last_four: string;
          credit_limit: number;
          balance_crc?: number;
          balance_usd?: number;
          billing_date: number;
          due_date: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          last_four?: string;
          credit_limit?: number;
          balance_crc?: number;
          balance_usd?: number;
          billing_date?: number;
          due_date?: number;
        };
        Relationships: [];
      };
      credit_card_payments: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          amount: number;
          currency: string;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          amount: number;
          currency: string;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          amount?: number;
          currency?: string;
          paid_at?: string;
        };
        Relationships: [];
      };
      recurring_expenses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          currency: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          currency?: string;
          category?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          amount?: number;
          currency?: string;
          category?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          notes: string | null;
          invested_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          notes?: string | null;
          invested_at?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          amount?: number;
          notes?: string | null;
          invested_at?: string;
        };
        Relationships: [];
      };
      income_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          frequency: "monthly" | "one-time";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          frequency?: "monthly" | "one-time";
          created_at?: string;
        };
        Update: {
          name?: string;
          amount?: number;
          frequency?: "monthly" | "one-time";
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          monthly_income: number;
          income_currency: string;
          spending_currency: string;
          income_updated_at: string;
          setup_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          monthly_income?: number;
          income_currency?: string;
          spending_currency?: string;
          income_updated_at?: string;
          setup_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          monthly_income?: number;
          income_currency?: string;
          spending_currency?: string;
          income_updated_at?: string;
          setup_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      habit_entries: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          completed_at: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          completed_at?: string;
          note?: string | null;
        };
        Update: {
          note?: string | null;
          completed_at?: string;
        };
        Relationships: [];
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Generated types for the schema in supabase/schema.sql.
//
// The real `supabase gen types typescript` needs a running Postgres to
// introspect (local via Docker, or a linked project) — neither is set up
// yet, so this file is hand-written to match that command's output shape
// exactly. Once the project is linked, replace it with:
//
//   supabase gen types typescript --linked > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      charities_cache: {
        Row: {
          id: string;
          place_id: string;
          name: string;
          organisation: string | null;
          formatted_address: string | null;
          lat: number;
          lng: number;
          regular_opening_hours: Json | null;
          accepted_categories: string[];
          cache_key: string;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          place_id: string;
          name: string;
          organisation?: string | null;
          formatted_address?: string | null;
          lat: number;
          lng: number;
          regular_opening_hours?: Json | null;
          accepted_categories?: string[];
          cache_key: string;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          place_id?: string;
          name?: string;
          organisation?: string | null;
          formatted_address?: string | null;
          lat?: number;
          lng?: number;
          regular_opening_hours?: Json | null;
          accepted_categories?: string[];
          cache_key?: string;
          fetched_at?: string;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          id: string;
          status: string;
          pickup_address: string | null;
          pickup_lat: number | null;
          pickup_lng: number | null;
          categories: string[];
          size: string | null;
          photo_url: string | null;
          charity_place_id: string | null;
          charity_name: string | null;
          charity_address: string | null;
          quote_id: string | null;
          quote_amount_cents: number | null;
          uber_delivery_id: string | null;
          tracking_url: string | null;
          courier_name: string | null;
          courier_imminent: boolean | null;
          payment_intent_id: string | null;
          is_demo: boolean;
          created_at: string;
          quoted_at: string | null;
          paid_at: string | null;
          dispatched_at: string | null;
          courier_assigned_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          quote_expired_at: string | null;
          payment_failed_at: string | null;
          dispatch_failed_at: string | null;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          status?: string;
          pickup_address?: string | null;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          categories?: string[];
          size?: string | null;
          photo_url?: string | null;
          charity_place_id?: string | null;
          charity_name?: string | null;
          charity_address?: string | null;
          quote_id?: string | null;
          quote_amount_cents?: number | null;
          uber_delivery_id?: string | null;
          tracking_url?: string | null;
          courier_name?: string | null;
          courier_imminent?: boolean | null;
          payment_intent_id?: string | null;
          is_demo?: boolean;
          created_at?: string;
          quoted_at?: string | null;
          paid_at?: string | null;
          dispatched_at?: string | null;
          courier_assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          quote_expired_at?: string | null;
          payment_failed_at?: string | null;
          dispatch_failed_at?: string | null;
          cancelled_at?: string | null;
        };
        Update: {
          id?: string;
          status?: string;
          pickup_address?: string | null;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          categories?: string[];
          size?: string | null;
          photo_url?: string | null;
          charity_place_id?: string | null;
          charity_name?: string | null;
          charity_address?: string | null;
          quote_id?: string | null;
          quote_amount_cents?: number | null;
          uber_delivery_id?: string | null;
          tracking_url?: string | null;
          courier_name?: string | null;
          courier_imminent?: boolean | null;
          payment_intent_id?: string | null;
          is_demo?: boolean;
          created_at?: string;
          quoted_at?: string | null;
          paid_at?: string | null;
          dispatched_at?: string | null;
          courier_assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          quote_expired_at?: string | null;
          payment_failed_at?: string | null;
          dispatch_failed_at?: string | null;
          cancelled_at?: string | null;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          event_id: string;
          delivery_id: string;
          event_type: string;
          payload: Json;
          received_at: string;
        };
        Insert: {
          event_id: string;
          delivery_id: string;
          event_type: string;
          payload: Json;
          received_at?: string;
        };
        Update: {
          event_id?: string;
          delivery_id?: string;
          event_type?: string;
          payload?: Json;
          received_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

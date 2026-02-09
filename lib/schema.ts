/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Supabase-generated type map used for strongly typed `.from(...).select()/insert()/update()` queries.
export interface Database {
  public: {
    Tables: {
      // User-authored comments on species cards.
      comments: {
        Row: {
          author: string;
          content: string;
          created_at: string;
          id: number;
          species_id: number;
        };
        Insert: {
          author: string;
          content: string;
          created_at?: string;
          id?: number;
          species_id: number;
        };
        Update: {
          author?: string;
          content?: string;
          created_at?: string;
          id?: number;
          species_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "comments_author_fkey";
            columns: ["author"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_species_id_fkey";
            columns: ["species_id"];
            referencedRelation: "species";
            referencedColumns: ["id"];
          },
        ];
      };
      // Public user profile metadata.
      profiles: {
        Row: {
          biography: string | null;
          display_name: string;
          email: string;
          id: string;
        };
        Insert: {
          biography?: string | null;
          display_name: string;
          email: string;
          id: string;
        };
        Update: {
          biography?: string | null;
          display_name?: string;
          email?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      // Core species records displayed in the app.
      species: {
        Row: {
          author: string;
          common_name: string | null;
          description: string | null;
          endangerment_status: Database["public"]["Enums"]["endangerment_status"];
          id: number;
          image: string | null;
          kingdom: Database["public"]["Enums"]["kingdom"];
          scientific_name: string;
          total_population: number | null;
        };
        Insert: {
          author: string;
          common_name?: string | null;
          description?: string | null;
          endangerment_status?: Database["public"]["Enums"]["endangerment_status"];
          id?: number;
          image?: string | null;
          kingdom: Database["public"]["Enums"]["kingdom"];
          scientific_name: string;
          total_population?: number | null;
        };
        Update: {
          author?: string;
          common_name?: string | null;
          description?: string | null;
          endangerment_status?: Database["public"]["Enums"]["endangerment_status"];
          id?: number;
          image?: string | null;
          kingdom?: Database["public"]["Enums"]["kingdom"];
          scientific_name?: string;
          total_population?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "species_author_fkey";
            columns: ["author"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      // User-specific saved species.
      species_bookmarks: {
        Row: {
          created_at: string;
          species_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          species_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          species_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "species_bookmarks_species_id_fkey";
            columns: ["species_id"];
            referencedRelation: "species";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "species_bookmarks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      // Shared enum used by species.endangerment_status.
      endangerment_status:
        | "Not Evaluated"
        | "Data Deficient"
        | "Least Concern"
        | "Near Threatened"
        | "Vulnerable"
        | "Endangered"
        | "Critically Endangered"
        | "Extinct in the Wild"
        | "Extinct";
      // Shared enum used by species.kingdom.
      kingdom: "Animalia" | "Plantae" | "Fungi" | "Protista" | "Archaea" | "Bacteria";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

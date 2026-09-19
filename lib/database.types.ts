/**
 * Generated database types — regenerate from Supabase when MCP is configured.
 * See docs/SCHEMA.md and supabase/schema.sql
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      incidents: {
        Row: {
          id: string;
          created_at: string;
          case_number: string;
          title: string;
          service: string;
          dag_id: string | null;
          severity: string;
          raw_log: string;
          error_signature: string;
          source_url: string | null;
          occurred_at: string;
          status: string;
          is_precached: boolean;
        };
      };
      hearings: {
        Row: {
          id: string;
          created_at: string;
          incident_id: string;
          docket_number: string;
          convened_at: string;
          concluded_at: string | null;
          state: string;
        };
      };
      arguments: {
        Row: {
          id: string;
          created_at: string;
          hearing_id: string;
          role: string;
          sequence: number;
          body: string;
          claims: Json;
          cited_precedents: Json;
          model: string | null;
        };
      };
      rulings: {
        Row: {
          id: string;
          created_at: string;
          hearing_id: string;
          verdict: string;
          opinion: string;
          holding: string;
          remediation_order: Json;
          confidence: number;
          cited_precedent_ids: Json;
          veto_window_seconds: number;
          veto_opens_at: string;
          executed_at: string | null;
          authority: string | null;
        };
      };
      precedents: {
        Row: {
          id: string;
          created_at: string;
          precedent_number: number;
          ruling_id: string | null;
          incident_id: string | null;
          citation: string;
          holding: string;
          summary: string;
          verdict: string;
          outcome: string;
          mttr_minutes: number | null;
          embedding: number[] | null;
          is_seeded: boolean;
        };
      };
      vetoes: {
        Row: {
          id: string;
          created_at: string;
          ruling_id: string;
          exercised_at: string;
          seconds_remaining: number;
          reason: string | null;
        };
      };
    };
    Views: {
      docket: {
        Row: Database["public"]["Tables"]["incidents"]["Row"];
      };
    };
    Functions: {
      match_precedents: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: Array<{
          id: string;
          precedent_number: number;
          citation: string;
          holding: string;
          summary: string;
          verdict: string;
          outcome: string;
          mttr_minutes: number | null;
          similarity: number;
        }>;
      };
    };
  };
}

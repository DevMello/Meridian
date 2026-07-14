/** Row shapes for the Supabase tables (see supabase/migrations/0001_init.sql). */

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedPart {
  id: string;
  user_id: string;
  provider: string;
  part_id: string;
  mpn: string;
  manufacturer: string | null;
  description: string | null;
  data: unknown;
  created_at: string;
}

export interface SearchHistoryRow {
  id: string;
  user_id: string;
  query: string;
  providers: string[];
  result_count: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  rev: string;
  status: string;
  description: string | null;
  link: string | null;
  build_qty: number;
  created_at: string;
  updated_at: string;
}

export interface BomLine {
  id: string;
  project_id: string;
  ref: string | null;
  qty_per_board: number;
  mpn: string;
  provider: string | null;
  part_id: string | null;
  description: string | null;
  unit_price: number | null;
  sourcing: string;
  data: unknown;
  position: number;
  created_at: string;
}

export interface ProviderPref {
  user_id: string;
  provider: string;
  enabled: boolean;
}

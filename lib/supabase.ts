/*
 * Run once in Supabase SQL editor:
 *
 * CREATE TABLE veritas_records (
 *   id text PRIMARY KEY,
 *   indicator_code text NOT NULL,
 *   indicator_label text NOT NULL,
 *   country_code text NOT NULL,
 *   country_name text NOT NULL,
 *   year_start integer NOT NULL,
 *   year_end integer NOT NULL,
 *   years jsonb NOT NULL,
 *   values jsonb NOT NULL,
 *   raw_data_snapshot jsonb,
 *   chart_config jsonb,
 *   hash text NOT NULL,
 *   created_at timestamptz NOT NULL DEFAULT now()
 * );
 */

import { createClient } from "@supabase/supabase-js";

export interface VeritasRecord {
  id: string;
  indicator_code: string;
  indicator_label: string;
  country_code: string;
  country_name: string;
  year_start: number;
  year_end: number;
  years: number[];
  values: number[];
  raw_data_snapshot: unknown;
  chart_config: Record<string, unknown>;
  hash: string;
  created_at: string;
}

// Server-side only — uses service role key for writes
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Safe for client-side reads — uses anon key
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

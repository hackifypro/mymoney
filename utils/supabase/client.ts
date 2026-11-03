import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  import.meta.env.VITE_SUPABASE_URL ||
  "https://frgrfajnrzqwnevhlrio.supabase.co";

const supabaseKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_RHVRSE_Z4R1Qit3djpOfCA_L93zsRjg";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );

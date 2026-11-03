import { createServerClient } from "@supabase/ssr";

// Note: In Next.js environments, cookies are imported from 'next/headers'.
// For non-Next/pure Node or SPA environments, a fallback cookie store is provided.
const supabaseUrl =
  (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.NEXT_PUBLIC_SUPABASE_URL)) ||
  "https://frgrfajnrzqwnevhlrio.supabase.co";

const supabaseKey =
  (typeof process !== 'undefined' && (process.env?.SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
  "sb_publishable_RHVRSE_Z4R1Qit3djpOfCA_L93zsRjg";

export const createClient = (cookieStore?: {
  getAll: () => { name: string; value: string }[];
  set?: (name: string, value: string, options?: any) => void;
}) => {
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() || [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore?.set?.(name, value, options)
            );
          } catch {
            // Ignored in server component or client contexts
          }
        },
      },
    }
  );
};

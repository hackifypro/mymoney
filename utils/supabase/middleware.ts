import { createServerClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.NEXT_PUBLIC_SUPABASE_URL)) ||
  "https://frgrfajnrzqwnevhlrio.supabase.co";

const supabaseKey =
  (typeof process !== 'undefined' && (process.env?.SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
  "sb_publishable_RHVRSE_Z4R1Qit3djpOfCA_L93zsRjg";

export const createClient = (request: any) => {
  // Create an unmodified response or mock response for SSR/middleware
  let supabaseResponse = {
    headers: request?.headers || {},
    cookies: {
      set: (name: string, value: string, options?: any) => {},
    },
  };

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request?.cookies?.getAll?.() || [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request?.cookies?.set?.(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, supabaseResponse };
};

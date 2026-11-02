import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'my_money_supabase_url';
const STORAGE_KEY_KEY = 'my_money_supabase_key';

export function getSavedSupabaseConfig(): { url: string; key: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  return {
    url: localUrl || envUrl,
    key: localKey || envKey,
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY_KEY);
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSavedSupabaseConfig();
  if (!url || !key) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

export function resetSupabaseClient() {
  supabaseInstance = null;
  return getSupabaseClient();
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string; user?: User | null }> {
  try {
    const client = createClient(url, key);
    // Test auth or query
    const { data, error } = await client.from('transactions').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist or RLS issue
      if (error.message.includes('relation "public.transactions" does not exist') || error.code === '42P01') {
        return {
          success: false,
          message: 'Connected to Supabase, but the "transactions" table was not found. Please run the SQL schema in your Supabase SQL editor.',
        };
      }
    }
    const { data: authData } = await client.auth.getSession();
    return {
      success: true,
      message: 'Successfully connected to Supabase!',
      user: authData.session?.user || null,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Could not connect to Supabase. Check URL and Anon Key.',
    };
  }
}

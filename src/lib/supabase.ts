import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Transaction } from '../types';

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

  resetSupabaseClient();
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
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
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

export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<{ success: boolean; message: string; user?: User | null }> {
  try {
    const client = createClient(url, key);
    // Test auth session first
    const { data: authData } = await client.auth.getSession();

    // Test transactions table query
    const { data, error } = await client.from('transactions').select('id').limit(1);
    if (error) {
      if (
        error.message.includes('relation "public.transactions" does not exist') ||
        error.code === '42P01'
      ) {
        return {
          success: false,
          message:
            'Connected to Supabase, but "transactions" table was not found. Please run the SQL schema in Supabase SQL editor.',
        };
      }
      // If error is code PGRST116 or permission error from RLS, it means table exists
      if (error.code !== 'PGRST116' && !error.message.includes('row-level security')) {
        console.warn('Supabase test query warning:', error.message);
      }
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase Database!',
      user: authData.session?.user || null,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Could not connect to Supabase. Please verify URL and Anon Key.',
    };
  }
}

// ==========================================
// SUPABASE TRANSACTION DATABASE OPERATIONS
// ==========================================

export async function fetchTransactionsFromSupabase(userId?: string): Promise<Transaction[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  let query = client
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('transaction_time', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching transactions from Supabase:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_email: row.user_email,
    category: row.category,
    subcategory: row.subcategory,
    transaction_type: row.transaction_type,
    amount: Number(row.amount),
    title: row.title,
    description: row.description || undefined,
    person_name: row.person_name || undefined,
    transaction_date: row.transaction_date,
    transaction_time: row.transaction_time,
    notes: row.notes || undefined,
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function saveTransactionToSupabase(tx: Transaction): Promise<Transaction> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const payload = {
    id: tx.id,
    user_id: tx.user_id,
    user_email: tx.user_email,
    category: tx.category,
    subcategory: tx.subcategory,
    transaction_type: tx.transaction_type,
    amount: tx.amount,
    title: tx.title,
    description: tx.description || null,
    person_name: tx.person_name || null,
    transaction_date: tx.transaction_date,
    transaction_time: tx.transaction_time,
    notes: tx.notes || null,
    metadata: tx.metadata || {},
    created_at: tx.created_at,
    updated_at: tx.updated_at,
  };

  const { data, error } = await client.from('transactions').upsert(payload).select().single();
  if (error) {
    console.error('Error saving transaction to Supabase:', error);
    throw error;
  }

  return {
    ...tx,
    id: data?.id || tx.id,
    created_at: data?.created_at || tx.created_at,
    updated_at: data?.updated_at || tx.updated_at,
  };
}

export async function updateTransactionInSupabase(
  id: string,
  updates: Partial<Transaction>
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.subcategory !== undefined) payload.subcategory = updates.subcategory;
  if (updates.transaction_type !== undefined) payload.transaction_type = updates.transaction_type;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.person_name !== undefined) payload.person_name = updates.person_name;
  if (updates.transaction_date !== undefined) payload.transaction_date = updates.transaction_date;
  if (updates.transaction_time !== undefined) payload.transaction_time = updates.transaction_time;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.metadata !== undefined) payload.metadata = updates.metadata;

  const { error } = await client.from('transactions').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating transaction in Supabase:', error);
    throw error;
  }
}

export async function deleteTransactionFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client.from('transactions').delete().eq('id', id);
  if (error) {
    console.error('Error deleting transaction from Supabase:', error);
    throw error;
  }
}

export function subscribeToSupabaseTransactions(onChanged: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('realtime_transactions_' + Math.random().toString(36).substring(2, 7))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions' },
      () => {
        onChanged();
      }
    )
    .subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch {}
  };
}

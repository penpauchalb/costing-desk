import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const SUPABASE_CONFIG_KEY = 'costing_desk_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }

    return {
      url: envUrl,
      anonKey: envKey,
    };
  } catch {
    return { url: '', anonKey: '' };
  }
}

export function saveStoredSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  initSupabaseClient();
}

let supabaseInstance: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return supabaseInstance;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      supabaseInstance = null;
    }
  }
  supabaseInstance = null;
  return null;
}

// Initialize on module load
initSupabaseClient();

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    return initSupabaseClient();
  }
  return supabaseInstance;
}

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  user: User | null;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      connected: false,
      message: 'Supabase URL and Anon Key are not configured. Running in Local Offline Mode.',
      user: null,
    };
  }

  try {
    const { data: authData, error: authErr } = await client.auth.getUser();
    if (authErr && authErr.message && !authErr.message.includes('session')) {
      return {
        connected: false,
        message: `Connection error: ${authErr.message}`,
        user: null,
      };
    }

    return {
      connected: true,
      message: 'Connected to Supabase PostgreSQL cloud database.',
      user: authData?.user || null,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      message: err instanceof Error ? err.message : 'Unknown connection error',
      user: null,
    };
  }
}

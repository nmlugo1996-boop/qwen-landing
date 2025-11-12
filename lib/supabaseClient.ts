import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type GenericClient = SupabaseClient<any, any, any>;

export const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let cachedServerClient: GenericClient | null = null;
let cachedBrowserClient: GenericClient | null = null;
let cachedAdminClient: GenericClient | null = null;

export function supaServer() {
  if (!hasSupabase) return null;
  if (cachedServerClient) return cachedServerClient;
  cachedServerClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
  return cachedServerClient;
}

export function createServerClient(_store?: unknown) {
  return supaServer();
}

export function createBrowserClient() {
  if (!hasSupabase || typeof window === "undefined") return null;
  if (cachedBrowserClient) return cachedBrowserClient;
  cachedBrowserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
  return cachedBrowserClient;
}

export function adminClient() {
  if (cachedAdminClient) return cachedAdminClient;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabase || !serviceKey) return null;
  cachedAdminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  return cachedAdminClient;
}

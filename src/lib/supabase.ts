import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CANONICAL_SUPABASE_URL = 'https://supkenhucppvtcxxqcre.supabase.co';

function stripWrappingQuotes(value: string | undefined): string {
  if (!value) return '';
  return value.trim().replace(/^["']+|["']+$/g, '').trim();
}

function normalizeSupabaseUrl(rawValue: string | undefined): string {
  const cleaned = stripWrappingQuotes(rawValue);
  if (!cleaned) return CANONICAL_SUPABASE_URL;

  const withProtocol = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;

  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname.endsWith('.supabase.co')) {
      return CANONICAL_SUPABASE_URL;
    }
    // Always use pure origin (scheme + hostname) with no trailing slash or extra path
    return parsed.origin;
  } catch {
    return CANONICAL_SUPABASE_URL;
  }
}

export const SUPABASE_URL = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);

export const SUPABASE_PUBLISHABLE_KEY = stripWrappingQuotes(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
);

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY &&
    SUPABASE_PUBLISHABLE_KEY !== 'YOUR_SUPABASE_PUBLISHABLE_KEY'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

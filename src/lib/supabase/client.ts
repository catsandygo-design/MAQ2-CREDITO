import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pmfcptfpclxkbohyzarb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_IQ77rvqt1alM9fgHw0z9Tg_pqo0_U6w';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_PUBLISHABLE_KEY;

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

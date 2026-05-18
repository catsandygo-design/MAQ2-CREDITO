import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL nao configurada. Verifique .env.local ou variaveis da Vercel.');
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY nao configurada. Verifique .env.local ou variaveis da Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

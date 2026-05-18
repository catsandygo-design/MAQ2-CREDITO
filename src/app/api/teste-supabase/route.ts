import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  let db;
  try {
    db = getSupabase();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Supabase ainda nao configurado na Vercel.',
        error: error instanceof Error ? error.message : 'Supabase nao configurado.',
      },
      { status: 503 },
    );
  }

  const { data, error } = await db
    .from('clientes')
    .select('*')
    .limit(10);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Supabase conectado, mas a tabela clientes ainda nao existe ou nao esta liberada por RLS.',
        error: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Backend conectado ao Supabase com sucesso.',
    data,
  });
}

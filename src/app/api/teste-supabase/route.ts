import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
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

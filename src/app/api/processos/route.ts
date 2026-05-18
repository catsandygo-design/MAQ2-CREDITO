import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  let db;
  try {
    db = getSupabase();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Supabase nao configurado.',
      },
      { status: 503 },
    );
  }

  const { data, error } = await db
    .from('processos_credito')
    .select(`
      id,
      reserva,
      empreendimento,
      cidade,
      estado_caixa,
      estado_agehab,
      status_reserva,
      momento_cliente,
      prioridade,
      created_at,
      clientes (
        nome
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    total: data?.length || 0,
    data,
  });
}

export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();

    const { data: cliente, error: clienteError } = await db
      .from('clientes')
      .insert({
        nome: body.cliente,
      })
      .select()
      .single();

    if (clienteError) {
      return NextResponse.json(
        {
          ok: false,
          error: clienteError.message,
        },
        { status: 500 },
      );
    }

    const { data: processo, error: processoError } = await db
      .from('processos_credito')
      .insert({
        cliente_id: cliente.id,
        reserva: body.reserva,
        empreendimento: body.empreendimento,
        cidade: body.cidade,
        estado_caixa: body.estado_caixa,
        estado_agehab: body.estado_agehab,
        status_reserva: body.status_reserva,
        momento_cliente: body.momento_cliente || 'aguardando_documentos',
      })
      .select()
      .single();

    if (processoError) {
      return NextResponse.json(
        {
          ok: false,
          error: processoError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: processo,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro interno.',
      },
      { status: 500 },
    );
  }
}

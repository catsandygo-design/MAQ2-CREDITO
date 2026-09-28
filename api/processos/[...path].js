import { createClient } from '@supabase/supabase-js';

const respond = (res, status, body) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  return res.status(status).json(body);
};

function clientFor(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configuração Supabase ausente no servidor.');
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticatedClient(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const client = clientFor(token);
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : client;
}

function pathParts(req) {
  const path = req.query.path;
  return Array.isArray(path) ? path : path ? [path] : [];
}

function toProcess(row, statuses = []) {
  return {
    reserva: row.reserva,
    cliente: row.cliente,
    caixa: row.caixa_status || 'reserva',
    agehab: row.agehab_status || 'reserva',
    produto: row.produto,
    sinal: row.sinal,
    fiador: row.fiador,
    corretor: row.corretor,
    empreendimento: row.empreendimento,
    cca_vinculado: row.cca_vinculado,
    observacao_analista: row.observacao_analista,
    encaminhado_analista: Boolean(row.encaminhado_analista),
    documentos: Object.fromEntries(statuses.map((item) => [item.documento_key, item.status])),
  };
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'PUT'].includes(req.method)) return respond(res, 405, { detail: 'Método não permitido.' });
    const client = await authenticatedClient(req);
    if (!client) return respond(res, 401, { detail: 'Autenticação obrigatória.' });
    const parts = pathParts(req);

    if (req.method === 'GET' && parts.length === 0) {
      let query = client.from('fastapi_processos').select('*').order('updated_at', { ascending: false }).limit(100);
      if (req.query.destino === 'analista') query = query.eq('encaminhado_analista', true);
      if (req.query.destino === 'cca') query = query.eq('encaminhado_analista', true).in('caixa_status', ['emitindo_formularios', 'formularios_em_assinatura', 'formularios_assinados', 'envio_conformidade']);
      const { data: processes, error } = await query;
      if (error) return respond(res, 502, { detail: 'Falha ao consultar processos.' });
      const reservations = (processes || []).map((item) => item.reserva);
      const { data: allStatuses, error: statusError } = reservations.length
        ? await client.from('fastapi_documentos_status').select('reserva,documento_key,status').in('reserva', reservations)
        : { data: [], error: null };
      if (statusError) return respond(res, 502, { detail: 'Falha ao consultar documentos.' });
      const grouped = new Map();
      for (const item of allStatuses || []) grouped.set(item.reserva, [...(grouped.get(item.reserva) || []), item]);
      return respond(res, 200, (processes || []).map((item) => toProcess(item, grouped.get(item.reserva) || [])));
    }

    if (parts.length === 1 && req.method === 'GET') {
      const reserva = parts[0];
      const { data: process, error } = await client.from('fastapi_processos').select('*').eq('reserva', reserva).maybeSingle();
      if (error) return respond(res, 502, { detail: 'Falha ao consultar processo.' });
      const { data: statuses } = await client.from('fastapi_documentos_status').select('documento_key,status').eq('reserva', reserva);
      return respond(res, 200, process ? toProcess(process, statuses || []) : { reserva });
    }

    if (parts.length === 1 && req.method === 'PUT') {
      const reserva = parts[0];
      const allowed = ['cliente', 'produto', 'sinal', 'fiador', 'corretor', 'empreendimento', 'cca_vinculado', 'observacao_analista', 'encaminhado_analista'];
      const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
      if (req.body?.caixa) updates.caixa_status = req.body.caixa;
      if (req.body?.agehab) updates.agehab_status = req.body.agehab;
      updates.reserva = reserva;
      updates.updated_at = new Date().toISOString();
      const { error } = await client.from('fastapi_processos').upsert(updates, { onConflict: 'reserva' });
      return error ? respond(res, 502, { detail: 'Falha ao salvar processo.' }) : respond(res, 200, { ok: true, reserva });
    }

    return respond(res, 404, { detail: 'Rota Node ainda não migrada.' });
  } catch (error) {
    return respond(res, 500, { detail: error instanceof Error ? error.message : 'Erro interno.' });
  }
}

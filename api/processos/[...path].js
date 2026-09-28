import { createClient } from '@supabase/supabase-js';

const labels = { analista: 'Analista', corretor: 'Corretor', gestor: 'Gestor', cca: 'CCA', todos: 'Todos' };
const documentStatuses = { aguardando: 'Aguardando', enviado: 'Enviado', 'em analise': 'Enviado', 'em análise': 'Enviado', pendente: 'Pendente', aprovado: 'Aprovado', 'nao se aplica': 'Nao se Aplica', 'não se aplica': 'Nao se Aplica', bloqueado: 'Bloqueado' };
const relationshipStatuses = { sim: 'sim', nao: 'nao', 'não': 'nao', 'nao se aplica': 'Nao se Aplica', 'não se aplica': 'Nao se Aplica' };
const respond = (res, status, body) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); return res.status(status).json(body); };

function clientFor(token) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configuração Supabase ausente no servidor.');
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}
async function authenticatedClient(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim(), client = clientFor(token);
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : { client, user: data.user };
}
function pathParts(req) { const path = req.query.path; return (Array.isArray(path) ? path : path ? [path] : []).flatMap((part) => String(part).split('/').filter(Boolean)); }
function normalized(value, values, field) { const result = values[String(value || '').trim().toLowerCase()]; if (!result) throw new Error(`${field} inválido.`); return result; }
function toProcess(row, details = {}) {
  const statuses = details.statuses || [], uploads = details.uploads || [];
  return { reserva: row.reserva, cliente: row.cliente, caixa: row.caixa_status || 'reserva', agehab: row.agehab_status || 'reserva', produto: row.produto, sinal: row.sinal, fiador: row.fiador, corretor: row.corretor, empreendimento: row.empreendimento, cca_vinculado: row.cca_vinculado, observacao_analista: row.observacao_analista, encaminhado_analista: Boolean(row.encaminhado_analista), documentos: Object.fromEntries(statuses.map((item) => [item.documento_key, item.status])), relacionamento: Object.fromEntries((details.relationships || []).map((item) => [item.relacionamento_key, item.status])), pendencias: Object.fromEntries((details.pending || []).map((item) => [item.documento_key, item])), pendenciasHistorico: details.pendingHistory || [], uploadsCca: Object.fromEntries(uploads.filter((item) => item.documento_key && ['corretor', 'gestor', 'caixa', 'cca'].includes(item.grupo)).map((item) => [item.documento_key, { name: item.file_name, data: item.url }])), uploadsEnviados: Object.fromEntries(uploads.filter((item) => item.documento_key).map((item) => [item.documento_key, true])), temDocumentoEnviado: uploads.length > 0, creditu: details.creditu || {} };
}
async function detailsFor(client, reserva) {
  const results = await Promise.all([
    client.from('fastapi_documentos_status').select('*').eq('reserva', reserva), client.from('fastapi_relacionamento_status').select('*').eq('reserva', reserva), client.from('fastapi_documentos_pendencias').select('*').eq('reserva', reserva), client.from('fastapi_pendencias_historico').select('*').eq('reserva', reserva).order('created_at', { ascending: true }), client.from('fastapi_uploads').select('*').eq('reserva', reserva).order('created_at', { ascending: false }), client.from('fastapi_creditu_dados').select('email_segundo_proponente,telefone_segundo_proponente').eq('reserva', reserva).maybeSingle(),
  ]);
  if (results.some((result) => result.error && result.error.code !== '42P01')) throw new Error('Falha ao consultar detalhes do processo.');
  return { statuses: results[0].data || [], relationships: results[1].data || [], pending: results[2].data || [], pendingHistory: results[3].data || [], uploads: results[4].data || [], creditu: results[5].data || {} };
}
async function ensureProcess(client, reserva) { const { error } = await client.from('fastapi_processos').upsert({ reserva, updated_at: new Date().toISOString() }, { onConflict: 'reserva', ignoreDuplicates: true }); if (error) throw new Error('Falha ao preparar processo.'); }
async function logEvent(client, reserva, status, user) { await client.from('log_eventos').insert({ id_cliente: reserva, status, timestamp: new Date().toISOString(), id_corretor: user.email || null }); }
async function diagnostics(client, req) {
  const { data, error } = await client.from('log_eventos').select('id_cliente,status,timestamp,id_corretor').order('timestamp', { ascending: true }).limit(5000);
  if (error) throw new Error('Falha ao consultar telemetria.');
  const target = Number(req.query.sla_meta || 7), retryLimit = Number(req.query.retrabalho_corte || 0), grouped = new Map();
  for (const event of data || []) grouped.set(event.id_cliente, [...(grouped.get(event.id_cliente) || []), event]);
  return [...grouped.entries()].flatMap(([id, events]) => { const start = events.find((event) => event.status === 'Reserva'), end = events.find((event) => event.status === 'Enviado para Conformidade'); if (!start || !end) return []; const days = (new Date(end.timestamp) - new Date(start.timestamp)) / 86400000, rework = events.filter((event, index) => ['Formulários Em Assinatura', 'Ficha emitida'].includes(event.status) && events.slice(0, index).some((previous) => /invalid|pendenc|reprov/i.test(previous.status || ''))).length; return [{ id_cliente: id, id_corretor: events.at(-1)?.id_corretor || null, Lead_Time_Total: Math.round(days * 100) / 100, Qtd_Retrabalho: rework, Diagnostico: days > target ? (rework > retryLimit ? 'Problema Documental' : 'Problema de Processo') : 'Processo Eficiente' }]; }).sort((a, b) => b.Lead_Time_Total - a.Lead_Time_Total);
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'PUT', 'POST', 'DELETE'].includes(req.method)) return respond(res, 405, { detail: 'Método não permitido.' });
    const auth = await authenticatedClient(req); if (!auth) return respond(res, 401, { detail: 'Autenticação obrigatória.' });
    const { client, user } = auth, parts = pathParts(req);
    if (req.method === 'GET' && parts[0] === 'diagnosticos' && parts[1] === 'gargalos') return respond(res, 200, await diagnostics(client, req));
    if (req.method === 'GET' && parts.length === 0) {
      let query = client.from('fastapi_processos').select('*').order('updated_at', { ascending: false }).limit(100);
      if (req.query.destino === 'analista') query = query.eq('encaminhado_analista', true);
      if (req.query.destino === 'cca') query = query.eq('encaminhado_analista', true).in('caixa_status', ['emitindo_formularios', 'formularios_em_assinatura', 'formularios_assinados', 'envio_conformidade']);
      const { data, error } = await query; if (error) throw new Error('Falha ao consultar processos.');
      return respond(res, 200, await Promise.all((data || []).map(async (row) => toProcess(row, await detailsFor(client, row.reserva)))));
    }
    const reserva = parts[0]; if (!reserva) return respond(res, 404, { detail: 'Rota não encontrada.' });
    if (parts.length === 1 && req.method === 'GET') { const { data, error } = await client.from('fastapi_processos').select('*').eq('reserva', reserva).maybeSingle(); if (error) throw new Error('Falha ao consultar processo.'); return respond(res, 200, toProcess(data || { reserva }, await detailsFor(client, reserva))); }
    if (parts.length === 1 && req.method === 'PUT') { const allowed = ['cliente', 'produto', 'sinal', 'fiador', 'corretor', 'empreendimento', 'cca_vinculado', 'observacao_analista', 'encaminhado_analista']; const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key))); if (req.body?.caixa) updates.caixa_status = String(req.body.caixa); if (req.body?.agehab) updates.agehab_status = String(req.body.agehab); const { error } = await client.from('fastapi_processos').upsert({ ...updates, reserva, updated_at: new Date().toISOString() }, { onConflict: 'reserva' }); if (error) throw new Error('Falha ao salvar processo.'); if (updates.encaminhado_analista) await logEvent(client, reserva, 'Reserva', user); return respond(res, 200, { ok: true, reserva }); }
    if (parts[1] === 'documentos' && parts[2] && req.method === 'PUT') {
      const documentKey = parts[2];
      if (parts[3] === 'pendencia') { if (req.body?.prazo && new Date(req.body.prazo) < new Date()) return respond(res, 400, { detail: 'O prazo da pendência não pode ser anterior ao horário atual.' }); await ensureProcess(client, reserva); const payload = { reserva, documento_key: req.body?.documento || documentKey, descricao: String(req.body?.descricao || ''), prazo: req.body?.prazo || null, origem: req.body?.origem || user.email || 'usuario', destino_card: req.body?.destinoCard || 'card1' }; const { error } = await client.from('fastapi_documentos_pendencias').upsert(payload, { onConflict: 'reserva,documento_key' }); if (error) throw new Error('Falha ao salvar pendência.'); await client.from('fastapi_pendencias_historico').insert({ ...payload, evento: 'criada' }); await logEvent(client, reserva, 'Pendencia documental', user); return respond(res, 200, { ok: true, reserva, documento: documentKey, card1Atualizado: true }); }
      const status = normalized(req.body?.status, documentStatuses, 'status'); await ensureProcess(client, reserva); const { error } = await client.from('fastapi_documentos_status').upsert({ reserva, documento_key: documentKey, status, updated_by: req.body?.updated_by || user.email || 'usuario', updated_at: new Date().toISOString() }, { onConflict: 'reserva,documento_key' }); if (error) throw new Error('Falha ao salvar documento.'); if (status !== 'Pendente') await client.from('fastapi_documentos_pendencias').delete().eq('reserva', reserva).eq('documento_key', documentKey); await logEvent(client, reserva, status, user); return respond(res, 200, { ok: true, reserva, documento: documentKey, status });
    }
    if (parts[1] === 'relacionamento' && parts[2] && req.method === 'PUT') { const status = normalized(req.body?.status, relationshipStatuses, 'status'); await ensureProcess(client, reserva); const { error } = await client.from('fastapi_relacionamento_status').upsert({ reserva, relacionamento_key: parts[2], status, updated_by: req.body?.updated_by || user.email || 'usuario', updated_at: new Date().toISOString() }, { onConflict: 'reserva,relacionamento_key' }); if (error) throw new Error('Falha ao salvar relacionamento.'); return respond(res, 200, { ok: true, reserva, relacionamento: parts[2], status }); }
    if (parts[1] === 'messages') {
      if (req.method === 'GET') { const { data, error } = await client.from('fastapi_checklist_messages').select('*').eq('reserva', reserva).order('created_at', { ascending: true }); if (error) throw new Error('Falha ao consultar mensagens.'); return respond(res, 200, (data || []).map((row) => ({ ...row, targetRole: row.target_role || 'todos', targetLabel: labels[row.target_role || 'todos'] || 'Todos' }))); }
      if (req.method === 'POST') { const message = String(req.body?.message || '').trim(), targetRole = String(req.body?.targetRole || req.body?.target_role || 'todos').toLowerCase(); if (!message) return respond(res, 400, { detail: 'Mensagem obrigatória.' }); if (!labels[targetRole]) return respond(res, 400, { detail: 'Destinatário inválido.' }); await ensureProcess(client, reserva); const { data, error } = await client.from('fastapi_checklist_messages').insert({ reserva, documento_key: req.body?.documento_key || null, author_name: user.email || 'Usuário', author_role: req.body?.author_role || 'usuario', target_role: targetRole, message }).select('*').single(); if (error) throw new Error('Falha ao salvar mensagem.'); return respond(res, 200, { ...data, targetRole, targetLabel: labels[targetRole] }); }
    }
    if (parts[1] === 'creditu') {
      if (req.method === 'GET') { const { data, error } = await client.from('fastapi_creditu_dados').select('email_segundo_proponente,telefone_segundo_proponente').eq('reserva', reserva).maybeSingle(); if (error && error.code !== '42P01') throw new Error('Falha ao consultar dados Creditú.'); return respond(res, 200, data || { email_segundo_proponente: '', telefone_segundo_proponente: '' }); }
      if (req.method === 'PUT') { await ensureProcess(client, reserva); const { data: current } = await client.from('fastapi_creditu_dados').select('*').eq('reserva', reserva).maybeSingle(); const { data, error } = await client.from('fastapi_creditu_dados').upsert({ reserva, email_segundo_proponente: req.body?.email_segundo_proponente ?? current?.email_segundo_proponente ?? '', telefone_segundo_proponente: req.body?.telefone_segundo_proponente ?? current?.telefone_segundo_proponente ?? '', updated_at: new Date().toISOString() }, { onConflict: 'reserva' }).select('email_segundo_proponente,telefone_segundo_proponente').single(); if (error) throw new Error('Falha ao salvar dados Creditú.'); return respond(res, 200, data); }
    }
    return respond(res, 404, { detail: 'Rota Node ainda não migrada.' });
  } catch (error) { return respond(res, 500, { detail: error instanceof Error ? error.message : 'Erro interno.' }); }
}

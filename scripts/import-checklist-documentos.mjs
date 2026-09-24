import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';
import xlsx from 'xlsx';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, 'backend', '.env'), override: true });

const args = process.argv.slice(2);
const excelPath = args.find((arg) => !arg.startsWith('--'));
const shouldApply = args.includes('--apply');
const onlyReservaArg = args.find((arg) => arg.startsWith('--reserva='));
const onlyReserva = onlyReservaArg ? onlyReservaArg.split('=').slice(1).join('=').trim() : '';

if (!excelPath) {
  console.error('Uso: npm run import:checklist-documentos -- "C:\\caminho\\chat-excel.xlsx" [--apply] [--reserva=7275]');
  process.exit(1);
}

if (!fs.existsSync(excelPath)) {
  console.error(`Arquivo nao encontrado: ${excelPath}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (shouldApply && !databaseUrl) {
  console.error('DATABASE_URL nao configurada. Preencha backend/.env ou .env antes de usar --apply.');
  process.exit(1);
}

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const text = (value) => String(value ?? '').trim();

const documentKeyByLabel = new Map([
  ['rg/cpf/cnh', 'documentos-do-proponente-identidade-e-cpf-1'],
  ['certidao do estado civil', 'documentos-do-proponente-comp-de-estado-civil-2'],
  ['renda', 'renda-formal-clt-vinculo-holerites-1'],
  ['comprovante de endereco', 'documentos-do-proponente-comprovante-de-residencia-3'],
  ['extrato de fgts', 'documentos-do-proponente-extrato-fgts-5'],
  ['ctps', 'documentos-do-proponente-ctps-carteira-6'],
  ['autorizacao de consulta do fgts', 'documentos-do-proponente-extrato-fgts-5'],
  ['rg/cpf/cnh companheiro', 'documentos-do-proponente-identidade-e-cpf-1'],
  ['renda do conjuge', 'renda-formal-clt-vinculo-holerites-1'],
  ['dependente', 'dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1'],
  ['rg/cpf do dependente', 'dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1'],
  ['certidao do estado civil do dependente', 'dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2'],
  ['declaracao de parentesco (modelo caixa)', 'dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3'],
  ['tela do score', 'documentos-creditu-tela-score-cliente-1'],
  ['tela do sicaq', 'documentos-creditu-tela-sicaq-cliente-7'],
  ['tela de aprovacao do simulador', 'documentos-creditu-tela-aprovacao-creditu-6'],
  ['rg/cpf segundo proponente', 'documentos-creditu-rg-cpf-ou-cnh-2'],
  ['email / telefone segundo proponente', 'documentos-creditu-email-segundo-proponente-4'],
  ['damp', 'documentos-caixa-damp-1'],
  ['ficha cadastro', 'documentos-caixa-ficha-de-cadastro-caixa-2'],
  ['ficha de abertura de conta', 'documentos-caixa-abertura-de-conta-3'],
  ['mo - seguro habitacional', 'documentos-caixa-mo-4'],
  ['ficha de cartao de credito', 'documentos-caixa-formulario-cartao-6'],
  ['ficha cheque especial', 'documentos-caixa-formulario-cheque-azul-5'],
  ['rg/cpf do declarante', 'documentos-agehab-declaracao-de-endereco-1'],
  ['documento agehab - beneficiario', 'documentos-agehab-ficha-agehab-6'],
  ['documento agehab - dependente', 'documentos-agehab-checklist-agehab-5'],
  ['observacao agehab', 'documentos-agehab-checklist-agehab-5'],
]);

function statusFromExcel(value) {
  const normalized = normalize(value);
  if (!normalized) return 'Aguardando';
  if (['sim', 'emitidos', 'assinados', 'enviados para o cca'].includes(normalized)) return 'Enviado';
  if (['pendente', 'pendentes'].includes(normalized)) return 'Pendente';
  if (['nao aplica', 'nao se aplica'].includes(normalized)) return 'Nao se Aplica';
  return 'Aguardando';
}

function deadlineFromExcel(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return text(value) || null;
}

function pendencyDescription(row) {
  return [row.Comentarios, row.Observacao]
    .map(text)
    .filter(Boolean)
    .join(' - ');
}

function loadRows(file) {
  const workbook = xlsx.readFile(file, { cellDates: true });
  const worksheet = workbook.Sheets.CHECKLIST_DOCUMENTOS;
  if (!worksheet) {
    throw new Error('Aba CHECKLIST_DOCUMENTOS nao encontrada no arquivo.');
  }
  return xlsx.utils.sheet_to_json(worksheet, { defval: '', raw: false });
}

async function ensureTables(client) {
  await client.query(`
    create extension if not exists pgcrypto;

    create table if not exists public.fastapi_processos (
      reserva text primary key,
      cliente text,
      caixa_status text not null default 'reserva',
      agehab_status text not null default 'reserva',
      produto text,
      sinal text,
      fiador text,
      corretor text,
      empreendimento text,
      cca_vinculado text,
      observacao_analista text,
      encaminhado_analista boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.fastapi_documentos_status (
      id uuid primary key default gen_random_uuid(),
      reserva text not null references public.fastapi_processos(reserva) on delete cascade,
      documento_key text not null,
      status text not null default 'Aguardando',
      updated_by text,
      updated_at timestamptz not null default now(),
      unique (reserva, documento_key)
    );

    create table if not exists public.fastapi_documentos_pendencias (
      id uuid primary key default gen_random_uuid(),
      reserva text not null references public.fastapi_processos(reserva) on delete cascade,
      documento_key text not null,
      descricao text not null default '',
      prazo text,
      origem text,
      destino_card text not null default 'card1',
      updated_at timestamptz not null default now(),
      unique (reserva, documento_key)
    );
  `);
}

async function saveRow(client, item) {
  await client.query(
    `
      insert into public.fastapi_processos (reserva, updated_at)
      values ($1, now())
      on conflict (reserva) do update set updated_at = now()
    `,
    [item.reserva],
  );

  await client.query(
    `
      insert into public.fastapi_documentos_status (reserva, documento_key, status, updated_by, updated_at)
      values ($1, $2, $3, 'excel', now())
      on conflict (reserva, documento_key) do update set
        status = excluded.status,
        updated_by = excluded.updated_by,
        updated_at = now()
    `,
    [item.reserva, item.documentoKey, item.status],
  );

  if (item.status === 'Pendente') {
    await client.query(
      `
        insert into public.fastapi_documentos_pendencias
          (reserva, documento_key, descricao, prazo, origem, destino_card, updated_at)
        values ($1, $2, $3, $4, 'excel', 'card1', now())
        on conflict (reserva, documento_key) do update set
          descricao = excluded.descricao,
          prazo = excluded.prazo,
          origem = excluded.origem,
          destino_card = excluded.destino_card,
          updated_at = now()
      `,
      [item.reserva, item.documentoKey, item.descricao || 'Documento pendente no checklist importado do Excel.', item.prazo],
    );
  } else {
    await client.query(
      'delete from public.fastapi_documentos_pendencias where reserva = $1 and documento_key = $2',
      [item.reserva, item.documentoKey],
    );
  }
}

const rawRows = loadRows(excelPath);
const items = [];
const skipped = [];

for (const row of rawRows) {
  const reserva = text(row.Reserva);
  const label = text(row.TipoDocumento);
  if (!reserva || !label) continue;
  if (onlyReserva && reserva !== onlyReserva) continue;

  const documentoKey = documentKeyByLabel.get(normalize(label));
  if (!documentoKey) {
    skipped.push({ reserva, tipoDocumento: label, motivo: 'TipoDocumento sem mapeamento' });
    continue;
  }

  items.push({
    reserva,
    documentoKey,
    status: statusFromExcel(row.Situacao),
    descricao: pendencyDescription(row),
    prazo: deadlineFromExcel(row.SLA),
  });
}

const reservas = new Set(items.map((item) => item.reserva));
const documentos = new Set(items.map((item) => item.documentoKey));

console.log(`Arquivo: ${excelPath}`);
console.log(`Aba: CHECKLIST_DOCUMENTOS`);
console.log(`Linhas lidas: ${rawRows.length}`);
console.log(`Registros mapeados: ${items.length}`);
console.log(`Reservas afetadas: ${reservas.size}`);
console.log(`Documentos distintos: ${documentos.size}`);
console.log(`Ignorados: ${skipped.length}`);

if (skipped.length) {
  console.log('\nPrimeiros ignorados:');
  skipped.slice(0, 20).forEach((item) => {
    console.log(`- reserva ${item.reserva}: ${item.tipoDocumento} (${item.motivo})`);
  });
}

if (!shouldApply) {
  console.log('\nSimulacao concluida. Use --apply para gravar no banco.');
  process.exit(0);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  await ensureTables(client);
  await client.query('begin');
  for (const item of items) {
    await saveRow(client, item);
  }
  await client.query('commit');
  console.log(`\nImportacao concluida: ${items.length} registros salvos.`);
} catch (error) {
  await client.query('rollback');
  console.error('\nFalha na importacao. Nenhuma alteracao foi confirmada.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}

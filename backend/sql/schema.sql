create extension if not exists pgcrypto;

create table if not exists public.processos (
  reserva text primary key,
  cliente text,
  caixa_status text not null default 'reserva',
  agehab_status text not null default 'reserva',
  produto text,
  sinal text,
  fiador text,
  corretor text,
  empreendimento text,
  observacao_analista text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.processos
  add column if not exists observacao_analista text;

create table if not exists public.documentos_status (
  id uuid primary key default gen_random_uuid(),
  reserva text not null references public.processos(reserva) on delete cascade,
  documento_key text not null,
  status text not null default 'Aguardando',
  updated_by text,
  updated_at timestamptz not null default now(),
  unique (reserva, documento_key)
);

create table if not exists public.relacionamento_status (
  id uuid primary key default gen_random_uuid(),
  reserva text not null references public.processos(reserva) on delete cascade,
  relacionamento_key text not null,
  status text not null default 'nao',
  updated_by text,
  updated_at timestamptz not null default now(),
  unique (reserva, relacionamento_key)
);

create table if not exists public.documentos_pendencias (
  id uuid primary key default gen_random_uuid(),
  reserva text not null references public.processos(reserva) on delete cascade,
  documento_key text not null,
  descricao text not null default '',
  prazo text,
  origem text,
  destino_card text not null default 'card1',
  updated_at timestamptz not null default now(),
  unique (reserva, documento_key)
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  reserva text not null references public.processos(reserva) on delete cascade,
  grupo text not null default 'geral',
  documento_key text not null,
  file_name text not null,
  storage_path text not null,
  url text not null,
  content_type text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.contextos (
  id uuid primary key default gen_random_uuid(),
  contexto text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists processos_set_updated_at on public.processos;
create trigger processos_set_updated_at
before update on public.processos
for each row execute function public.set_updated_at();

drop trigger if exists documentos_status_set_updated_at on public.documentos_status;
create trigger documentos_status_set_updated_at
before update on public.documentos_status
for each row execute function public.set_updated_at();

drop trigger if exists relacionamento_status_set_updated_at on public.relacionamento_status;
create trigger relacionamento_status_set_updated_at
before update on public.relacionamento_status
for each row execute function public.set_updated_at();

drop trigger if exists documentos_pendencias_set_updated_at on public.documentos_pendencias;
create trigger documentos_pendencias_set_updated_at
before update on public.documentos_pendencias
for each row execute function public.set_updated_at();

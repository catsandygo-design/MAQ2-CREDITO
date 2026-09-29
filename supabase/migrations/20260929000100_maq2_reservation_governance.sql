-- Camada de governanca para a ficha de reserva MAQ2.
-- Nao altera nem remove dados das tabelas fastapi_* legadas.

create extension if not exists pgcrypto;

create table if not exists public.maq2_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('gestor', 'analista', 'corretor', 'cca', 'viewer')),
  active boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maq2_reservation_documents (
  id uuid primary key default gen_random_uuid(),
  reserva text not null references public.fastapi_processos(reserva) on delete cascade,
  document_group text not null,
  document_type text not null,
  person_role text not null,
  file_name text not null,
  storage_path text not null,
  content_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  status text not null default 'aguardando_analise' check (status in ('aguardando_analise', 'aprovado', 'pendente', 'rejeitado', 'nao_se_aplica')),
  ai_precheck jsonb not null default '{}'::jsonb,
  human_decision jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists maq2_document_active_unique
  on public.maq2_reservation_documents (reserva, document_group, document_type, person_role)
  where status <> 'rejeitado';
create index if not exists maq2_documents_reserva_idx on public.maq2_reservation_documents (reserva, created_at desc);

create table if not exists public.maq2_process_tasks (
  id uuid primary key default gen_random_uuid(),
  reserva text not null references public.fastapi_processos(reserva) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 240),
  description text,
  severity text not null default 'atencao' check (severity in ('informativa', 'atencao', 'bloqueadora')),
  status text not null default 'aberta' check (status in ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  blocks_progress boolean not null default false,
  due_at timestamptz,
  assigned_role text check (assigned_role in ('gestor', 'analista', 'corretor', 'cca')),
  assigned_to uuid references auth.users(id) on delete set null,
  source_type text not null default 'manual' check (source_type in ('manual', 'documento', 'regra', 'sistema')),
  source_document_id uuid references public.maq2_reservation_documents(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('concluida', 'cancelada')) = (resolved_at is not null))
);
create index if not exists maq2_tasks_reserva_status_idx on public.maq2_process_tasks (reserva, status, due_at);

create table if not exists public.maq2_reservation_audit (
  id uuid primary key default gen_random_uuid(),
  reserva text not null,
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  before_data jsonb,
  after_data jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists maq2_audit_reserva_created_idx on public.maq2_reservation_audit (reserva, created_at desc);

create or replace function public.maq2_current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.maq2_user_roles where user_id = auth.uid() and active limit 1;
$$;

create or replace function public.maq2_audit_reservation_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_reserva text;
begin
  target_reserva := coalesce(new.reserva, old.reserva);
  insert into public.maq2_reservation_audit (reserva, entity_type, entity_id, action, before_data, after_data, actor_id)
  values (target_reserva, tg_table_name, coalesce(new.id, old.id), lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    auth.uid());
  return coalesce(new, old);
end;
$$;

create or replace function public.maq2_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;

revoke all on function public.maq2_current_role() from public;
revoke all on function public.maq2_audit_reservation_change() from public;
revoke all on function public.maq2_touch_updated_at() from public;
grant execute on function public.maq2_current_role() to authenticated;

drop trigger if exists maq2_documents_audit on public.maq2_reservation_documents;
create trigger maq2_documents_audit after insert or update or delete on public.maq2_reservation_documents
for each row execute function public.maq2_audit_reservation_change();
drop trigger if exists maq2_tasks_audit on public.maq2_process_tasks;
create trigger maq2_tasks_audit after insert or update or delete on public.maq2_process_tasks
for each row execute function public.maq2_audit_reservation_change();
drop trigger if exists maq2_documents_touch on public.maq2_reservation_documents;
create trigger maq2_documents_touch before update on public.maq2_reservation_documents
for each row execute function public.maq2_touch_updated_at();
drop trigger if exists maq2_tasks_touch on public.maq2_process_tasks;
create trigger maq2_tasks_touch before update on public.maq2_process_tasks
for each row execute function public.maq2_touch_updated_at();

alter table public.maq2_user_roles enable row level security;
alter table public.maq2_reservation_documents enable row level security;
alter table public.maq2_process_tasks enable row level security;
alter table public.maq2_reservation_audit enable row level security;

revoke all on public.maq2_user_roles, public.maq2_reservation_documents, public.maq2_process_tasks, public.maq2_reservation_audit from anon;
revoke all on public.maq2_user_roles, public.maq2_reservation_documents, public.maq2_process_tasks, public.maq2_reservation_audit from authenticated;
grant select on public.maq2_user_roles to authenticated;
grant select, insert, update on public.maq2_reservation_documents to authenticated;
grant select, insert, update on public.maq2_process_tasks to authenticated;
grant select on public.maq2_reservation_audit to authenticated;

create policy maq2_roles_read_own on public.maq2_user_roles for select to authenticated using (user_id = auth.uid());
create policy maq2_documents_read_team on public.maq2_reservation_documents for select to authenticated using (public.maq2_current_role() is not null);
create policy maq2_documents_upload on public.maq2_reservation_documents for insert to authenticated with check (public.maq2_current_role() in ('corretor', 'gestor', 'cca') and uploaded_by = auth.uid());
create policy maq2_documents_review on public.maq2_reservation_documents for update to authenticated using (public.maq2_current_role() in ('analista', 'gestor')) with check (public.maq2_current_role() in ('analista', 'gestor'));
create policy maq2_tasks_read_team on public.maq2_process_tasks for select to authenticated using (public.maq2_current_role() is not null);
create policy maq2_tasks_create_team on public.maq2_process_tasks for insert to authenticated with check (public.maq2_current_role() in ('corretor', 'cca', 'analista', 'gestor') and created_by = auth.uid());
create policy maq2_tasks_update_owner on public.maq2_process_tasks for update to authenticated using (public.maq2_current_role() in ('analista', 'gestor') or assigned_to = auth.uid()) with check (public.maq2_current_role() in ('analista', 'gestor') or assigned_to = auth.uid());
create policy maq2_audit_read_management on public.maq2_reservation_audit for select to authenticated using (public.maq2_current_role() in ('analista', 'gestor'));

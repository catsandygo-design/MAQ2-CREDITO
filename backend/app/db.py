from collections.abc import Iterable
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.config import get_settings


def get_database_url() -> str:
    database_url = get_settings().database_url
    if not database_url:
        raise RuntimeError("DATABASE_URL nao configurada.")
    return database_url


def fetch_all(query: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
    with psycopg.connect(get_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            return list(cur.fetchall())


def fetch_one(query: str, params: Iterable[Any] = ()) -> dict[str, Any] | None:
    with psycopg.connect(get_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            return cur.fetchone()


def execute(query: str, params: Iterable[Any] = ()) -> None:
    with psycopg.connect(get_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
        conn.commit()


def init_db() -> None:
    schema = """
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

    alter table public.fastapi_processos
      add column if not exists encaminhado_analista boolean not null default false;

    alter table public.fastapi_processos
      add column if not exists observacao_analista text;

    alter table public.fastapi_processos
      add column if not exists cca_vinculado text;

    create table if not exists public.fastapi_documentos_status (
      id uuid primary key default gen_random_uuid(),
      reserva text not null references public.fastapi_processos(reserva) on delete cascade,
      documento_key text not null,
      status text not null default 'Aguardando',
      updated_by text,
      updated_at timestamptz not null default now(),
      unique (reserva, documento_key)
    );

    create table if not exists public.fastapi_relacionamento_status (
      id uuid primary key default gen_random_uuid(),
      reserva text not null references public.fastapi_processos(reserva) on delete cascade,
      relacionamento_key text not null,
      status text not null default 'nao',
      updated_by text,
      updated_at timestamptz not null default now(),
      unique (reserva, relacionamento_key)
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

    create table if not exists public.fastapi_uploads (
      id uuid primary key default gen_random_uuid(),
      reserva text not null references public.fastapi_processos(reserva) on delete cascade,
      grupo text not null default 'geral',
      documento_key text not null,
      file_name text not null,
      storage_path text not null,
      url text not null,
      content_type text,
      created_by text,
      created_at timestamptz not null default now()
    );

    create table if not exists public.fastapi_sla_processos (
      reserva text primary key references public.fastapi_processos(reserva) on delete cascade,
      started_at timestamptz not null default now(),
      stopped_at timestamptz,
      stop_reason text,
      updated_at timestamptz not null default now()
    );

    create table if not exists public.fastapi_contextos (
      id uuid primary key default gen_random_uuid(),
      contexto text not null,
      created_at timestamptz not null default now()
    );
    """
    with psycopg.connect(get_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(schema)
        conn.commit()

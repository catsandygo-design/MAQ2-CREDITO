from __future__ import annotations

from typing import Any, Callable


def ensure_frankstein_tables(*, conn_factory: Callable[[], Any], logger: Any) -> None:
    conn = conn_factory()
    if conn is None:
        return
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                DO $$
                BEGIN
                    IF to_regclass('public.frankstein_events') IS NULL AND to_regclass('public.yvy_events') IS NOT NULL THEN
                        EXECUTE 'ALTER TABLE yvy_events RENAME TO frankstein_events';
                    END IF;
                    IF to_regclass('public.frankstein_models') IS NULL AND to_regclass('public.yvy_models') IS NOT NULL THEN
                        EXECUTE 'ALTER TABLE yvy_models RENAME TO frankstein_models';
                    END IF;
                END
                $$;
                """
            )
            cur.execute(
                """
                create table if not exists frankstein_events(
                    id bigserial primary key,
                    event_id uuid,
                    "timestamp" timestamptz default now(),
                    processo_id text,
                    lead_id text,
                    cliente_id text,
                    reserva_id text,
                    corretor_id text,
                    empreendimento text,
                    perfil text,
                    renda_bruta numeric,
                    valor_tabela numeric,
                    sobrepreco_vila numeric,
                    valor_obtido numeric,
                    parcela_caixa numeric,
                    preco_digitado_corretor numeric,
                    preco_base_politica numeric,
                    preco_final numeric,
                    entrada_liquida numeric,
                    valor_parcela_entrada numeric,
                    is_pos_chaves numeric,
                    status_ia_heuristica text,
                    bloqueio_critico boolean,
                    motivo_auditoria text,
                    garantidores_necessarios integer,
                    exposicao_risco numeric,
                    alerta_preco text,
                    valor_venda numeric,
                    garantido numeric,
                    cheque_moradia numeric,
                    faltante numeric,
                    qtd_problemas_documentais integer,
                    score_risco_regra numeric,
                    status_geral_regra text,
                    decisao_recomendada_regra text,
                    probabilidade_modelo numeric,
                    preco_frankstein numeric,
                    confianca_modelo numeric,
                    modelo_versao text,
                    teve_pendencia_cca boolean,
                    teve_pendencia_agehab boolean,
                    foi_aprovado boolean,
                    foi_reprovado boolean,
                    virou_condicionado boolean,
                    assinou_caixa boolean,
                    finalizou boolean,
                    tempo_ate_assinatura_horas numeric,
                    tempo_total_processo_horas numeric,
                    retorno_cca text,
                    resultado_real text,
                    input_json jsonb,
                    heuristica_json jsonb,
                    frankstein_json jsonb,
                    features_json jsonb,
                    origem text,
                    created_at timestamptz default now(),
                    updated_at timestamptz default now()
                );
                """
            )
            alter_statements = [
                'alter table frankstein_events add column if not exists event_id uuid',
                'alter table frankstein_events add column if not exists "timestamp" timestamptz',
                'alter table frankstein_events add column if not exists processo_id text',
                'alter table frankstein_events add column if not exists lead_id text',
                'alter table frankstein_events add column if not exists cliente_id text',
                'alter table frankstein_events add column if not exists reserva_id text',
                'alter table frankstein_events add column if not exists corretor_id text',
                'alter table frankstein_events add column if not exists empreendimento text',
                'alter table frankstein_events add column if not exists perfil text',
                'alter table frankstein_events add column if not exists preco_base_politica numeric',
                'alter table frankstein_events add column if not exists preco_final numeric',
                'alter table frankstein_events add column if not exists entrada_liquida numeric',
                'alter table frankstein_events add column if not exists valor_parcela_entrada numeric',
                'alter table frankstein_events add column if not exists status_ia_heuristica text',
                'alter table frankstein_events add column if not exists bloqueio_critico boolean',
                'alter table frankstein_events add column if not exists motivo_auditoria text',
                'alter table frankstein_events add column if not exists garantidores_necessarios integer',
                'alter table frankstein_events add column if not exists exposicao_risco numeric',
                'alter table frankstein_events add column if not exists alerta_preco text',
                'alter table frankstein_events add column if not exists valor_venda numeric',
                'alter table frankstein_events add column if not exists garantido numeric',
                'alter table frankstein_events add column if not exists cheque_moradia numeric',
                'alter table frankstein_events add column if not exists faltante numeric',
                'alter table frankstein_events add column if not exists qtd_problemas_documentais integer',
                'alter table frankstein_events add column if not exists score_risco_regra numeric',
                'alter table frankstein_events add column if not exists status_geral_regra text',
                'alter table frankstein_events add column if not exists decisao_recomendada_regra text',
                'alter table frankstein_events add column if not exists probabilidade_modelo numeric',
                'alter table frankstein_events add column if not exists preco_frankstein numeric',
                'alter table frankstein_events add column if not exists confianca_modelo numeric',
                'alter table frankstein_events add column if not exists modelo_versao text',
                'alter table frankstein_events add column if not exists teve_pendencia_cca boolean',
                'alter table frankstein_events add column if not exists teve_pendencia_agehab boolean',
                'alter table frankstein_events add column if not exists foi_aprovado boolean',
                'alter table frankstein_events add column if not exists foi_reprovado boolean',
                'alter table frankstein_events add column if not exists virou_condicionado boolean',
                'alter table frankstein_events add column if not exists assinou_caixa boolean',
                'alter table frankstein_events add column if not exists finalizou boolean',
                'alter table frankstein_events add column if not exists tempo_ate_assinatura_horas numeric',
                'alter table frankstein_events add column if not exists tempo_total_processo_horas numeric',
                'alter table frankstein_events add column if not exists retorno_cca text',
                'alter table frankstein_events add column if not exists resultado_real text',
                'alter table frankstein_events add column if not exists input_json jsonb',
                'alter table frankstein_events add column if not exists heuristica_json jsonb',
                'alter table frankstein_events add column if not exists frankstein_json jsonb',
                'alter table frankstein_events add column if not exists features_json jsonb',
                'alter table frankstein_events add column if not exists origem text',
                'alter table frankstein_events add column if not exists updated_at timestamptz default now()',
            ]
            for statement in alter_statements:
                cur.execute(statement)
            cur.execute("create unique index if not exists ix_frankstein_events_event_id on frankstein_events(event_id)")
            cur.execute('create index if not exists ix_frankstein_events_timestamp on frankstein_events("timestamp")')
            cur.execute("create index if not exists ix_frankstein_events_processo_id on frankstein_events(processo_id)")
            cur.execute("create index if not exists ix_frankstein_events_lead_id on frankstein_events(lead_id)")
            cur.execute("create index if not exists ix_frankstein_events_resultado_real on frankstein_events(resultado_real)")
            cur.execute(
                """
                create table if not exists frankstein_models(
                    id bigserial primary key,
                    version text not null,
                    created_at timestamptz default now(),
                    artifact jsonb not null,
                    notes text
                );
                """
            )
    except Exception:
        logger.exception("Nao foi possivel garantir tabelas frankstein no banco.")
    finally:
        conn.close()

from __future__ import annotations

import hashlib
import json
import os
import sys
import uuid
from pathlib import Path
from typing import Any

import psycopg


ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
RAW_FRANKSTEIN_PATH = ROOT / "data" / "raw" / "frankstein_events.json"
LEGACY_YVY_PATH = ROOT / "data" / "yvy_events.json"
DB_URL = os.getenv("FRANKSTEIN_DB_URL") or os.getenv("YVY_DB_URL") or os.getenv("DATABASE_URL")
LEGACY_NAMESPACE = uuid.UUID("49f22d64-6173-4df1-a17a-5bfa2b01c921")


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _clean_float(value: Any, *, digits: int = 6) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


def _safe_percent_ratio(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip().replace("%", "").replace(",", ".")
    if not text:
        return None
    try:
        return round(float(text) / 100.0, 6)
    except (TypeError, ValueError):
        return None


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    loaded = json.loads(path.read_text(encoding="utf-8"))
    return loaded if isinstance(loaded, list) else []


def _event_fingerprint(event: dict[str, Any]) -> str:
    canonical = {
        "timestamp": event.get("timestamp"),
        "input": event.get("input"),
        "heuristica": event.get("heuristica"),
        "frankstein": event.get("frankstein"),
        "features": event.get("features"),
        "user_agent": event.get("user_agent"),
        "client_host": event.get("client_host"),
    }
    encoded = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _normalize_frankstein_payload(event: dict[str, Any]) -> dict[str, Any]:
    payload = event.get("frankstein")
    if not isinstance(payload, dict):
        payload = event.get("yvy")
    normalized = dict(payload) if isinstance(payload, dict) else {}
    if "preco_frankstein" not in normalized and "preco_yvy" in normalized:
        normalized["preco_frankstein"] = normalized.get("preco_yvy")
    normalized.setdefault("_legacy_source", "yvy")
    return normalized


def _normalize_features_payload(event: dict[str, Any], heuristica: dict[str, Any]) -> dict[str, Any]:
    payload = dict(event.get("features") or {})
    leitura = heuristica.get("leitura_executiva_corretor", {}) if isinstance(heuristica, dict) else {}
    if "expo" not in payload:
        payload["expo"] = _safe_percent_ratio(leitura.get("risco_exposicao"))
    if "is_pos" not in payload:
        payload["is_pos"] = _safe_percent_ratio(leitura.get("is_pos_chaves"))
    return payload


def _normalize_event(event: dict[str, Any], *, source_name: str) -> dict[str, Any] | None:
    origem = _clean_text(event.get("origem"))
    if origem and origem.startswith("smoke_"):
        return None

    input_payload = dict(event.get("input") or {})
    heuristica_payload = dict(event.get("heuristica") or {})
    frankstein_payload = _normalize_frankstein_payload(event)
    features_payload = _normalize_features_payload(event, heuristica_payload)
    leitura = heuristica_payload.get("leitura_executiva_corretor", {}) if isinstance(heuristica_payload, dict) else {}
    apresentacao = heuristica_payload.get("apresentacao_cliente", {}) if isinstance(heuristica_payload, dict) else {}

    timestamp = _clean_text(event.get("timestamp"))
    fingerprint = _event_fingerprint(
        {
            "timestamp": timestamp,
            "input": input_payload,
            "heuristica": heuristica_payload,
            "frankstein": frankstein_payload,
            "features": features_payload,
            "user_agent": event.get("user_agent"),
            "client_host": event.get("client_host"),
        }
    )
    event_id = _clean_text(event.get("event_id")) or str(uuid.uuid5(LEGACY_NAMESPACE, fingerprint))
    valor_tabela = _clean_float(input_payload.get("valor_tabela"), digits=2)
    valor_obtido = _clean_float(input_payload.get("valor_obtido"), digits=2)
    sobrepreco = _clean_float(input_payload.get("sobrepreco_vila"), digits=2) or 0.0
    preco_base_politica = None
    if valor_tabela is not None and valor_obtido is not None:
        preco_base_politica = round(max(valor_tabela, valor_obtido) + sobrepreco, 2)

    return {
        "event_id": event_id,
        "timestamp": timestamp,
        "processo_id": _clean_text(event.get("processo_id")),
        "lead_id": _clean_text(event.get("lead_id")),
        "cliente_id": _clean_text(event.get("cliente_id")),
        "reserva_id": _clean_text(event.get("reserva_id")),
        "corretor_id": _clean_text(event.get("corretor_id")),
        "empreendimento": _clean_text(event.get("empreendimento") or input_payload.get("empreendimento")),
        "perfil": _clean_text(event.get("perfil") or input_payload.get("perfil")),
        "renda_bruta": _clean_float(input_payload.get("renda_bruta"), digits=2),
        "valor_tabela": valor_tabela,
        "sobrepreco_vila": _clean_float(input_payload.get("sobrepreco_vila"), digits=2),
        "valor_obtido": valor_obtido,
        "parcela_caixa": _clean_float(input_payload.get("parcela_caixa"), digits=2),
        "preco_digitado_corretor": _clean_float(input_payload.get("preco_digitado_corretor"), digits=2),
        "preco_base_politica": preco_base_politica,
        "preco_final": _clean_float(apresentacao.get("valor_imovel"), digits=2),
        "entrada_liquida": _clean_float(apresentacao.get("entrada_facilitada"), digits=2),
        "valor_parcela_entrada": _clean_float(apresentacao.get("valor_parcela"), digits=2),
        "is_pos_chaves": _clean_float(features_payload.get("is_pos"), digits=6) or _safe_percent_ratio(leitura.get("is_pos_chaves")),
        "status_ia_heuristica": _clean_text(leitura.get("status_ia") or frankstein_payload.get("status_ia")),
        "bloqueio_critico": bool(leitura.get("bloqueio_critico", False)),
        "motivo_auditoria": _clean_text(leitura.get("motivo_auditoria")),
        "garantidores_necessarios": leitura.get("garantidores_necessarios"),
        "exposicao_risco": _clean_float(features_payload.get("expo"), digits=6) or _safe_percent_ratio(leitura.get("risco_exposicao")),
        "alerta_preco": _clean_text(leitura.get("alerta_preco")),
        "valor_venda": _clean_float(event.get("valor_venda"), digits=2),
        "garantido": _clean_float(event.get("garantido"), digits=2),
        "cheque_moradia": _clean_float(event.get("cheque_moradia"), digits=2),
        "faltante": _clean_float(event.get("faltante"), digits=2),
        "qtd_problemas_documentais": event.get("qtd_problemas_documentais"),
        "score_risco_regra": _clean_float(event.get("score_risco_regra"), digits=6),
        "status_geral_regra": _clean_text(event.get("status_geral_regra")),
        "decisao_recomendada_regra": _clean_text(event.get("decisao_recomendada_regra")),
        "probabilidade_modelo": _clean_float(frankstein_payload.get("prob_aceite"), digits=6),
        "preco_frankstein": _clean_float(frankstein_payload.get("preco_frankstein") or frankstein_payload.get("preco_yvy"), digits=2),
        "confianca_modelo": _clean_float(frankstein_payload.get("confianca"), digits=6),
        "modelo_versao": "legacy-yvy-file-import",
        "teve_pendencia_cca": None,
        "teve_pendencia_agehab": None,
        "foi_aprovado": None,
        "foi_reprovado": None,
        "virou_condicionado": None,
        "assinou_caixa": None,
        "finalizou": None,
        "tempo_ate_assinatura_horas": None,
        "tempo_total_processo_horas": None,
        "retorno_cca": None,
        "resultado_real": None,
        "input_json": input_payload,
        "heuristica_json": heuristica_payload,
        "frankstein_json": frankstein_payload,
        "features_json": features_payload,
        "origem": origem or f"legacy_import::{source_name}",
        "_fingerprint": fingerprint,
        "_source_name": source_name,
    }


def _iter_legacy_events() -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    seen_fingerprints: set[str] = set()
    for source_path in [RAW_FRANKSTEIN_PATH, LEGACY_YVY_PATH]:
        source_name = source_path.name
        for event in _load_json_list(source_path):
            if not isinstance(event, dict):
                continue
            normalized_event = _normalize_event(event, source_name=source_name)
            if normalized_event is None:
                continue
            fingerprint = normalized_event["_fingerprint"]
            if fingerprint in seen_fingerprints:
                continue
            seen_fingerprints.add(fingerprint)
            normalized.append(normalized_event)
    return normalized


INSERT_SQL = """
insert into frankstein_events(
    event_id, "timestamp", processo_id, lead_id, cliente_id, reserva_id, corretor_id, empreendimento, perfil,
    renda_bruta, valor_tabela, sobrepreco_vila, valor_obtido, parcela_caixa, preco_digitado_corretor,
    preco_base_politica, preco_final, entrada_liquida, valor_parcela_entrada, is_pos_chaves,
    status_ia_heuristica, bloqueio_critico, motivo_auditoria, garantidores_necessarios,
    exposicao_risco, alerta_preco, valor_venda, garantido, cheque_moradia, faltante,
    qtd_problemas_documentais, score_risco_regra, status_geral_regra, decisao_recomendada_regra,
    probabilidade_modelo, preco_frankstein, confianca_modelo, modelo_versao,
    teve_pendencia_cca, teve_pendencia_agehab, foi_aprovado, foi_reprovado, virou_condicionado,
    assinou_caixa, finalizou, tempo_ate_assinatura_horas, tempo_total_processo_horas,
    retorno_cca, resultado_real, input_json, heuristica_json, frankstein_json, features_json, origem, updated_at
)
values (
    %s,%s,%s,%s,%s,%s,%s,%s,%s,
    %s,%s,%s,%s,%s,%s,
    %s,%s,%s,%s,%s,
    %s,%s,%s,%s,
    %s,%s,%s,%s,%s,%s,
    %s,%s,%s,%s,
    %s,%s,%s,%s,
    %s,%s,%s,%s,%s,
    %s,%s,%s,%s,
    %s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s::jsonb,%s,now()
)
on conflict (event_id) do nothing
"""


def _insert_legacy_events(events: list[dict[str, Any]]) -> tuple[int, int]:
    if not DB_URL:
        raise RuntimeError("DATABASE_URL/FRANKSTEIN_DB_URL nao configurado.")

    inserted = 0
    skipped = 0
    with psycopg.connect(DB_URL, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for event in events:
                cur.execute(
                    INSERT_SQL,
                    (
                        event.get("event_id"),
                        event.get("timestamp"),
                        event.get("processo_id"),
                        event.get("lead_id"),
                        event.get("cliente_id"),
                        event.get("reserva_id"),
                        event.get("corretor_id"),
                        event.get("empreendimento"),
                        event.get("perfil"),
                        event.get("renda_bruta"),
                        event.get("valor_tabela"),
                        event.get("sobrepreco_vila"),
                        event.get("valor_obtido"),
                        event.get("parcela_caixa"),
                        event.get("preco_digitado_corretor"),
                        event.get("preco_base_politica"),
                        event.get("preco_final"),
                        event.get("entrada_liquida"),
                        event.get("valor_parcela_entrada"),
                        event.get("is_pos_chaves"),
                        event.get("status_ia_heuristica"),
                        event.get("bloqueio_critico"),
                        event.get("motivo_auditoria"),
                        event.get("garantidores_necessarios"),
                        event.get("exposicao_risco"),
                        event.get("alerta_preco"),
                        event.get("valor_venda"),
                        event.get("garantido"),
                        event.get("cheque_moradia"),
                        event.get("faltante"),
                        event.get("qtd_problemas_documentais"),
                        event.get("score_risco_regra"),
                        event.get("status_geral_regra"),
                        event.get("decisao_recomendada_regra"),
                        event.get("probabilidade_modelo"),
                        event.get("preco_frankstein"),
                        event.get("confianca_modelo"),
                        event.get("modelo_versao"),
                        event.get("teve_pendencia_cca"),
                        event.get("teve_pendencia_agehab"),
                        event.get("foi_aprovado"),
                        event.get("foi_reprovado"),
                        event.get("virou_condicionado"),
                        event.get("assinou_caixa"),
                        event.get("finalizou"),
                        event.get("tempo_ate_assinatura_horas"),
                        event.get("tempo_total_processo_horas"),
                        event.get("retorno_cca"),
                        event.get("resultado_real"),
                        json.dumps(event.get("input_json"), ensure_ascii=False),
                        json.dumps(event.get("heuristica_json"), ensure_ascii=False),
                        json.dumps(event.get("frankstein_json"), ensure_ascii=False),
                        json.dumps(event.get("features_json"), ensure_ascii=False),
                        event.get("origem"),
                    ),
                )
                if cur.rowcount > 0:
                    inserted += 1
                else:
                    skipped += 1
        conn.commit()
    return inserted, skipped


def main() -> None:
    import app

    app._ensure_frankstein_tables()
    events = _iter_legacy_events()
    inserted, skipped = _insert_legacy_events(events)
    print(
        json.dumps(
            {
                "loaded_candidates": len(events),
                "inserted": inserted,
                "skipped_existing": skipped,
                "sources": [str(path) for path in [RAW_FRANKSTEIN_PATH, LEGACY_YVY_PATH] if path.exists()],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

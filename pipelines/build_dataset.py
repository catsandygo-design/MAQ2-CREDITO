from __future__ import annotations

import json
import os
import uuid
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import pandas as pd
import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RAW_EVENTS_PATH = DATA_DIR / "raw" / "frankstein_events.json"
LEGACY_EVENTS_PATH = DATA_DIR / "yvy_events.json"
OUTPUT_FILE = DATA_DIR / "processed" / "frankstein_dataset.parquet"
FRANKSTEIN_DB_URL = os.getenv("FRANKSTEIN_DB_URL") or os.getenv("YVY_DB_URL") or os.getenv("DATABASE_URL")

JSON_GROUPS = {
    "input_json": "input__",
    "heuristica_json": "heuristica__",
    "frankstein_json": "frankstein__",
    "yvy_json": "frankstein__",
    "features_json": "features__",
    "input": "input__",
    "heuristica": "heuristica__",
    "frankstein": "frankstein__",
    "yvy": "frankstein__",
    "features": "features__",
}


def _load_events_from_file() -> list[dict[str, Any]]:
    source = RAW_EVENTS_PATH if RAW_EVENTS_PATH.exists() else LEGACY_EVENTS_PATH
    if not source.exists():
        return []
    with source.open("r", encoding="utf-8") as fh:
        loaded = json.load(fh)
    return loaded if isinstance(loaded, list) else []


def _load_events_from_db() -> list[dict[str, Any]]:
    if not FRANKSTEIN_DB_URL:
        return []
    with psycopg.connect(FRANKSTEIN_DB_URL, connect_timeout=10, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            try:
                cur.execute('select * from frankstein_events order by "timestamp" asc nulls last, created_at asc')
                rows = cur.fetchall()
            except Exception:
                cur.execute('select * from yvy_events order by "timestamp" asc nulls last, created_at asc')
                rows = cur.fetchall()
    return [dict(row) for row in rows]


def _normalize_json_value(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            loaded = json.loads(value)
        except Exception:
            return {}
        return loaded if isinstance(loaded, dict) else {}
    return {}


def _normalize_scalar_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def flatten_event(event: dict[str, Any]) -> dict[str, Any]:
    row: dict[str, Any] = {}

    for key, value in event.items():
        if key in JSON_GROUPS:
            continue
        row[key] = _normalize_scalar_value(value)

    for group_name, prefix in JSON_GROUPS.items():
        payload = _normalize_json_value(event.get(group_name))
        for key, value in payload.items():
            row[f"{prefix}{key}"] = _normalize_scalar_value(value)

    return row


def main() -> None:
    events = _load_events_from_db() if FRANKSTEIN_DB_URL else []
    if not events:
        events = _load_events_from_file()

    rows = [flatten_event(event) for event in events]
    df = pd.DataFrame(rows)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUTPUT_FILE, index=False)
    print(f"Dataset salvo em: {OUTPUT_FILE} | linhas: {len(df)}")


if __name__ == "__main__":
    main()


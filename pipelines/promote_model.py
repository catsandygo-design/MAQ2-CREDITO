from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURRENT_DIR = ROOT / "data" / "models" / "current"
ARCHIVE_DIR = ROOT / "data" / "models" / "archive"
REGISTRY_DIR = ROOT / "registry"
MODEL_REGISTRY_PATH = REGISTRY_DIR / "model_registry.json"
METRICS_HISTORY_PATH = REGISTRY_DIR / "metrics_history.json"


def _load_json(path: Path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _save_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)


def _read_metrics(model_dir: Path) -> dict:
    return _load_json(model_dir / "metrics.json", {})


def _read_model_info(model_dir: Path) -> dict:
    return _load_json(model_dir / "model_info.json", {})


def _promotable(candidate_metrics: dict, current_metrics: dict, min_auc_delta: float, min_recall: float) -> tuple[bool, str]:
    if not current_metrics:
        return True, "Sem modelo atual ativo."

    candidate_auc = candidate_metrics.get("auc")
    current_auc = current_metrics.get("auc")
    candidate_f1 = candidate_metrics.get("f1")
    current_f1 = current_metrics.get("f1")
    candidate_recall = candidate_metrics.get("recall")

    if candidate_auc is None or current_auc is None:
        return False, "AUC indisponivel para comparacao."
    if candidate_auc < current_auc + min_auc_delta:
        return False, "AUC nao superou o minimo exigido."
    if candidate_f1 is None or current_f1 is None or candidate_f1 < current_f1:
        return False, "F1 piorou em relacao ao modelo atual."
    if candidate_recall is None or candidate_recall < min_recall:
        return False, "Recall abaixo do minimo aceitavel."
    return True, "Criterios de promocao atendidos."


def promote(candidate_dir: Path, min_auc_delta: float, min_recall: float) -> None:
    candidate_metrics = _read_metrics(candidate_dir)
    candidate_info = _read_model_info(candidate_dir)
    current_metrics = _read_metrics(CURRENT_DIR)
    current_info = _read_model_info(CURRENT_DIR)

    ok, reason = _promotable(candidate_metrics, current_metrics, min_auc_delta, min_recall)
    if not ok:
        raise SystemExit(f"Promocao negada: {reason}")

    CURRENT_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    if any(CURRENT_DIR.iterdir()):
        archived_name = current_info.get("version") or datetime.now(timezone.utc).strftime("archive-%Y%m%dT%H%M%SZ")
        archive_path = ARCHIVE_DIR / archived_name
        if archive_path.exists():
            shutil.rmtree(archive_path)
        shutil.copytree(CURRENT_DIR, archive_path)

    for child in list(CURRENT_DIR.iterdir()):
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()

    for source in candidate_dir.iterdir():
        destination = CURRENT_DIR / source.name
        if source.is_dir():
            shutil.copytree(source, destination)
        else:
            shutil.copy2(source, destination)

    registry = _load_json(MODEL_REGISTRY_PATH, [])
    promoted_at = datetime.now(timezone.utc).isoformat()
    registry.append(
        {
            "version": candidate_info.get("version"),
            "target": candidate_info.get("target"),
            "stage": "current",
            "path": str(candidate_dir.relative_to(ROOT)),
            "promoted_at": promoted_at,
            "metrics": candidate_metrics,
        }
    )
    _save_json(MODEL_REGISTRY_PATH, registry)

    history = _load_json(METRICS_HISTORY_PATH, [])
    history.append(
        {
            "version": candidate_info.get("version"),
            "target": candidate_info.get("target"),
            "promoted_at": promoted_at,
            "metrics": candidate_metrics,
            "criteria": {
                "min_auc_delta": min_auc_delta,
                "min_recall": min_recall,
            },
        }
    )
    _save_json(METRICS_HISTORY_PATH, history)

    print(f"Modelo promovido com sucesso: {candidate_info.get('version')}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("candidate_dir")
    parser.add_argument("--min-auc-delta", type=float, default=0.02)
    parser.add_argument("--min-recall", type=float, default=0.65)
    args = parser.parse_args()

    promote(Path(args.candidate_dir), args.min_auc_delta, args.min_recall)


if __name__ == "__main__":
    main()

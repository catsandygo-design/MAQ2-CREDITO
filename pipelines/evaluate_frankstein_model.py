from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATASET = ROOT / "data" / "processed" / "frankstein_dataset.parquet"


def evaluate(model_dir: Path, dataset_path: Path) -> dict:
    model = joblib.load(model_dir / "frankstein_model.pkl")
    with (model_dir / "model_info.json").open("r", encoding="utf-8") as fh:
        model_info = json.load(fh)

    target = model_info["target"]
    feature_columns = model_info["feature_columns"]

    df = pd.read_parquet(dataset_path)
    work_df = df[feature_columns + [target]].dropna(subset=[target]).copy()
    X = work_df[feature_columns]
    y = work_df[target].astype(int)

    y_prob = model.predict_proba(X)[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)

    return {
        "target": target,
        "rows": int(len(work_df)),
        "auc": float(roc_auc_score(y, y_prob)) if y.nunique() > 1 else None,
        "f1": float(f1_score(y, y_pred)),
        "precision": float(precision_score(y, y_pred, zero_division=0)),
        "recall": float(recall_score(y, y_pred, zero_division=0)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("model_dir")
    parser.add_argument("--dataset", default=str(DEFAULT_DATASET))
    args = parser.parse_args()

    metrics = evaluate(Path(args.model_dir), Path(args.dataset))
    print(json.dumps(metrics, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()


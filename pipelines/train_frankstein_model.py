from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "processed" / "frankstein_dataset.parquet"
CANDIDATES_DIR = ROOT / "data" / "models" / "candidates"
REGISTRY_DIR = ROOT / "registry"
MODEL_REGISTRY_PATH = REGISTRY_DIR / "model_registry.json"

NUMERIC_FEATURES = [
    "renda_bruta",
    "valor_tabela",
    "sobrepreco_vila",
    "valor_obtido",
    "parcela_caixa",
    "preco_digitado_corretor",
    "preco_base_politica",
    "preco_final",
    "entrada_liquida",
    "valor_parcela_entrada",
    "exposicao_risco",
    "is_pos_chaves",
    "garantidores_necessarios",
    "faltante",
    "score_risco_regra",
    "qtd_problemas_documentais",
]

CATEGORICAL_FEATURES = [
    "perfil",
    "empreendimento",
    "status_ia_heuristica",
    "status_geral_regra",
    "decisao_recomendada_regra",
    "alerta_preco",
]

BOOLEAN_FEATURES = [
    "bloqueio_critico",
    "doc_rg_cpf_ok",
    "doc_comprovante_residencia_ok",
    "doc_comprovante_renda_ok",
    "doc_fgts_validado",
]


def _append_registry(entry: dict) -> None:
    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    if MODEL_REGISTRY_PATH.exists():
        with MODEL_REGISTRY_PATH.open("r", encoding="utf-8") as fh:
            registry = json.load(fh)
        if not isinstance(registry, list):
            registry = []
    else:
        registry = []
    registry.append(entry)
    with MODEL_REGISTRY_PATH.open("w", encoding="utf-8") as fh:
        json.dump(registry, fh, ensure_ascii=False, indent=2)


def _safe_auc(y_true: pd.Series, y_prob) -> float | None:
    try:
        return float(roc_auc_score(y_true, y_prob))
    except Exception:
        return None


def train(target: str) -> Path:
    df = pd.read_parquet(DATA_FILE)
    if target not in df.columns:
        raise SystemExit(f"Target '{target}' nao encontrado no dataset.")

    available_features = [
        column
        for column in [*NUMERIC_FEATURES, *CATEGORICAL_FEATURES, *BOOLEAN_FEATURES]
        if column in df.columns
    ]
    if not available_features:
        raise SystemExit("Nenhuma feature compativel encontrada no dataset.")

    work_df = df[available_features + [target]].dropna(subset=[target]).copy()
    if work_df.empty:
        raise SystemExit(f"Nenhuma linha com target conhecido para '{target}'.")

    X = work_df[available_features].copy()
    y = work_df[target].astype(int)
    if y.nunique() < 2:
        raise SystemExit(f"Target '{target}' precisa ter pelo menos duas classes.")

    categorical_cols = [column for column in available_features if column in CATEGORICAL_FEATURES + BOOLEAN_FEATURES]
    numeric_cols = [column for column in available_features if column not in categorical_cols]

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model.fit(X_train, y_train)
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    version = f"frankstein-{target}-{run_id}"
    model_dir = CANDIDATES_DIR / version
    model_dir.mkdir(parents=True, exist_ok=True)

    metrics = {
        "target": target,
        "algorithm": "logistic_regression",
        "auc": _safe_auc(y_test, y_prob),
        "f1": float(f1_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "positive_rate_train": float(y_train.mean()),
        "positive_rate_test": float(y_test.mean()),
        "threshold": 0.5,
    }

    model_info = {
        "version": version,
        "target": target,
        "algorithm": "logistic_regression",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "feature_columns": available_features,
        "stage": "candidate",
    }

    joblib.dump(model, model_dir / "frankstein_model.pkl")
    with (model_dir / "metrics.json").open("w", encoding="utf-8") as fh:
        json.dump(metrics, fh, ensure_ascii=False, indent=2)
    with (model_dir / "feature_columns.json").open("w", encoding="utf-8") as fh:
        json.dump(available_features, fh, ensure_ascii=False, indent=2)
    with (model_dir / "model_info.json").open("w", encoding="utf-8") as fh:
        json.dump(model_info, fh, ensure_ascii=False, indent=2)

    _append_registry(
        {
            "version": version,
            "target": target,
            "stage": "candidate",
            "path": str(model_dir.relative_to(ROOT)),
            "created_at": model_info["created_at"],
            "metrics": metrics,
        }
    )

    return model_dir


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", default="foi_aprovado")
    args = parser.parse_args()

    model_dir = train(args.target)
    print(f"Modelo treinado com sucesso em: {model_dir}")


if __name__ == "__main__":
    main()


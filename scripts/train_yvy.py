"""
Treinamento leve do modelo yvy com 500 amostras sintéticas.
- Mantém compatibilidade com endpoint /app/api/yvy/recomendacao (mesmas features).
- Gera yvy_model.json em data/.

Obs.: Como não há ainda rótulos reais de aceitação, usamos regras heurísticas
para criar rótulos sintéticos apenas para bootstrap. Substitua por dados reais
assim que houver feedbacks com aceitou=0/1.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODEL_PATH = DATA_DIR / "yvy_model.json"


def _sigmoid(x: float) -> float:
    try:
        return 1.0 / (1.0 + math.exp(-x))
    except OverflowError:
        return 0.0 if x < 0 else 1.0


def _gen_synthetic(n: int = 500) -> tuple[list[list[float]], list[int]]:
    feats: list[list[float]] = []
    labels: list[int] = []
    for _ in range(n):
        renda = random.uniform(3000, 15000)
        valor_tabela = random.uniform(150_000, 400_000)
        sobrepreco = random.uniform(0, 20_000)
        valor_obtido = valor_tabela * random.uniform(0.55, 1.02)
        parcela_caixa = random.uniform(400, 1600)
        preco_digitado = 0.0
        expo = max(0.0, (valor_tabela - valor_obtido) / max(valor_tabela, 1))
        is_pos = parcela_caixa / renda + expo * 0.12
        # Regras sintéticas de aceitação: baixo risco e IS < 0.35
        aceitou = 1 if (expo < 0.25 and is_pos < 0.35) else 0
        # Ruído para robustez
        if random.random() < 0.1:
            aceitou = 1 - aceitou
        feats.append(
            [
                renda,
                valor_tabela,
                sobrepreco,
                valor_obtido,
                parcela_caixa,
                preco_digitado,
                expo,
                is_pos,
            ]
        )
        labels.append(aceitou)
    return feats, labels


def _normalize(feats: list[list[float]]) -> tuple[list[list[float]], list[float], list[float]]:
    transposed = list(zip(*feats))
    means = [sum(col) / len(col) for col in transposed]
    stds: list[float] = []
    for col, mean in zip(transposed, means):
        var = sum((x - mean) ** 2 for x in col) / len(col)
        std = math.sqrt(var) if var > 0 else 1.0
        stds.append(std)
    norm = []
    for row in feats:
        norm.append([(x - m) / s for x, m, s in zip(row, means, stds)])
    return norm, means, stds


def _train_logistic(X: list[list[float]], y: list[int], lr: float = 0.01, epochs: int = 400) -> tuple[list[float], float]:
    weights = [0.0 for _ in range(len(X[0]))]
    bias = 0.0
    n = len(X)
    for _ in range(epochs):
        grad_w = [0.0 for _ in weights]
        grad_b = 0.0
        for xi, yi in zip(X, y):
            z = bias + sum(w * f for w, f in zip(weights, xi))
            p = _sigmoid(z)
            diff = p - yi
            for j in range(len(weights)):
                grad_w[j] += diff * xi[j]
            grad_b += diff
        # média
        grad_w = [g / n for g in grad_w]
        grad_b /= n
        weights = [w - lr * g for w, g in zip(weights, grad_w)]
        bias -= lr * grad_b
    return weights, bias


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True, parents=True)
    feats, labels = _gen_synthetic(500)
    norm_feats, means, stds = _normalize(feats)
    weights, bias = _train_logistic(norm_feats, labels)
    MODEL_PATH.write_text(
        json.dumps(
            {
                "version": "bootstrap-500-sintetico",
                "weights": weights,
                "bias": bias,
                "means": means,
                "stds": stds,
                "features": [
                    "renda_bruta",
                    "valor_tabela",
                    "sobrepreco_vila",
                    "valor_obtido",
                    "parcela_caixa",
                    "preco_digitado_corretor",
                    "exposicao",
                    "is_pos_chaves",
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Modelo salvo em {MODEL_PATH} (500 sintéticos)")


if __name__ == "__main__":
    main()

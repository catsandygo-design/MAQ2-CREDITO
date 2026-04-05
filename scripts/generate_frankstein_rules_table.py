from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILE = ROOT / "docs" / "regras_credito.json"
OUTPUT_MD = ROOT / "docs" / "frankstein_regras_tabela.md"
OUTPUT_CSV = ROOT / "docs" / "frankstein_regras_tabela.csv"


def is_scalar(value: Any) -> bool:
    return value is None or isinstance(value, (str, int, float, bool))


def is_scalar_list(value: Any) -> bool:
    return isinstance(value, list) and all(is_scalar(item) for item in value)


def is_simple_record(value: Any) -> bool:
    return isinstance(value, dict) and all(is_scalar(item) or is_scalar_list(item) for item in value.values())


def format_scalar(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "sim" if value else "nao"
    return str(value)


def summarize_mapping(mapping: dict[str, Any]) -> str:
    parts: list[str] = []
    for key, value in mapping.items():
        if is_scalar(value):
            parts.append(f"{key}={format_scalar(value)}")
        elif is_scalar_list(value):
            joined = "; ".join(format_scalar(item) for item in value)
            parts.append(f"{key}={joined}")
        else:
            parts.append(f"{key}={json.dumps(value, ensure_ascii=False, separators=(',', ':'))}")
    return " | ".join(parts) if parts else "-"


def pick_item_label(item: dict[str, Any], index: int) -> str:
    for key in (
        "codigo",
        "titulo",
        "target",
        "documento",
        "arquivo",
        "campo",
        "nome",
        "status",
        "condicao",
    ):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return f"[{index}] {value}"
    return f"[{index}] item"


def build_row(section: str, path: list[str], condition: str, details: str) -> dict[str, str]:
    group = " / ".join(path[:-1]) if len(path) > 1 else "-"
    item = path[-1] if path else section
    return {
        "secao": section,
        "grupo": group,
        "item": item,
        "condicao": condition or "-",
        "valor_efeito": details or "-",
    }


def flatten_section(section: str, node: Any, path: list[str] | None = None) -> list[dict[str, str]]:
    path = path or []
    rows: list[dict[str, str]] = []

    if is_scalar(node):
        rows.append(build_row(section, path, "", format_scalar(node)))
        return rows

    if is_scalar_list(node):
        joined = "; ".join(format_scalar(item) for item in node)
        rows.append(build_row(section, path, "", joined))
        return rows

    if isinstance(node, dict):
        if "condicao" in node and isinstance(node["condicao"], str):
            details = summarize_mapping({key: value for key, value in node.items() if key != "condicao"})
            rows.append(build_row(section, path, node["condicao"], details))
            return rows

        if is_simple_record(node):
            rows.append(build_row(section, path, "", summarize_mapping(node)))
            return rows

        for key, value in node.items():
            rows.extend(flatten_section(section, value, [*path, key]))
        return rows

    if isinstance(node, list):
        if all(isinstance(item, dict) for item in node):
            for index, item in enumerate(node, start=1):
                item_path = [*path, pick_item_label(item, index)]
                if "condicao" in item and isinstance(item["condicao"], str):
                    details = summarize_mapping({key: value for key, value in item.items() if key != "condicao"})
                    rows.append(build_row(section, item_path, item["condicao"], details))
                elif is_simple_record(item):
                    rows.append(build_row(section, item_path, "", summarize_mapping(item)))
                else:
                    rows.extend(flatten_section(section, item, item_path))
            return rows

        for index, item in enumerate(node, start=1):
            rows.extend(flatten_section(section, item, [*path, f"[{index}]"]))
        return rows

    rows.append(build_row(section, path, "", json.dumps(node, ensure_ascii=False)))
    return rows


def escape_markdown(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", "<br>")


def render_markdown(rows: list[dict[str, str]], row_counts: Counter[str]) -> str:
    generated_at = datetime.now().astimezone().isoformat()
    lines = [
        "# Tabela de Regras do FRANKSTEIN",
        "",
        f"Gerado automaticamente a partir de `{SOURCE_FILE.as_posix()}` em `{generated_at}`.",
        "",
        "## Resumo por Secao",
        "",
        "| Secao | Linhas |",
        "| --- | ---: |",
    ]

    for section, count in row_counts.items():
        lines.append(f"| {escape_markdown(section)} | {count} |")

    lines.extend(
        [
            "",
            "## Tabela Completa",
            "",
            "| Secao | Grupo | Item | Condicao | Valor / Efeito |",
            "| --- | --- | --- | --- | --- |",
        ]
    )

    for row in rows:
        lines.append(
            "| {secao} | {grupo} | {item} | {condicao} | {valor_efeito} |".format(
                secao=escape_markdown(row["secao"]),
                grupo=escape_markdown(row["grupo"]),
                item=escape_markdown(row["item"]),
                condicao=escape_markdown(row["condicao"]),
                valor_efeito=escape_markdown(row["valor_efeito"]),
            )
        )

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    payload = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    rows: list[dict[str, str]] = []

    for section, value in payload.items():
        rows.extend(flatten_section(section, value, [section]))

    row_counts = Counter(row["secao"] for row in rows)

    OUTPUT_MD.write_text(render_markdown(rows, row_counts), encoding="utf-8")

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=["secao", "grupo", "item", "condicao", "valor_efeito"],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Markdown gerado em: {OUTPUT_MD}")
    print(f"CSV gerado em: {OUTPUT_CSV}")
    print(f"Linhas exportadas: {len(rows)}")


if __name__ == "__main__":
    main()

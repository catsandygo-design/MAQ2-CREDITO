import argparse
import csv
import io
import sys
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app import Cliente, Empreendimento, SessionLocal, _normalize_empreendimento_nome


def _normalize_key(value: Optional[str]) -> str:
    text = _normalize_empreendimento_nome(value)
    text = text.strip().lower()
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _detect_delimiter(sample_text: str) -> str:
    lines = [line for line in sample_text.splitlines() if line.strip()]
    if not lines:
        return ";"
    probe = "\n".join(lines[: min(10, len(lines))])
    try:
        dialect = csv.Sniffer().sniff(probe, delimiters=";,|\t,")
        if dialect and dialect.delimiter:
            return dialect.delimiter
    except csv.Error:
        pass
    header = lines[0]
    delimiters = (";", ",", "\t", "|")
    counts = {d: header.count(d) for d in delimiters}
    best = max(counts, key=counts.get)
    return best if counts[best] > 0 else ";"


def _load_csv_rows(path: Path) -> Tuple[List[str], List[dict]]:
    raw = path.read_bytes()
    text_value = raw.decode("utf-8-sig", errors="replace")
    delimiter = _detect_delimiter(text_value)
    reader = csv.DictReader(io.StringIO(text_value), delimiter=delimiter)
    rows = [dict(row or {}) for row in reader if row is not None]
    headers = list(reader.fieldnames or [])
    return headers, rows


def _find_empreendimento_column(headers: List[str]) -> Optional[str]:
    aliases = {
        "empreendimento",
        "obra",
    }
    for header in headers:
        key = _normalize_key(header)
        if key in aliases:
            return header
    return None


def _extract_csv_empreendimentos(rows: List[dict], col_name: str) -> Tuple[Dict[str, str], List[str]]:
    canonical_by_key: Dict[str, str] = {}
    conflicts: List[str] = []
    for row in rows:
        raw = _normalize_empreendimento_nome(row.get(col_name))
        key = _normalize_key(raw)
        if not key:
            continue
        previous = canonical_by_key.get(key)
        if previous and previous != raw:
            conflicts.append(f"Conflito para '{key}': '{previous}' vs '{raw}' (mantido '{previous}')")
            continue
        canonical_by_key[key] = raw
    return canonical_by_key, conflicts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sincroniza empreendimentos do CSV para o banco (empreendimentos + clientes.obra)."
    )
    parser.add_argument("csv_path", help="Caminho do arquivo CSV com coluna Empreendimento/Obra.")
    parser.add_argument("--dry-run", action="store_true", help="Mostra o que faria sem gravar no banco.")
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    if not csv_path.exists() or not csv_path.is_file():
        print(f"ERRO: arquivo nao encontrado: {csv_path}")
        return 1

    if SessionLocal is None:
        print("ERRO: conexao de banco indisponivel. Configure DATABASE_URL antes de executar.")
        return 1

    headers, rows = _load_csv_rows(csv_path)
    empreendimento_col = _find_empreendimento_column(headers)
    if not empreendimento_col:
        print("ERRO: coluna de empreendimento nao encontrada. Esperado: Empreendimento ou Obra.")
        return 1

    csv_values_by_key, conflicts = _extract_csv_empreendimentos(rows, empreendimento_col)
    if not csv_values_by_key:
        print("ERRO: nenhum empreendimento valido encontrado no CSV.")
        return 1

    db = SessionLocal()
    try:
        empreendimentos = db.query(Empreendimento).all()
        empre_by_key: Dict[str, Empreendimento] = {}
        duplicate_db_keys: List[str] = []

        for item in empreendimentos:
            key = _normalize_key(item.nome)
            if not key:
                continue
            if key in empre_by_key:
                duplicate_db_keys.append(key)
                continue
            empre_by_key[key] = item

        created = 0
        renamed = 0
        reactivated = 0

        for key, csv_name in csv_values_by_key.items():
            current = empre_by_key.get(key)
            if current is None:
                created += 1
                if not args.dry_run:
                    novo = Empreendimento(nome=csv_name, is_active=True)
                    db.add(novo)
                continue

            if current.nome != csv_name:
                renamed += 1
                if not args.dry_run:
                    current.nome = csv_name
            if not current.is_active:
                reactivated += 1
                if not args.dry_run:
                    current.is_active = True

        clientes = db.query(Cliente).all()
        clientes_updated = 0
        for cliente in clientes:
            obra_atual = _normalize_empreendimento_nome(getattr(cliente, "obra", None))
            key = _normalize_key(obra_atual)
            target_name = csv_values_by_key.get(key)
            if not target_name:
                continue
            if obra_atual != target_name:
                clientes_updated += 1
                if not args.dry_run:
                    cliente.obra = target_name

        if not args.dry_run:
            db.commit()

        print("OK")
        print(f"Arquivo origem: {csv_path}")
        print(f"Coluna empreendimento: {empreendimento_col}")
        print(f"Empreendimentos unicos no CSV: {len(csv_values_by_key)}")
        print(f"Criados: {created}")
        print(f"Renomeados: {renamed}")
        print(f"Reativados: {reactivated}")
        print(f"Clientes atualizados (clientes.obra): {clientes_updated}")
        if conflicts:
            print(f"Conflitos no CSV: {len(conflicts)}")
            for msg in conflicts[:10]:
                print(f"- {msg}")
            if len(conflicts) > 10:
                print(f"- ... e mais {len(conflicts) - 10}")
        if duplicate_db_keys:
            print(f"Chaves duplicadas no banco (normalizadas): {len(set(duplicate_db_keys))}")
            for key in sorted(set(duplicate_db_keys))[:10]:
                print(f"- {key}")
            if len(set(duplicate_db_keys)) > 10:
                print(f"- ... e mais {len(set(duplicate_db_keys)) - 10}")

        return 0
    except Exception as exc:
        if not args.dry_run:
            db.rollback()
        print(f"ERRO: falha ao sincronizar empreendimentos: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())

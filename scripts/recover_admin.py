#!/usr/bin/env python
import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

# Permite importar app.py executando o script de dentro de scripts/.
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app import (
    APP_ADMIN_PASSWORD,
    APP_ADMIN_USER,
    META_MENSAL_RUNTIME_KEY,
    ROLE_ADMIN,
    USERS_SEED_MODE_FULL,
    USERS_SEED_MODE_RUNTIME_KEY,
    AppUser,
    Base,
    SessionLocal,
    _normalize_username,
    _password_policy_error,
    _set_runtime_meta,
    _set_user_password,
    engine,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Recupera acesso admin criando/atualizando usuario no banco."
    )
    parser.add_argument(
        "--username",
        default=(APP_ADMIN_USER or "douglasadm"),
        help="Usuario admin para recuperar (default: APP_ADMIN_USER ou douglasadm).",
    )
    parser.add_argument(
        "--password",
        default=(APP_ADMIN_PASSWORD or ""),
        help="Senha do admin. Se omitida, usa APP_ADMIN_PASSWORD.",
    )
    parser.add_argument(
        "--force-change-password",
        action="store_true",
        help="Marca troca obrigatoria de senha no proximo login.",
    )
    parser.add_argument(
        "--keep-only-admin",
        action="store_true",
        help="Remove todos os outros usuarios e deixa apenas o admin informado.",
    )
    parser.add_argument(
        "--allow-weak-password",
        action="store_true",
        help="Permite senha fora da politica minima.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    username = _normalize_username(args.username)
    password = (args.password or "").strip()

    if not username:
        print("ERRO: username invalido.", file=sys.stderr)
        return 1

    if not password:
        print(
            "ERRO: senha vazia. Informe --password ou configure APP_ADMIN_PASSWORD.",
            file=sys.stderr,
        )
        return 1

    policy_error = _password_policy_error(password)
    if policy_error and not args.allow_weak_password:
        print(f"ERRO: senha invalida pela politica: {policy_error}", file=sys.stderr)
        print("Use --allow-weak-password para forcar mesmo assim.", file=sys.stderr)
        return 1

    if SessionLocal is None or engine is None:
        print(
            "ERRO: conexao de banco indisponivel. Configure DATABASE_URL antes de executar.",
            file=sys.stderr,
        )
        return 1

    # Garante a tabela minima de usuarios para recuperacao de acesso.
    Base.metadata.create_all(bind=engine, tables=[AppUser.__table__])

    db = SessionLocal()
    try:
        user = db.query(AppUser).filter(func.lower(AppUser.username) == username).first()
        created = False
        if user is None:
            user = AppUser(
                username=username,
                role=ROLE_ADMIN,
                is_active=True,
                must_change_password=bool(args.force_change_password),
            )
            _set_user_password(user, password, must_change_password=bool(args.force_change_password))
            db.add(user)
            db.flush()
            created = True
        else:
            user.username = username
            user.role = ROLE_ADMIN
            user.is_active = True
            _set_user_password(user, password, must_change_password=bool(args.force_change_password))

        removed = 0
        if args.keep_only_admin:
            removed = int(
                db.query(AppUser)
                .filter(func.lower(AppUser.username) != username)
                .delete(synchronize_session=False)
            )

        # Mantem o runtime em modo full para nao bloquear outros perfis apos restart/sleep.
        _set_runtime_meta(db, USERS_SEED_MODE_RUNTIME_KEY, USERS_SEED_MODE_FULL)
        _set_runtime_meta(db, META_MENSAL_RUNTIME_KEY, "0")

        db.commit()
        print("OK: acesso admin recuperado com sucesso.")
        print(f"  usuario: {username}")
        print(f"  criado: {'sim' if created else 'nao'}")
        print(f"  troca obrigatoria: {'sim' if args.force_change_password else 'nao'}")
        if args.keep_only_admin:
            print(f"  outros usuarios removidos: {removed}")
        return 0
    except SQLAlchemyError as exc:
        db.rollback()
        print(f"ERRO SQL: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

# Backend FastAPI

API para as telas do Sistema Credito Pro, com persistencia no Supabase.

## Rodar localmente

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

No frontend, configure:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Supabase

1. Execute `backend/sql/schema.sql` no SQL Editor do Supabase.
2. Crie um bucket Storage chamado `processos`.
3. Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` e `DATABASE_URL` no `backend/.env`.
4. Reinicie o backend e abra `http://localhost:8000/health/supabase`.

O resultado esperado e:

```json
{
  "ok": true,
  "database": { "ok": true },
  "storage": { "ok": true, "bucket": "processos" }
}
```

Use a service role key somente no backend. Nao exponha essa chave no frontend.
Se o Storage retornar `Invalid API key`, a chave em `SUPABASE_SERVICE_ROLE_KEY` nao e a service role valida do projeto.

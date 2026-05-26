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
3. Preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `backend/.env`.

Use a service role key somente no backend. Nao exponha essa chave no frontend.

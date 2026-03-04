# Migracao para React (inicio)

## Objetivo
Iniciar a migracao incremental do frontend atual (HTML+JS) para React, mantendo API, banco e regras atuais.

## O que ja foi iniciado
- Criado projeto `frontend-react` com Vite + React + TypeScript.
- Implementadas as primeiras rotas React:
  - `/app-react/login`
  - `/app-react/gestor`
- Nova rota React em modo leitura:
  - `/app-react/analista`
- Integracao real com endpoints existentes:
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /auth/me`
  - `GET /app/api/gestor/dashboard`
  - `GET /app/api/processos`
  - `GET /app/api/ccas`
- Backend preparado para servir build React em `/app-react` quando `frontend-react/dist` existir.
- Render blueprint ajustado para tentar build do frontend React durante o deploy quando `npm` estiver disponivel.

## Como executar local
1. Backend:
   - `python -m uvicorn app:app --host 0.0.0.0 --port 10000`
2. Frontend React (dev):
   - `cd frontend-react`
   - `npm install`
   - `npm run dev`
3. Build React para servir pelo FastAPI:
   - `cd frontend-react`
   - `npm run build`
   - acessar: `http://localhost:10000/app-react`

## Regra de migracao
- Nao alterar schema do banco.
- Nao quebrar rotas legadas existentes.
- Migrar tela por tela, validando paridade visual e funcional.

## Proximas telas sugeridas
1. `analista_painel`
2. `analista_acompanhamento`
3. `analista_repasse`
4. `cca_analise`
5. `checklist`


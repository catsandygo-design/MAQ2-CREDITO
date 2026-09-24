# Sistema Credito Pro - Documentacao do Projeto

Atualizado em: 27/05/2026

## 1. Visao geral

O sistema e um fluxo operacional de credito/documentacao para acompanhar clientes entre Corretor, Gestor, Analista e CCA.

Hoje o projeto roda com:

- Frontend: Next.js App Router.
- Backend: FastAPI.
- Banco atual de teste: Supabase Postgres.
- Arquivos atuais de teste: Supabase Storage, com fallback local em `backend/uploads`.
- Modelo alvo de producao: Azure DB abastecendo o backend.

Decisao de arquitetura atual:

- As telas nao devem depender diretamente do banco final.
- O frontend conversa com o backend por API.
- Atualizacao por evento passa pelo backend em `/api/processos/events`.
- Quando migrar para Azure, a troca deve ficar concentrada no backend.
- As telemetrias principais agora usam dados do backend; sem fila operacional mockada.

## 2. Estrutura principal

```txt
src/
  app/
    analista/
    cca/
    corretor/
    gestor/
    painel/checklist-documentos/
    api/processos/
  components/
    ChecklistDocumentosForm.tsx
  lib/
    api/
    supabase/

backend/
  app/
    main.py
    db.py
    models.py
    routers/processos.py
    routers/contexto.py
```

## 3. Telas

| Tela | Rota | Funcao |
|---|---|---|
| Login | `/login` | Entrada do sistema |
| Corretor - Telemetria | `/corretor` | Acompanhamento do corretor, cards e alertas |
| Corretor - Checklist | `/painel/checklist-documentos` | Checklist documental usado pelo corretor |
| Gestor - Telemetria | `/gestor/telemetria` | Visao do gestor com carteira, cards e timeline |
| Gestor - Checklist | `/gestor/checklist` | Mesmo checklist documental adaptado ao gestor |
| Analista - Painel | `/analista` | Fila do analista, alertas, metricas e abertura de checklist |
| Analista - Checklist | `/analista/checklist` | Analise documental, status Caixa/Agehab, pendencias e observacao |
| CCA - Painel | `/cca/acompanhamento` | Fila CCA, alertas, resumo operacional |
| CCA - Checklist | `/cca/checklist` | Validacao/operacao do CCA e download do PDF unico |

Observacao: as filas de Corretor, Gestor, Analista e CCA foram ajustadas para usar dados vindos da API. Quando nao houver dados, deve aparecer estado vazio/lista vazia, nao cliente fake.

## 4. Fluxo de negocio implementado

1. Cliente aparece para Corretor e Gestor.
2. Corretor ou Gestor salva o checklist.
3. Ao salvar, o processo e marcado como `encaminhado_analista = true`.
4. Processo passa a aparecer para Analista.
5. Analista altera status de documentos, Caixa e Agehab.
6. Pendencias registradas pelo Analista aparecem para Corretor/Gestor e alimentam Card 1.
7. Observacao do Analista aparece no proprio Analista e tambem no Card 1 do CCA quando o cliente ja esta na base do CCA.
8. Quando Caixa chega em `envio_conformidade`, o processo passa para CCA.
9. CCA baixa documentos em PDF unico.

## 4.1 SLA e retrabalho

- Existe apenas um SLA visual: `SLA Cliente`.
- O SLA inicia quando o cadastro entra no fluxo do corretor/checklist.
- O SLA para quando o processo chega em `envio_conformidade`.
- Foram removidas da telemetria as leituras separadas `Comercial`, `Credito` e `SLA CCA`.
- O backend registra eventos em `log_eventos` para status Caixa/Agehab, documentos, pendencias e conformidade.
- O endpoint `/api/processos/diagnosticos/gargalos` calcula lead time, retrabalho e diagnostico.
- Cards de SLA/retrabalho agora consomem metricas reais do backend.
- Eventos antigos podem nao aparecer no diagnostico sem backfill historico.

## 5. APIs consumidas pelo frontend

O frontend usa um proxy Next em `src/app/api/processos/**`, que repassa para o FastAPI via `NEXT_PUBLIC_API_BASE_URL`.

### Processos

| Metodo | Endpoint | Uso |
|---|---|---|
| `GET` | `/api/processos` | Lista processos gerais |
| `GET` | `/api/processos?destino=analista` | Lista processos enviados ao analista |
| `GET` | `/api/processos?destino=cca` | Lista processos enviados para conformidade/CCA |
| `GET` | `/api/processos/{reserva}` | Busca processo completo |
| `PUT` | `/api/processos/{reserva}` | Atualiza cliente, status Caixa/Agehab, CCA vinculado, observacao |

### Documentos

| Metodo | Endpoint | Uso |
|---|---|---|
| `PUT` | `/api/processos/{reserva}/documentos/{documento_key}` | Atualiza status documental |
| `PUT` | `/api/processos/{reserva}/documentos/{documento_key}/pendencia` | Salva pendencia, descricao e prazo |
| `PUT` | `/api/processos/{reserva}/relacionamento/{relacionamento_key}` | Atualiza status de relacionamento |

### Uploads

| Metodo | Endpoint | Uso |
|---|---|---|
| `GET` | `/api/processos/{reserva}/uploads` | Lista uploads |
| `GET` | `/api/processos/{reserva}/uploads?merge=1` | Baixa PDF unico consolidado |
| `POST` | `/api/processos/{reserva}/uploads` | Envia documento |
| `DELETE` | `/api/processos/{reserva}/uploads?grupo=caixa` | Remove uploads do grupo Caixa |
| `GET` | `/api/processos/{reserva}/uploads/{storage_name}` | Abre arquivo enviado |

### SLA e eventos

| Metodo | Endpoint | Uso |
|---|---|---|
| `POST` | `/api/processos/{reserva}/sla/start` | Inicia SLA |
| `POST` | `/api/processos/{reserva}/sla/stop` | Para SLA |
| `GET` | `/api/processos/events` | SSE para avisar telas que houve mudanca |
| `GET` | `/api/processos/events?reserva={reserva}` | SSE filtrado por reserva |

### Diagnostico de gargalos

| Metodo | Endpoint | Uso |
|---|---|---|
| `GET` | `/api/processos/diagnosticos/gargalos` | Calcula lead time, retrabalho e diagnostico por cliente |

Retorno do diagnostico:

```json
{
  "id_cliente": "458713",
  "id_corretor": "123",
  "Lead_Time_Total": 8.25,
  "Qtd_Retrabalho": 1,
  "Diagnostico": "Problema Documental"
}
```

## 6. Banco de dados atual

Banco atual: Supabase Postgres apenas para teste.

Tabelas criadas pelo backend:

| Tabela | Funcao |
|---|---|
| `fastapi_processos` | Cadastro/processo principal |
| `fastapi_documentos_status` | Status por documento |
| `fastapi_relacionamento_status` | Status de relacionamento bancario |
| `fastapi_documentos_pendencias` | Pendencias, descricao, prazo, origem |
| `fastapi_uploads` | Metadados dos arquivos enviados |
| `fastapi_sla_processos` | Inicio/fim do SLA |
| `fastapi_contextos` | Registro simples de contexto |
| log_eventos | Log para diagnostico de gargalos |

Eventos registrados em log_eventos:

- Entrada como Reserva.
- Mudanca de status Caixa.
- Mudanca de status Agehab.
- Mudanca de status documental.
- Criacao/atualizacao de pendencia documental.
- Envio para conformidade.

Campos importantes em `fastapi_processos`:

- `reserva`
- `cliente`
- `caixa_status`
- `agehab_status`
- `produto`
- `sinal`
- `fiador`
- `corretor`
- `empreendimento`
- `cca_vinculado`
- `observacao_analista`
- `encaminhado_analista`
- `created_at`
- `updated_at`

## 7. Arquivos/documentos

Hoje:

- Primeiro tenta Supabase Storage.
- Se falhar, salva localmente em `backend/uploads/processos`.
- O CCA pode baixar um PDF unico com `?merge=1`.
- A uniao dos PDFs usa `pypdf`.

Ponto de atencao:

- Para producao em Azure, substituir Storage por Azure Blob Storage.
- Manter o mesmo contrato de API para nao alterar as telas.

## 8. Atualizacao por eventos

Foi removida a dependencia direta de Supabase Realtime no frontend.

Modelo atual:

```txt
Tela -> EventSource -> /api/processos/events -> FastAPI -> Banco
```

Comportamento:

- Checklist carrega do banco ao abrir e ao focar a janela, mantendo estabilidade do formulario atual.
- Paineis recebem aviso de mudanca e podem mostrar "Atualizacao disponivel".
- Evita polling pesado e reduz lag.

Implementacao atual:

- Front: `src/lib/api/events.ts`
- Backend: `GET /api/processos/events`

Observacao:

- Hoje o SSE faz verificacao leve por assinatura/timestamp.
- Em Azure, o ideal e usar Change Tracking, CDC, fila/event grid ou Azure SignalR/Web PubSub se precisar escala maior.

## 9. Variaveis de ambiente

Frontend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Backend:

```env
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=processos
CORS_ORIGINS=http://localhost:3000
```

Observacao:

- Supabase esta sendo usado como ambiente de teste.
- Para Azure, `DATABASE_URL` deve apontar para o banco Azure ou a camada de conexao deve ser trocada em `backend/app/db.py`.

## 10. Pendencias tecnicas

1. Migrar banco de teste Supabase para Azure DB.
2. Definir se Azure sera SQL Server, PostgreSQL ou outro servico.
3. Migrar arquivos para Azure Blob Storage.
4. Trocar `backend/app/db.py` para driver/conexao definitiva do Azure.
5. Criar estrategia real de eventos:
   - opcao simples: SSE atual com consulta por timestamp;
   - opcao melhor para escala: Azure SignalR/Web PubSub + fila/evento;
   - opcao banco: Change Tracking/CDC.
6. Remover variaveis Supabase quando Azure estiver definitivo.
7. Criar migrations versionadas em vez de `init_db` criar tudo direto.
8. Criar testes automatizados para:
   - fluxo Corretor -> Analista -> CCA;
   - status documental;
   - pendencias;
   - merge de PDF;
   - diagnostico de gargalos.
9. Revisar autenticacao e permissoes por perfil.
10. Remover arquivos antigos/local uploads antes de deploy.
11. Criar backfill opcional de `log_eventos` para diagnostico historico.
12. Padronizar todos os arquivos antigos em UTF-8 e revisar labels corrompidos.
13. Criar estados vazios padronizados para telas sem dados.

## 11. Comandos uteis

Frontend:

```powershell
npm run dev
```

Backend:

```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Type-check:

```powershell
npm run type-check
```

Health backend:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
```

## 12. Estado atual resumido

- Backend FastAPI criado e integrado.
- Front fala com backend por proxy.
- Supabase funciona como banco/storage de teste.
- Fluxo documental principal esta integrado entre Corretor, Gestor, Analista e CCA.
- Eventos estao centralizados no backend.
- Diagnostico de gargalos foi criado sobre a tabela log_eventos.
- Telemetrias principais usam dados reais da API, sem fila mockada.
- SLA visual foi simplificado para SLA Cliente.
- Cards de SLA/retrabalho consomem metricas calculadas pelo backend.
- Proxima etapa estrutural: migrar banco e arquivos para Azure mantendo os contratos de API.

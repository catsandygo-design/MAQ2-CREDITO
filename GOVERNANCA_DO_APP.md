# Governanca do App MAQ2 Credito

Este documento define as regras de manutencao, evolucao e integracao do sistema MAQ2 Credito.

## Objetivo

Garantir que o app evolua sem quebrar layout, fluxo operacional, integracao com backend FastAPI/Azure ou deploy Vercel.

## Principios Obrigatorios

1. Congelamento visual nas telas operacionais.
2. Mudancas de layout devem ser tratadas como projeto separado.
3. Toda persistencia deve passar pelo proxy central `src/lib/api/proxy.ts`.
4. Nenhuma tela deve usar `localStorage` para regra de negocio.
5. Nenhuma tela deve usar `fetch` direto, exceto o proxy.
6. Checklist e dashboard devem manter links claros entre processo, reserva e perfil.
7. Alteracoes devem ser pequenas, rastreaveis e revisaveis.

## Areas do Sistema

### Analista

Tela:

`src/app/analista/page.tsx`

Checklist:

`src/app/analista/checklist/page.tsx`

Responsabilidade:

- Analise documental.
- Status Caixa/Agehab.
- Pendencias.
- Retorno operacional.

### CCA

Tela:

`src/app/cca/acompanhamento/page.tsx`

Checklist:

`src/app/cca/checklist/page.tsx`

Responsabilidade:

- Acompanhamento documental CCA.
- Upload de formularios.
- Fluxo Caixa/Agehab do CCA.

### Gestor

Tela:

`src/app/gestor/telemetria/page.tsx`

Checklist:

`src/app/gestor/checklist/page.tsx`

Responsabilidade:

- Visao executiva.
- Produtividade.
- Telemetria.
- Acompanhamento de carteira.

### Corretor

Tela:

`src/app/painel/acompanhamento/page.tsx`

Checklist:

`src/app/painel/checklist-documentos/page.tsx`

Responsabilidade:

- Fluxo do corretor.
- Envio inicial de documentos.
- Compatibilidade com checklist legado.

## Regras de Frontend

### Proibido

- Alterar JSX visual sem demanda explicita.
- Trocar classes CSS existentes sem aprovacao.
- Mudar ordem de cards.
- Mudar fonte, cor, sombra, borda, espacamento ou hierarquia visual sem tarefa especifica.
- Usar `localStorage`.
- Usar `dangerouslySetInnerHTML`.
- Usar `fetch` diretamente nas telas.
- Criar nova rota sem documentar.

### Permitido

- Alterar funcoes logicas.
- Adicionar handlers fora do JSX.
- Substituir persistencia por `apiClient`.
- Adicionar tipos TypeScript.
- Criar documentacao.
- Corrigir links quebrados.
- Criar endpoints esperados na documentacao.

## Proxy de API

Arquivo oficial:

`src/lib/api/proxy.ts`

Uso obrigatorio:

```ts
import { apiClient } from '@/lib/api/proxy';
```

Metodos permitidos:

```ts
apiClient.get<T>(path)
apiClient.post<T>(path, body)
apiClient.put<T>(path, body)
apiClient.delete<T>(path)
```

Base URL:

```env
NEXT_PUBLIC_API_BASE_URL=https://sua-api.azurewebsites.net
```

## Contrato Backend

Documento oficial:

`DOCUMENTACAO_BACKEND_FASTAPI.md`

Toda mudanca em endpoint deve atualizar esse documento.

Endpoints principais:

```txt
GET /api/processos/{reserva}
PUT /api/processos/{reserva}
PUT /api/processos/{reserva}/documentos/{documento_key}
PUT /api/processos/{reserva}/relacionamento/{relacionamento_key}
POST /api/processos/{reserva}/uploads
DELETE /api/processos/{reserva}/uploads?grupo=caixa
POST /api/contexto
```

## Padrao de Branch

Branches de feature:

```txt
feature/nome-curto-da-mudanca
```

Branches de correcao:

```txt
fix/nome-curto-do-bug
```

Branches de rollback:

```txt
rollback/data-motivo
```

## Padrao de Commit

Usar mensagens claras:

```txt
feat: adiciona integracao do checklist com proxy
fix: remove localStorage do fluxo CCA
docs: cria contrato FastAPI
style: ajusta card SLA do analista
refactor: centraliza persistencia no apiClient
```

## Pull Request

Todo PR deve informar:

```txt
Resumo:
Telas afetadas:
Arquivos alterados:
Mudanca visual: sim/nao
Endpoints afetados:
Riscos:
Como validar:
```

Se `Mudanca visual: sim`, o PR deve ter aprovacao explicita do responsavel do produto.

## Checklist de Revisao

Antes de aprovar:

- Nao existe `localStorage` novo.
- Nao existe `dangerouslySetInnerHTML` novo.
- Nao existe `fetch(` fora de `src/lib/api/proxy.ts`.
- Links entre dashboard e checklist funcionam.
- Nenhum card mudou de lugar sem aprovacao.
- Nenhuma classe visual foi removida sem aprovacao.
- TypeScript compila.
- Build Vercel passa.

Comandos recomendados:

```bash
npm run type-check
npm run build
```

## Governanca Visual

O CSS global e tratado como area sensivel.

Arquivo:

`src/app/globals.css`

Regras:

- Alterar apenas o necessario.
- Evitar `!important`.
- Nao criar regra universal que sobrescreva cards sem testar todas as telas.
- Preferir seletores por `data-layout-version` para ajustes especificos.
- Toda mudanca visual deve ser validada nas telas Analista, CCA, Gestor e Corretor.

## Governanca de Dados

Estado local React pode existir para exibicao e interacao imediata.

Persistencia oficial:

- FastAPI.
- Banco gerenciado no Azure.
- Azure Blob Storage para arquivos.

O frontend nao deve ser fonte permanente de verdade.

## Governanca de Upload

Fluxo atual:

```txt
Frontend -> apiClient.post -> FastAPI -> Azure Blob Storage
```

O backend deve retornar:

```json
{
  "ok": true,
  "key": "caixa.damp",
  "name": "arquivo.pdf",
  "url": "https://..."
}
```

## Governanca de Ambiente

Ambientes:

```txt
local
preview
production
```

Variaveis obrigatorias:

```env
NEXT_PUBLIC_API_BASE_URL=
```

Recomendado no backend:

```env
DATABASE_URL=
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=
APPLICATIONINSIGHTS_CONNECTION_STRING=
```

## Deploy

Frontend:

- Vercel.
- Preview por branch.
- Producao pela branch principal.

Backend:

- Azure App Service ou Azure Container Apps.
- Logs no Application Insights.
- Storage no Azure Blob.

## Observabilidade

Monitorar:

- Erros 4xx/5xx da API.
- Tempo de resposta de `/api/processos/{reserva}`.
- Falhas de upload.
- Falhas de salvamento de status.
- Deploys com erro na Vercel.

## Politica de Rollback

Quando fazer rollback:

- Tela operacional quebrada.
- Build de producao falhou.
- API indisponivel sem fallback aceitavel.
- Upload bloqueado.

Procedimento:

1. Identificar commit causador.
2. Criar branch `rollback/data-motivo`.
3. Reverter somente a mudanca causadora.
4. Validar build.
5. Publicar hotfix.

## Responsabilidades

Frontend:

- Integracao via proxy.
- Preservacao visual.
- Estados de tela.
- Navegacao.

Backend:

- Persistencia.
- Validacao.
- Normalizacao de status.
- Upload e Blob Storage.
- Auditoria.

DevOps:

- Variaveis de ambiente.
- Deploy.
- Logs.
- Seguranca.

Produto/Operacao:

- Aprovar mudancas visuais.
- Validar fluxo real.
- Definir regras de negocio.

## Definicao de Pronto

Uma mudanca so esta pronta quando:

- O codigo compila.
- A tela abre.
- O fluxo principal funciona.
- O contrato backend esta atualizado.
- Nao ha regressao visual nao autorizada.
- O PR documenta riscos e validacao.


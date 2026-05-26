# MAQ2-CREDITO - Documentacao Profissional do Frontend

Atualizado em: 2026-05-21

## 1. Visao geral

O MAQ2-CREDITO e uma aplicacao web operacional para acompanhamento de credito imobiliario, com foco em fluxo documental entre perfis:

- Corretor
- Analista
- CCA
- Gestor

Objetivo principal:

- organizar checklists de documentos;
- controlar pendencias entre setores;
- acompanhar SLA e retrabalho;
- fornecer trilha operacional para auditoria e BI.

## 2. Para que a aplicacao serve

### 2.1 Corretor

- preencher dados do proponente;
- enviar documentos;
- acompanhar status de analise.

### 2.2 Analista

- receber documentos enviados;
- revisar por checklist;
- aprovar ou pendenciar por documento;
- registrar prazo e observacao da pendencia.

### 2.3 CCA

- validar conformidade documental;
- pendenciar ou avançar status operacional;
- acompanhar etapa de formularios.

### 2.4 Gestor

- monitorar carteira consolidada;
- acompanhar produtividade, SLA e fila viva;
- atuar em pendencias e governanca.

## 3. Arquitetura do frontend

Stack principal:

- Next.js App Router
- React + TypeScript
- CSS global customizado (`src/app/globals.css`)

Organizacao atual relevante:

- `src/app/*`: telas por rota/perfil
- `src/domain/checklist/contracts.ts`: contrato compartilhado de checklist
- `src/lib/governanca-pendencias.ts`: regras de governanca e payload estruturado
- `src/lib/api/proxy.ts`: cliente HTTP para backend

## 4. Governanca operacional implementada

### 4.1 Cadeia oficial de comunicacao

- `cca -> analista`
- `analista -> corretor | gestor | cca`
- `gestor -> analista | corretor`
- `corretor -> analista | gestor`

### 4.2 Regras criticas

1. Ninguem pode pendenciar para si mesmo.
2. Pendencia deve carregar contexto minimo de processo.
3. Pendencia deve nascer com historico versionado (evento `criada`).

Arquivo base:

- `src/lib/governanca-pendencias.ts`

## 5. Contrato compartilhado de checklist

Arquivo:

- `src/domain/checklist/contracts.ts`

Itens padronizados:

- tipos de status de documento;
- tipos de status de relacionamento;
- estrutura de pendencia por documento;
- secoes e documentos do checklist;
- perguntas de relacionamento.

Objetivo:

- eliminar duplicacao entre checklists de setores;
- manter consistencia de nomenclatura para BI;
- reduzir risco de divergencia frontend/backend.

## 6. APIs consumidas pelo frontend

Observacao: os endpoints abaixo representam o contrato de consumo atual do frontend. O backend deve validar governanca e ownership no servidor.

### 6.1 Processo e status

- `GET /api/processos/:reserva`
- `PUT /api/processos/:reserva`
- `PUT /api/processos/:reserva/documentos/:key`
- `PUT /api/processos/:reserva/relacionamento/:key`

### 6.2 Pendencias

- `PUT /api/processos/:reserva/documentos/:key/pendencia`

Payload esperado inclui:

- cliente
- reserva
- cadastro
- corretor
- origem
- destino
- documento_id
- documento_nome
- mensagem
- prazo
- tipo_pendencia
- historico

### 6.3 Uploads de documentos

- `POST /api/processos/:reserva/uploads` (multipart/form-data)
- `GET /api/processos/:reserva/uploads?grupo=caixa`
- `DELETE /api/processos/:reserva/uploads?grupo=caixa`

## 7. Fluxo por setor (resumo funcional)

### 7.1 Corretor / Gestor

- origem principal do envio de documentos;
- checklist com status por item;
- bloqueio de reenvio conforme status operacional.

### 7.2 Analista / CCA

- recepcao e analise de documentos;
- pendencia estruturada por documento (nao texto solto);
- controle de prazo e observacao por item.

## 8. Seguranca aplicada no frontend (escopo atual)

1. Reducao de PII em query string (preferencia por `reserva`).
2. Upload migrado para `FormData` (remove base64 em payload JSON).
3. Download com validacao de URL segura no checklist.
4. Validacao de governanca no cliente para evitar erro operacional.

Importante:

- autenticacao/autorizacao e validacao final permanecem responsabilidade do backend.

## 9. Rotas principais da aplicacao

- `/painel/acompanhamento`
- `/analista`
- `/analista/checklist`
- `/cca/acompanhamento`
- `/cca/checklist`
- `/gestor/telemetria`
- `/gestor/checklist`
- `/corretor`

## 10. Requisitos para backend (integracao limpa)

1. Ser fonte de verdade para governanca.
2. Validar `origem/destino` e bloquear auto-pendencia.
3. Persistir historico append-only (`criada`, `respondida`, `resolvida`, `reaberta`).
4. Responder com contrato consistente para todas as telas.
5. Fornecer links de download assinados/seguros.

## 11. Como apresentar o frontend

Mensagem curta recomendada:

"O frontend foi padronizado por contrato unico de checklist, com governanca operacional por perfil e pendencia estruturada por documento. Mantivemos o visual e evoluimos a base tecnica para reduzir duplicacao, melhorar seguranca de integracao e preparar auditoria/SLA de ponta a ponta."

## 12. Limites conhecidos

- sem autenticacao final integrada neste pacote;
- algumas validacoes estao duplicadas (cliente + servidor) por seguranca defensiva;
- backend ainda precisa consolidar persistencia imutavel de eventos.

# Comparativo com Projetos Abertos do GitHub - Upgrades Sugeridos para o SioCred

## 1. Objetivo

Comparar o SioCred com projetos abertos ja construidos no GitHub e extrair sugestoes praticas de upgrade, sem copiar codigo e sem alterar o sistema atual.

Projetos usados como referencia:

- DigiFi Loan Origination System: https://github.com/getsan4u/loan-origination-system
- Apache Fineract: https://github.com/apache/fineract
- Apache Fineract Credit Scorecard: https://github.com/apache/fineract-credit-scorecard
- GoRules Zen Engine: https://github.com/gorules/zen
- ezrules: https://github.com/sofeikov/ezrules
- SpiffWorkflow: https://github.com/sartography/SpiffWorkflow
- Domino Workflows: https://github.com/Tauffer-Consulting/domino
- Conductor OSS: https://github.com/conductor-oss/conductor

## 2. O Que o SioCred Ja Tem de Forte

O SioCred ja esta acima de um prototipo simples em varios pontos:

- Backend FastAPI com muitos endpoints e `response_model`.
- SQLAlchemy com entidades de cliente, processo, documento, historico, usuarios, sessoes, empreendimentos e eventos.
- Motor FOGUETINHO operacional separado em `frankstein_operacional.py`.
- Motor de simulacao separado em `simulacao_engine.py`.
- Tabela/event store para `frankstein_events`.
- Pipeline de dados e treino em `pipelines/`.
- Testes para simulacao, seguranca e FOGUETINHO.
- Frontend React iniciado em `frontend-react`.
- Documentacao de regras em JSON, CSV e Markdown.
- Importacao de planilha.
- Dashboard, acompanhamento, repasse, CCA, arquivados e admin.

O problema principal nao e ausencia de funcionalidades. O problema e que parte da inteligencia esta espalhada em telas, backend, documentos e scripts.

## 3. Comparacao por Tema

### 3.1 Loan Origination System

Referencia:

- DigiFi LOS apresenta uma plataforma modular de origination com arquitetura aberta por API.
- Apache Fineract e uma base robusta para lending/core banking, com APIs, eventos externos, Docker/Kubernetes e OpenAPI/Swagger.

Comparacao com SioCred:

- O SioCred ja cobre etapas de credito, documental, repasse e gestor.
- Falta transformar isso em um "LOS interno" com dominio mais limpo: cliente, processo, dossie, decisao, evento, regra e SLA.
- O `app.py` esta grande demais para o tamanho atual do produto.

Upgrade sugerido:

1. Separar `app.py` em modulos:
   - `routers/auth.py`
   - `routers/processos.py`
   - `routers/documentos.py`
   - `routers/frankstein.py`
   - `routers/gestor.py`
   - `routers/admin.py`
   - `services/workflow_service.py`
   - `services/frankstein_service.py`
   - `services/sla_service.py`
   - `models/`
   - `schemas/`

2. Criar OpenAPI mais governado:
   - tags por area;
   - descricoes dos endpoints principais;
   - exemplos de payload;
   - contrato estavel para o React.

3. Criar um "ProcessoFull" como contrato central:
   - dados do cliente;
   - dados financeiros;
   - documentos;
   - status;
   - eventos;
   - bloqueios;
   - recomendacoes do FOGUETINHO.

## 4. Motor de Regras

Referencias:

- GoRules Zen usa decision tables em JSON, com inputs, outputs e hit policy.
- ezrules traz gestao de regras, permissoes, dashboard, auditoria e backtesting.
- SpiffWorkflow usa BPMN/DMN para modelar processos e decisoes.

Comparacao com SioCred:

- O SioCred ja tem regras documentadas em `docs/regras_credito.json`.
- Tambem tem regras implementadas diretamente em Python e JavaScript.
- Falta um runtime unico e versionado de regras.

Upgrade sugerido:

1. Criar tabela `frankstein_rules`:
   - `id`
   - `codigo`
   - `nome`
   - `categoria`
   - `versao`
   - `status`
   - `severidade`
   - `autonomia`
   - `condicao_json`
   - `acao_json`
   - `mensagem`
   - `created_by`
   - `approved_by`
   - `created_at`
   - `updated_at`

2. Criar endpoint:
   - `POST /app/api/frankstein/evaluate-processo/{processo_id}`

3. Retorno esperado:
   - regras disparadas;
   - regras nao disparadas;
   - bloqueios;
   - atencoes;
   - recomendacao;
   - nivel de autonomia;
   - explicacao.

4. Criar backtesting:
   - rodar regras novas contra processos antigos;
   - medir quantos seriam bloqueados;
   - medir quantos gerariam falso alerta;
   - aprovar regra apenas depois de simular impacto.

## 5. Workflow e Orquestracao

Referencias:

- Domino usa React + FastAPI e gerencia workflows com interface visual.
- SpiffWorkflow permite modelar processos com BPMN.
- Conductor separa orquestracao declarativa da logica de negocio, com execucao observavel e versionavel.

Comparacao com SioCred:

- O SioCred ja tem estagios, SLA, owner, eventos e repasse.
- Mas o workflow ainda parece estar muito codificado diretamente nas funcoes do backend.

Upgrade sugerido:

1. Criar um `workflow_service.py` com funcoes puras:
   - `can_transition(processo, target_status)`
   - `apply_transition(processo, target_status, actor)`
   - `derive_owner(processo, trigger)`
   - `derive_repasse_stage(processo)`

2. Criar uma tabela de transicoes:
   - origem;
   - destino;
   - perfil permitido;
   - regra obrigatoria;
   - evento gerado;
   - reversivel ou nao.

3. Criar visualizacao de timeline:
   - evento;
   - usuario;
   - antes/depois;
   - motivo;
   - regra disparada.

4. Evitar trazer um orquestrador pesado no curto prazo.
   - Conductor/Cadence sao fortes, mas provavelmente grandes demais agora.
   - Primeiro modularizar o workflow interno.

## 6. Credit Scorecard e Aprendizado

Referencia:

- Fineract Credit Scorecard trata scoring como modulo separado, com API REST, fontes de dados distintas e opcoes de modelos estatisticos/ML.

Comparacao com SioCred:

- O SioCred ja tem `frankstein_events`, features, pipelines, treino e avaliacao.
- O proprio documento atual reconhece que o modelo ainda nasce de bootstrap/sintetico e precisa de feedback real.

Upgrade sugerido:

1. Separar claramente:
   - regra deterministica;
   - score operacional;
   - modelo preditivo;
   - decisao humana.

2. Criar `model_registry` operacional:
   - modelo;
   - alvo;
   - features;
   - periodo de treino;
   - metricas;
   - status: candidate, shadow, active, retired.

3. Criar modo shadow:
   - o modelo prediz;
   - nao decide;
   - compara com resultado real.

4. So promover modelo quando:
   - melhora recall de pendencia;
   - nao aumenta falso bloqueio demais;
   - tem explicabilidade aceitavel;
   - gestor aprova.

## 7. UI e Experiencia

Referencias:

- DigiFi valoriza configurabilidade por UI.
- Domino usa React para criar, editar e monitorar workflows.
- GoRules facilita decisao por interface parecida com planilha/tabela.

Comparacao com SioCred:

- O SioCred tem boa identidade visual, mas muitas telas.
- O React esta iniciado, mas ainda convive com bastante HTML legado.

Upgrade sugerido:

1. Criar um Design System minimo:
   - `Button`
   - `StatusPill`
   - `KpiCard`
   - `ProcessCard`
   - `FilterBar`
   - `RuleHitList`
   - `Timeline`
   - `FoguetinhoPanel`

2. Migrar por superficie, nao por arquivo:
   - Central Operacional;
   - Analise do Cliente;
   - Dashboard Executivo;
   - Fila Tecnica;
   - Admin/Regras.

3. Criar tela "Motor de Regras":
   - listar regras;
   - filtrar por categoria;
   - simular em processo;
   - ver impacto historico;
   - aprovar/desativar.

## 8. Qualidade, Deploy e Operacao

Referencias:

- Fineract e Fineract Credit Scorecard tem Docker/Docker Compose e documentacao de execucao.
- Domino usa Docker Compose para desenvolvimento e recomenda Kubernetes para producao.
- ezrules destaca auditoria, permissao e backtesting.

Comparacao com SioCred:

- O SioCred tem `render.yaml`, testes e requirements.
- Nao apareceu Docker Compose local padronizado para banco + backend + frontend.
- O `app.py` grande aumenta risco de regressao.

Upgrade sugerido:

1. Criar `docker-compose.dev.yml`:
   - Postgres;
   - backend;
   - frontend React;
   - volume de dados local.

2. Adicionar ferramentas de qualidade:
   - `ruff`;
   - `mypy` ou `pyright` gradual;
   - coverage dos testes;
   - lint React obrigatorio no CI.

3. Criar testes por dominio:
   - workflow;
   - regras FOGUETINHO;
   - documentos;
   - importacao;
   - permissoes por perfil.

4. Criar migracoes formais:
   - hoje ha bastante `ALTER TABLE IF NOT EXISTS` runtime;
   - isso e pratico, mas com crescimento o ideal e usar Alembic.

## 9. Upgrades Prioritarios

### Prioridade 1 - Baixo risco, alto ganho

- Modularizar `frankstein_operacional.py` e extrair avaliacao de regras para servico.
- Criar matriz executavel de regras.
- Criar tela ou endpoint de explicacao do FOGUETINHO.
- Melhorar testes do workflow e dos bloqueios.
- Criar contrato `ProcessoFull` como base do React.

### Prioridade 2 - Produto final

- Central Operacional em React.
- Analise do Cliente em React com painel lateral FOGUETINHO.
- Motor de Regras com simulacao/backtesting.
- Dashboard Executivo unificado.
- Fila Tecnica CCA/Repasse com permissoes claras.

### Prioridade 3 - Maturidade

- Alembic.
- Docker Compose local.
- Model registry completo.
- Modo shadow do modelo.
- Observabilidade de eventos e metricas do FOGUETINHO.

## 10. O Que Nao Recomendo Copiar Agora

- Nao copiar Fineract inteiro: e robusto, mas grande demais para o escopo atual.
- Nao colocar Conductor/Cadence agora: orquestrador pesado antes da modularizacao pode aumentar complexidade.
- Nao trocar FastAPI por outro framework: seu backend ja esta produtivo.
- Nao criar IA autonoma sem regra deterministica e auditoria.
- Nao migrar tudo para React de uma vez: melhor migracao incremental com paridade.

## 11. Recomendacao Final

O melhor upgrade inspirado nos projetos abertos e transformar o SioCred em uma aplicacao com tres nucleos:

1. **Nucleo de Processo**
   - cliente, documento, status, SLA, evento e workflow.

2. **Nucleo FOGUETINHO**
   - regras versionadas, score, recomendacao, feedback, backtesting e modelo shadow.

3. **Nucleo de Interface**
   - Central Operacional, Analise do Cliente, Dashboard Executivo e Motor de Regras.

O SioCred ja tem as pecas. O upgrade e reorganizar essas pecas como produto modular, auditavel e evolutivo.

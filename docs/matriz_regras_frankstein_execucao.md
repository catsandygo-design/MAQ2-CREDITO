# Matriz de Regras FRANKSTEIN - Execucao

## Objetivo

Mapear as regras que devem formar o primeiro nucleo explicavel do FRANKSTEIN, separando o que ja executa hoje, o que esta documentado e o que ainda precisa ser conectado.

Esta matriz evita retrabalho antes de criar um motor de regras mais completo.

## Legenda

- **Executa hoje**: a regra ja esta em codigo e retorna efeito no sistema.
- **Documentada**: a regra aparece nos documentos de regras/projeto.
- **Falta conectar**: a regra existe como necessidade, mas ainda precisa entrar no contrato explicavel ou tela final.
- **Autonomia**:
  - `0`: observador;
  - `1`: recomenda;
  - `2`: prepara acao com confirmacao;
  - `3`: executa acao reversivel/auditavel;
  - `4`: bloqueia regra objetiva.

## Matriz Inicial

| Codigo | Regra | Setor | Origem | Executa hoje | Documentada | Falta conectar | Tela afetada | Autonomia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FRK-OK-001 | Processo sem pendencia critica | Decisao | `frankstein_operacional.py` | Sim | Sim | Nao | Analise do Cliente | 0 |
| FRK-VALOR-001 | Composicao financeira insuficiente | Financeiro | `frankstein_operacional.py` | Sim | Sim | Nao | Analise do Cliente | 1 |
| FRK-DOC-001 | RG/CPF nao enviado | Documental | `frankstein_operacional.py` | Sim | Sim | Nao | Analise do Cliente / Dossie | 1 |
| FRK-DOC-002 | Comprovante de residencia nao enviado | Documental | `frankstein_operacional.py` | Sim | Sim | Nao | Analise do Cliente / Dossie | 1 |
| FRK-RENDA-001 | Renda nao comprovada | Renda | `frankstein_operacional.py` | Sim | Sim | Nao | Analise do Cliente | 4 |
| FRK-RENDA-002 | Renda nao preenchida | Renda | `frankstein_operacional.py` | Sim | Sim | Nao | Analise do Cliente | 4 |
| FRK-FGTS-001 | FGTS nao validado para CLT | FGTS | `frankstein_operacional.py` | Sim | Sim | Nao | Analise do Cliente | 1 |
| FRK-RISCO-001 | Alto risco operacional | Risco | `frankstein_operacional.py` | Sim | Sim | Nao | Analise do Cliente / Gestor | 1 |
| FRK-SIM-001 | Preco abaixo da politica comercial | Simulacao | `simulacao_engine.py` | Sim | Sim | Sim, expor melhor no painel | Apresentacao / Simulacao | 4 |
| FRK-SIM-002 | IS pos-chaves >= 40% | Simulacao | `simulacao_engine.py` | Sim | Sim | Sim, expor como regra explicavel | Apresentacao / Simulacao | 4 |
| FRK-SIM-003 | IS pos-chaves entre 35% e 40% | Simulacao | `simulacao_engine.py` | Sim | Sim | Sim, expor como atencao | Apresentacao / Simulacao | 1 |
| FRK-AGEHAB-001 | Renda acima de 3 salarios minimos e unidade nao retomada | Agehab | `web/analista.html` / mudanca local | Sim na tela | Sim no projeto | Sim, centralizar no backend | Analise do Cliente | 4 |
| FRK-AGEHAB-002 | Renda acima de 3 salarios minimos e unidade retomada | Agehab | `web/analista.html` / mudanca local | Sim na tela | Sim no projeto | Sim, centralizar no backend | Analise do Cliente | 0 |
| FRK-FGTS-002 | Sugerir FGTS futuro para cotista com parcela entre 20% e 28% | FGTS | `web/analista.html` | Sim na tela | Sim no projeto | Sim, centralizar no backend | Analise do Cliente | 1 |
| FRK-COMP-001 | Comprometimento ate 30% | Renda | `web/analista.html` | Sim na tela | Sim | Sim, centralizar no backend | Analise do Cliente | 0 |
| FRK-COMP-002 | Comprometimento acima de 30% ate 40% | Renda | `web/analista.html` | Sim na tela | Sim | Sim, centralizar no backend | Analise do Cliente | 1 |
| FRK-COMP-003 | Comprometimento acima de 40% ate 45% | Renda | `web/analista.html` | Sim na tela | Sim | Sim, centralizar no backend | Analise do Cliente | 1 |
| FRK-COMP-004 | Comprometimento acima de 45% exige conferencia/renda complementar | Renda | `web/analista.html` | Sim na tela | Sim | Sim, centralizar no backend | Analise do Cliente | 2 |
| FRK-ASS-001 | Assinatura sem Agehab validada | Repasse | `web/analista.html` / workflow | Sim na tela/backend parcial | Sim | Sim, padronizar resposta explicavel | Analise / Repasse | 4 |
| FRK-ASS-002 | Assinatura com sinal pendente | Repasse | `web/analista.html` / workflow | Sim na tela/backend parcial | Sim | Sim, padronizar resposta explicavel | Analise / Repasse | 4 |
| FRK-ASS-003 | Assinatura com fiador pendente | Repasse | `web/analista.html` / workflow | Sim na tela/backend parcial | Sim | Sim, padronizar resposta explicavel | Analise / Repasse | 4 |
| FRK-OBS-001 | Pendencia operacional sem observacao | Operacional | `web/analista.html` | Sim na tela | Sim | Sim, centralizar no backend | Analise do Cliente | 4 |
| FRK-DOSSIE-001 | Documento bloqueado/reprovado | Documental | `web/analista.html` | Sim na tela | Sim | Sim, centralizar no backend | Dossie / Analise | 4 |
| FRK-DOSSIE-002 | Documento pendente | Documental | `web/analista.html` | Sim na tela | Sim | Sim, centralizar no backend | Dossie / Analise | 1 |
| FRK-DOSSIE-003 | Documento aguardando envio/analise | Documental | `web/analista.html` | Sim na tela | Sim | Sim, centralizar no backend | Dossie / Analise | 1 |
| FRK-SLA-001 | Owner de SLA por evento/status | SLA | `app.py` | Sim | Sim | Sim, expor melhor na Central | Central Operacional | 3 |
| FRK-WF-001 | Transicao para assinatura autorizada exige regras de elegibilidade | Workflow | `app.py` / docs | Sim | Sim | Sim, expor motivo de bloqueio | Repasse | 4 |

## Primeiro Corte Implementado

O primeiro corte do contrato explicavel fica em `frankstein_operacional.py` e cobre:

- `FRK-OK-001`
- `FRK-VALOR-001`
- `FRK-DOC-001`
- `FRK-DOC-002`
- `FRK-RENDA-001`
- `FRK-RENDA-002`
- `FRK-FGTS-001`
- `FRK-RISCO-001`

## Proxima Evolucao

1. Conectar regras que hoje estao em `web/analista.html` ao backend.
2. Fazer a tela exibir `regras_disparadas`.
3. Registrar feedback humano por regra.
4. Criar backtesting simples para regra nova.


# Relatorio tecnico e funcional - SioCred / Foguetinho

Data: 11/05/2026

## 1. Sistema utilizado na construcao do app e versoes

O SioCred e uma aplicacao web personalizada construida principalmente com:

| Camada | Tecnologia | Versao/estado identificado |
| --- | --- | --- |
| Backend | Python | Deploy fixado em `python-3.11.11` no `runtime.txt`. PC local esta com Python `3.14.2`. |
| API | FastAPI | `0.129.0` instalado localmente; requisito `>=0.115,<1.0`. |
| Servidor app | Gunicorn + Uvicorn Worker | Gunicorn `23.0.0`, Uvicorn `0.40.0`. |
| Banco | PostgreSQL via SQLAlchemy/psycopg | SQLAlchemy `2.0.46`, psycopg `3.3.2`. |
| Validacao/API schema | Pydantic | `2.12.5`. |
| Frontend principal em migracao | React + Vite + TypeScript | React `19.2.4`, Vite `7.3.1`, TypeScript `5.9.3`. |
| UI legado | HTML/CSS/JS estatico | Telas em `web/`, ainda ativas. |
| Hospedagem | Render Web Service | Plano `free`, com `gunicorn -k uvicorn.workers.UvicornWorker app:app`. |
| E-mail | Brevo API HTTPS preferencial, SMTP fallback | Criado porque Render Free bloqueia portas SMTP. |
| IA/Foguetinho | Motor operacional interno + regras + feedback | Arquivos `frankstein_operacional.py`, docs de regras, eventos e testes. |
| Testes | Pytest | `17 passed` na ultima validacao local. |

Observacao importante: o app de producao deve seguir o Python do `runtime.txt` (`3.11.11`). A diferenca com o Python local (`3.14.2`) pode esconder incompatibilidades se algo for testado apenas no PC.

## 2. Proposta do app

O SioCred e um sistema operacional para o setor de credito, comercial e repasse. Ele organiza processos de clientes, documentos, CCA/Caixa, Agehab, sinal, fiador, SLA, historico e alertas.

A proposta central e reduzir erro operacional e retrabalho, deixando a complexidade do credito por tras das cortinas e mostrando ao usuario:

1. O que esta acontecendo.
2. O que esta travando.
3. O que deve ser feito agora.

O Foguetinho e o operador logico supervisionado: ele alerta, sugere, compara, bloqueia regras objetivas e registra eventos, mas decisoes sensiveis continuam sob supervisao humana.

## 3. Estimativa de funcionalidade atual

Estimativa cautelar: **70% funcional para uso operacional controlado**.

Justificativa:

- O backend ja possui rotas, tabelas principais, login, perfis, importacao, processos, documentos, eventos, logs, planejamento, alertas de e-mail, validacoes e dashboards.
- Existem 17 modelos/tabelas principais em `app.py`, incluindo cliente, processo, documento, eventos, usuarios, sessoes, empreendimentos, leads, feedback de IA, unidades, planejamento e reuniao comercial.
- Existem cerca de 119 rotas FastAPI mapeadas no backend.
- Existem telas legadas em `web/` e uma frente React em migracao.
- Existem testes automatizados, mas ainda poucos para o tamanho do sistema.

Nao classifico como 100% porque ainda ha pontos de maturidade:

- HTML legado e React convivem, gerando duplicidade.
- O motor de regras ainda nao esta totalmente versionado como produto final.
- Falta ampliar testes de ponta a ponta e testes de permissao.
- O banco ainda depende de configuracao correta no Render.
- Alertas externos dependem de provedor de e-mail.
- Ainda falta consolidar telas para reduzir dispersao.

## 4. Para quem e

O app e para uso interno do setor de credito/operacao, especialmente:

- Analista de credito.
- Gestor de credito.
- CCA/repasse.
- Administrativo do sistema.
- Eventualmente corretor, se o acesso for limitado a pre-cadastro/showroom e nao a operacao sensivel.

O usuario principal nao e publico externo. E uma ferramenta de trabalho diario para quem precisa acompanhar processos, pendencias e decisao operacional.

## 5. Para que serve

Serve para:

- Centralizar a carteira de processos.
- Controlar etapas comerciais, credito, documentos e repasse.
- Ver pendencias e gargalos.
- Validar regras de credito e documentacao.
- Registrar historico e auditoria.
- Organizar tarefas/agenda.
- Enviar alertas de compromisso por e-mail.
- Apoiar decisao com o Foguetinho.
- Dar visao gerencial sobre produtividade, retrabalho e riscos.

## 6. Problemas que resolve

1. **Informacao espalhada**
   - Concentra cliente, processo, documentos, status e historico.

2. **Retrabalho**
   - Aponta pendencias, renda duplicada, falta de motivo e travas antes de avancar.

3. **Falha de acompanhamento**
   - Agenda, tarefas e alertas ajudam a nao perder compromissos.

4. **Falta de padrao**
   - Regras e frases do Foguetinho padronizam leitura operacional.

5. **Gestao sem visao clara**
   - Dashboards e filas mostram gargalos e etapas criticas.

6. **Dependencia de memoria humana**
   - O Foguetinho funciona como lembrete inteligente e supervisor de regra.

7. **Risco de avancar processo errado**
   - Regras objetivas podem bloquear ou destacar riscos.

## 7. Problemas que pode ter

1. **Dependencia do Render Free**
   - Servico pode dormir, ter limite de recursos e bloquear SMTP tradicional.

2. **Banco no Render Free**
   - Banco gratuito tem limite/expiracao conforme politica do provedor; para producao real, banco pago e backup sao mais seguros.

3. **Mistura de telas legadas e React**
   - Pode gerar diferenca de regra entre uma tela e outra.

4. **`app.py` muito grande**
   - Muita responsabilidade em um arquivo aumenta risco de erro ao alterar.

5. **Testes ainda limitados**
   - Existem testes, mas a cobertura ainda nao parece proporcional ao tamanho do sistema.

6. **Regras ainda em evolucao**
   - Se uma regra nao estiver documentada, pode haver decisao inconsistente.

7. **Dados sensiveis**
   - O sistema lida com CPF, renda, documentos, cliente, historico e decisao de credito.

8. **Variaveis de ambiente**
   - Senhas, tokens e chaves precisam estar fora do codigo e rotacionadas quando expostas.

9. **E-mail**
   - A entrega depende de provedor externo e verificacao de remetente/dominio.

## 8. Riscos e como tornar mais seguro

| Risco | Impacto | Mitigacao recomendada |
| --- | --- | --- |
| Vazamento de dados pessoais | Alto | Criptografar campos sensiveis, mascarar CPF/e-mail, revisar logs e limitar exportacoes. |
| Senhas/chaves expostas | Alto | Usar variaveis de ambiente, rotacionar chaves expostas, nunca salvar segredo em print/documento. |
| Acesso indevido por perfil | Alto | Reforcar RBAC por rota, testes de permissao e sessoes com expiracao. |
| Perda de banco | Alto | Backup automatico, banco pago/estavel, rotina de restore testada. |
| Foguetinho decidir demais | Alto | Manter autonomia supervisionada, logs, aprovacao humana e niveis de acao. |
| Regra errada bloqueando processo | Medio/alto | Versionar regras, simular em dados antigos e permitir revisao humana. |
| Tela React diferente da tela HTML | Medio | Migrar com paridade, testes comparativos e rollback. |
| Render Free dormir/limitar | Medio | Upgrade para plano pago ou health/worker adequado. |
| E-mail nao entregue | Medio | Usar API HTTPS de provedor transacional, validar dominio/remetente e registrar Message-ID. |

Prioridades de seguranca:

1. Rotacionar qualquer senha ou chave que apareceu em captura de tela.
2. Ativar backup real do banco.
3. Revisar permissoes por perfil em todas as rotas.
4. Aumentar testes de fluxos criticos.
5. Separar regras do Foguetinho em modulo versionado.
6. Criar trilha de auditoria clara para acoes automaticas.

## 9. Possibilidade de colocar o banco de dados no SharePoint

Resposta curta: **nao recomendo colocar o banco principal no SharePoint**.

O SharePoint pode ser usado como apoio, mas nao como substituto ideal do PostgreSQL do SioCred.

### O que faz sentido no SharePoint

- Guardar documentos anexos.
- Guardar planilhas de importacao/exportacao.
- Criar listas simples de apoio.
- Criar uma area compartilhada de relatorios.
- Integrar com Microsoft 365/Power Automate no futuro.

### O que nao faz sentido

- Usar SharePoint Lists como banco transacional principal.
- Guardar todo historico operacional de processos como listas.
- Rodar regras complexas, filtros pesados e relacoes como se fosse PostgreSQL.
- Depender de SharePoint para consistencia transacional do app.

### Motivo tecnico

A documentacao da Microsoft informa que listas podem chegar a muitos itens, mas ha limite de exibicao/consulta de 5.000 itens por view quando a lista fica grande. Tambem ha limites operacionais de listas, bibliotecas e permissoes. A API Microsoft Graph permite ler e escrever listas e itens, mas isso nao transforma SharePoint em um banco relacional com transacoes, joins e integridade como PostgreSQL.

Recomendacao de arquitetura:

- **Banco principal:** PostgreSQL.
- **SharePoint:** repositorio documental e/ou espelho de relatorios.
- **Integracao futura:** salvar arquivos/documentos no SharePoint e manter no banco apenas metadados, links, status e auditoria.

## 10. Tempo de adaptacao

Estimativa para usuarios internos:

| Perfil | Tempo para uso basico | Tempo para uso seguro/completo |
| --- | --- | --- |
| Analista | 2 a 5 dias | 2 a 3 semanas |
| Gestor | 1 a 3 dias | 1 a 2 semanas |
| CCA/Repasse | 2 a 5 dias | 2 a 3 semanas |
| Admin | 1 semana | 3 a 6 semanas |

Estimativa para estabilizacao tecnica/produto:

| Frente | Tempo estimado |
| --- | --- |
| Padronizar regras principais do Foguetinho | 1 a 2 semanas |
| Consolidar telas principais/UX | 2 a 4 semanas |
| Ampliar testes de fluxos criticos | 1 a 3 semanas |
| Fortalecer seguranca e backup | 1 a 2 semanas |
| Migracao React com paridade | 4 a 8 semanas, por fases |

## 11. Conclusao

O SioCred ja esta em um ponto funcional relevante, mas ainda deve ser tratado como uma aplicacao operacional em maturacao, nao como produto final congelado.

O caminho recomendado e:

1. Manter PostgreSQL como banco principal.
2. Usar SharePoint apenas para documentos/relatorios, nao como banco central.
3. Fortalecer seguranca, backup e permissoes.
4. Consolidar telas para o usuario ver menos complexidade.
5. Versionar regras do Foguetinho.
6. Aumentar testes antes de dar mais autonomia.
7. Migrar React aos poucos, sem apagar regra ja existente.

O diferencial do projeto e estar adaptado ao setor de credito real: nao e um sistema generico, e uma ferramenta para reduzir erro, organizar fila, controlar pendencias e dar ao usuario uma proxima acao clara.

## Fontes consultadas

- Microsoft Learn - SharePoint limits: https://learn.microsoft.com/en-us/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-limits
- Microsoft Learn - SharePoint list view threshold: https://learn.microsoft.com/en-us/sharepoint/troubleshoot/lists-and-libraries/items-exceeds-list-view-threshold
- Microsoft Learn - Microsoft Graph SharePoint API: https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0
- Render Docs - Free service limitations: https://render.com/docs/free

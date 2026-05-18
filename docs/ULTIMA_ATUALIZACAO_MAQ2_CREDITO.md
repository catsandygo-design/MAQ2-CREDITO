# MAQ2-CREDITO - Ultima atualizacao do projeto

Data da consolidacao: 17/05/2026

## Contexto

Projeto interno para operacao de credito imobiliario, Caixa + Agehab, com foco em:

- Painel do corretor
- Checklist documental
- Analise documental pelo analista
- Esteira CCA
- Telemetria do gestor/coordenador
- Workflow operacional de documentos, formularios, SLA e repasse

Repositorio:

- GitHub: https://github.com/catsandygo-design/MAQ2-CREDITO

Deploy:

- Vercel: https://maq-2-credito.vercel.app

## Direcao atual

O projeto deixou de seguir a ideia antiga de "Frankenstein do Credito" e passou a seguir uma arquitetura mais real de plataforma enterprise:

- SaaS corporativo
- Operacao bancaria
- Credito imobiliario
- Governanca operacional
- Esteira documental
- Workflow entre corretor, analista, CCA e gestor

## Padrao visual atual

O visual foi alterado do dark premium inicial para uma base clara:

- Fundo branco ou cinza claro
- Cards brancos/cinza claro
- Fontes escuras com contraste
- Verde operacional como cor de acao/status positivo
- Amarelo/laranja para atencao
- Vermelho para critico/pendencia
- Visual limpo, corporativo e mais legivel

Observacao:

- As telas do corretor, CCA e checklist foram ajustadas para nao ficarem escuras demais.
- A prioridade agora e manter contraste, legibilidade e aproveitamento de espaco.

## Rotas principais

### Login

- `/login`
- URL: https://maq-2-credito.vercel.app/login

### Tela inicial

- `/`
- URL: https://maq-2-credito.vercel.app

### Corretor - Acompanhamento

- `/painel/acompanhamento`
- URL: https://maq-2-credito.vercel.app/painel/acompanhamento

Uso:

- Tela principal do corretor.
- Mostra dashboards de alertas, SLA, retrabalho, reservas x repasses.
- Mostra fila de acompanhamento dos clientes.
- Ao clicar no nome do cliente, deve levar para o checklist documental correto em HTML.

### Corretor - Checklist documental

- `/checklist_documentos_upload_com_formulario.html`
- URL: https://maq-2-credito.vercel.app/checklist_documentos_upload_com_formulario.html

Uso:

- Tela baseada no arquivo HTML enviado pelo usuario:
  - `C:\Users\douglas.silva\Downloads\checklist_documentos_upload_com_formulario.html`
- Deve ser a tela usada pelo corretor para preencher dados do proponente e controlar documentos.
- A parte de upload em alguns itens de produto foi alterada para combobox:
  - Sim
  - Nao
  - N/A

Tambem existe rota antiga:

- `/painel/checklist-documentos`

Observacao:

- O fluxo desejado pelo usuario e usar o HTML correto, nao a tela antiga.

### CCA - Acompanhamento

- `/cca/acompanhamento`
- URL: https://maq-2-credito.vercel.app/cca/acompanhamento

Uso:

- Tela principal do CCA.
- Mostra pendencias CCA.
- Mostra clientes por agencia Caixa.
- Mostra resumo operacional CCA:
  - processos com o CCA
  - processos enviados para conformidade
  - processos assinados
- Tabela CCA com:
  - Reserva
  - Cliente
  - Gestor
  - Agencia
  - Momento do cliente

Momentos definidos para CCA:

- Aguardando documentos
- Analise credito
- Emitir formularios
- Formularios emitidos
- Formularios assinados
- Pendencia documental
- Aguardando conformidade
- Em agendamento
- Agendado para data/hora abreviada
- Minuta assinada
- Processo finalizado

Alertas importantes:

- `Emitir formularios` deve ficar realcado.
- `Formularios assinados` deve ficar realcado.
- `Formularios emitidos` foi acrescentado.

### Gestor / Coordenador - Telemetria

- `/gestor/telemetria`
- URL: https://maq-2-credito.vercel.app/gestor/telemetria

Uso:

- Tela de telemetria do gestor/coordenador.
- Deve concentrar indicadores de performance e retrabalho.
- O card de retrabalho documental do CCA foi removido da tela CCA porque deve ficar aqui.

### Analista - Checklist / Analise documental

- `/analista/checklist`
- URL: https://maq-2-credito.vercel.app/analista/checklist

Uso:

- Tela de analise documental do analista.
- Deve mostrar documentos enviados pelo corretor.
- Estado inicial do botao deve ser `Aguardando`.
- Quando o corretor envia documento, o status muda para `Abrir`.
- Ao abrir/analisar, o analista deve ter um combobox com:
  - Aprovado
  - Pendenciado

Regra desejada:

- O analista aprova ou pendencia a documentacao.
- Se pendenciar, libera novo upload ao corretor.
- Se aprovar, envia o processo ao CCA.

### Analista - pagina principal

- `/analista`

Estado atual:

- O usuario pediu para remover/deletar essa tela.
- Arquivo local deletado:
  - `src/app/analista/page.tsx`
- A rota `/analista` nao deve renderizar a tela antiga com menu:
  - Painel
  - Acompanhamento
  - Operacional
  - Repasse
  - Importacao
  - Metricas
  - Gestor

Observacao:

- Existe um arquivo externo enviado pelo usuario:
  - `C:\Users\douglas.silva\Downloads\AnalistaPainelPage.tsx`
- Esse arquivo ainda nao foi implementado diretamente porque foi feito em padrao React Router e precisa ser adaptado para Next.js App Router.

Subrotas existentes do analista:

- `/analista/checklist`
- `/analista/workflow`
- `/analista/governanca`
- `/analista/sla`
- `/analista/metricas`
- `/analista/minuta`

## Tela do corretor - ajustes realizados

Rota:

- `/painel/acompanhamento`

Principais ajustes feitos:

- Layout reorganizado em 3 colunas:
  - Dashboard 1 na esquerda
  - Dashboard 2 no topo da coluna central
  - Taxa de retrabalho abaixo do Dashboard 2
  - Dashboard 3 na direita
- A altura total da coluna central foi alinhada com os cards laterais.
- Dashboard 1 recebeu barra de rolagem nos alertas.
- Dashboard 2 teve velocimetro reduzido para economizar espaco.
- Dashboard 3 mantem os indicadores de reservas x repasses.
- Card de taxa de retrabalho fica abaixo do SLA.
- A tela foi migrada para fundo branco/cinza claro com contraste.
- Foi solicitado remover o botao `+ Nova reserva`.

Tabela operacional do corretor:

- Reserva
- Nome do cliente
- Status Caixa
- Status Agehab
- Sinal
- Fiador
- Momento da reserva
- Prazo

Status Caixa definidos:

- aguardando envio doc
- em validacao credito
- solicitado emissao formularios
- formularios disponiveis
- formularios recebidos
- pendencia documentacao
- enviado para conformidade
- aguardando agendamento
- em processo assinatura
- cliente agendado
- minuta assinada
- venda repassada

Status Agehab definidos:

- aguardando documentacao
- em analise credito
- ficha agehab liberada
- documentos pendenciados
- agehab enviada
- agehab validada

## Tela checklist documental - ajustes realizados

Rota principal desejada:

- `/checklist_documentos_upload_com_formulario.html`

Ajustes realizados/desejados:

- Fundo branco.
- Cards internos brancos/cinza claro.
- Fontes com contraste escuro.
- Remover textos redundantes.
- Botao lateral ao lado de salvar precisava fonte visivel.
- Dados do proponente e dependentes devem permanecer.
- Regras automaticas devem permanecer:
  - casado exige documentos do conjuge
  - renda informal exige declaracao
  - renda formal exige FGTS
- Itens de produto/relacionamento deixam de ser upload e passam a ser combobox:
  - Sim
  - Nao
  - N/A

## Tela CCA - ajustes realizados

Rota:

- `/cca/acompanhamento`

Ajustes de estrutura:

- Card 1 mantido: pendencias CCA.
- Card 2 alterado para mostrar quantos clientes existem em cada agencia.
- Card 3 alterado para resumo operacional:
  - com o CCA
  - para conformidade
  - assinados
- Removido o card de retrabalho documental CCA da tela CCA.
- Esse indicador deve ficar na tela do gestor/coordenador.
- Fundo claro/cinza claro com fontes escuras e contraste.
- Telemetria/tabela CCA tambem precisa seguir o mesmo padrao claro.

Tabela CCA:

- Reserva
- Cliente
- Gestor
- Agencia
- Momento do cliente

Prefixos antes do nome do cliente:

- `(PP)` Produto pago
- `(PN)` Produto negociado com cliente
- `(PA)` Produto em aberto

Exemplo:

- `(PP) Joao Amorin`

## Analista - comportamento desejado

Na tela do analista, o fluxo documental deve funcionar assim:

1. Documento ainda nao enviado pelo corretor:
   - status/botao: `Aguardando`
2. Corretor envia o documento:
   - status/botao muda para `Abrir`
3. Analista abre o documento:
   - aparece combobox de decisao
4. Opcoes do combobox:
   - Aprovado
   - Pendenciado
5. Se `Aprovado`:
   - documento/processo segue para o CCA
6. Se `Pendenciado`:
   - upload volta a ser liberado para o corretor

## Backend / Workflow criado

Foi criada uma primeira camada de backend para representar o fluxo real do negocio.

Arquivos principais:

- `src/lib/workflow/types.ts`
- `src/lib/workflow/engine.ts`
- `src/lib/workflow/store.ts`
- `src/lib/workflow/api.ts`
- `docs/BACKEND-WORKFLOW-CREDITO.md`

Rotas API criadas:

- `GET /api/processos`
- `POST /api/processos`
- `GET /api/processos/:id`
- `POST /api/processos/:id/documentos/upload`
- `POST /api/processos/:id/analista/aprovar-documentacao`
- `POST /api/processos/:id/analista/pendenciar-documentacao`
- `POST /api/processos/:id/cca/aprovar-documentacao`
- `POST /api/processos/:id/cca/pendenciar-documentacao`
- `POST /api/processos/:id/cca/emitir-formularios`
- `POST /api/processos/:id/formularios/upload-assinados`

Status oficiais do processo:

- `novo_cv`
- `aguardando_upload_corretor`
- `documentacao_enviada`
- `em_analise_analista`
- `pendente_corretor`
- `aprovado_analista`
- `em_analise_cca`
- `pendente_cca_corretor`
- `aprovado_cca`
- `formularios_emitidos`
- `formularios_assinados_enviados`
- `kit_caixa_reserva_finalizado`

Regras implementadas no motor de workflow:

- Processo entra pela integracao CV.
- Corretor recebe processo com upload liberado.
- Corretor envia documentos.
- Apos envio, upload do corretor fica bloqueado.
- Analista aprova ou pendencia.
- Se o analista pendencia, o upload e liberado novamente para o corretor.
- Se o analista aprova, o processo vai para o CCA.
- CCA aprova ou pendencia.
- Se o CCA pendencia, libera novo upload para o corretor.
- Se o CCA aprova, pode emitir formularios.
- Corretor baixa formularios emitidos.
- Corretor coleta assinatura do cliente.
- Corretor envia formularios assinados.
- Se todos os formularios assinados forem enviados, finaliza como Kit Caixa Reserva.

Regra de formulario:

- O corretor deve baixar os formularios pelo controle de upload/download/status.
- Depois deve enviar os formularios assinados.

## Situacao atual do backend

O backend existe como primeira implementacao de workflow, mas ainda nao esta completo como backend produtivo.

O que ja existe:

- Tipos do fluxo.
- Motor de transicoes.
- Rotas API basicas.
- Armazenamento temporario/mock.
- Regras de bloqueio/liberacao de upload.
- Eventos do processo.

O que ainda falta para producao:

- Persistencia real em Supabase ou outro banco.
- Upload real dos arquivos em bucket/storage.
- Autenticacao real por perfil:
  - corretor
  - analista
  - CCA
  - gestor
- Integracao real com CV.
- Vinculo das telas ao backend.
- Historico visual do processo.
- Controle real de permissao por status.
- Download real de formularios emitidos.
- Registro de pendencias por documento.

Proposta tecnica para persistencia:

- Tabela `processos`
- Tabela `documentos`
- Tabela `formularios`
- Tabela `eventos_workflow`
- Bucket `documentos-processos`
- Bucket `formularios-caixa`

## Estado local do Git neste momento

Estado observado:

- `src/app/analista/page.tsx` deletado.
- `src/app/globals.css` modificado.

Importante:

- A exclusao de `src/app/analista/page.tsx` foi solicitada pelo usuario porque aquela tela nao deve existir.
- Antes de commitar, revisar se as alteracoes de CSS estao coerentes com as telas claras.

## Arquivos importantes do projeto

Telas:

- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/app/painel/acompanhamento/page.tsx`
- `src/app/painel/checklist-documentos/page.tsx`
- `src/app/checklist_documentos_upload_com_formulario.html/route.ts`
- `src/app/analista/checklist/page.tsx`
- `src/app/cca/acompanhamento/page.tsx`
- `src/app/gestor/telemetria/page.tsx`

Estilo:

- `src/app/globals.css`
- `src/styles/login.css`

Backend/workflow:

- `src/lib/workflow/types.ts`
- `src/lib/workflow/engine.ts`
- `src/lib/workflow/store.ts`
- `src/lib/workflow/api.ts`
- `src/app/api/processos/route.ts`
- `src/app/api/processos/[id]/route.ts`
- `src/app/api/processos/[id]/documentos/upload/route.ts`
- `src/app/api/processos/[id]/analista/aprovar-documentacao/route.ts`
- `src/app/api/processos/[id]/analista/pendenciar-documentacao/route.ts`
- `src/app/api/processos/[id]/cca/aprovar-documentacao/route.ts`
- `src/app/api/processos/[id]/cca/pendenciar-documentacao/route.ts`
- `src/app/api/processos/[id]/cca/emitir-formularios/route.ts`
- `src/app/api/processos/[id]/formularios/upload-assinados/route.ts`

## Proximas prioridades recomendadas

1. Conectar checklist do corretor ao backend real de workflow.
2. Fazer o upload gravar documento no storage.
3. Fazer a tela do analista listar documentos reais enviados pelo corretor.
4. Trocar botao do analista de `Aguardando` para `Abrir` quando houver arquivo.
5. Implementar decisao do analista:
   - Aprovado
   - Pendenciado
6. Enviar automaticamente processos aprovados pelo analista para a tela CCA.
7. Implementar a decisao do CCA:
   - aprovar documentos
   - pendenciar documentos
   - emitir formularios
8. Implementar download dos formularios pelo corretor.
9. Implementar upload dos formularios assinados.
10. Finalizar processo como Kit Caixa Reserva.

## Observacoes finais

- O projeto esta em fase de transicao entre prototipo visual e sistema operacional real.
- As telas ja representam boa parte do fluxo, mas ainda precisam ser conectadas ao backend.
- O backend ja tem a regra de negocio inicial, mas precisa persistencia real e integracao com as telas.
- O foco atual deve ser amarrar: corretor -> analista -> CCA -> corretor -> finalizacao.

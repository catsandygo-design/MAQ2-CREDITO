# MAQ2-CREDITO - Status do projeto

Atualizado em: 17/05/2026

## Objetivo

Plataforma enterprise de credito imobiliario para operacao Caixa + Agehab, com foco em:

- acompanhamento operacional por corretor;
- fila CCA de analise e conformidade;
- checklist documental com upload;
- gestao de SLA, pendencias, repasse e governanca operacional.

## Repositorio e deploy

- GitHub: https://github.com/catsandygo-design/MAQ2-CREDITO
- Vercel: https://maq-2-credito.vercel.app
- Branch principal: `main`
- Workspace local: `C:\Users\douglas.silva\Downloads\sistema-credito\Sistema_credito_pro`

## Rotas principais

- Login: https://maq-2-credito.vercel.app/login
- Painel do corretor: https://maq-2-credito.vercel.app/painel/acompanhamento
- Painel CCA: https://maq-2-credito.vercel.app/cca/acompanhamento
- Checklist documental HTML: https://maq-2-credito.vercel.app/checklist_documentos_upload_com_formulario.html
- Rota ponte do checklist: https://maq-2-credito.vercel.app/painel/checklist-documentos

## Arquivos principais

- `src/app/painel/acompanhamento/page.tsx`: tela de acompanhamento do corretor.
- `src/app/cca/acompanhamento/page.tsx`: tela de acompanhamento CCA.
- `public/checklist_documentos_upload_com_formulario.html`: checklist documental original em HTML, usado como tela final de upload.
- `src/app/painel/checklist-documentos/page.tsx`: redireciona para o HTML do checklist preservando query string.
- `src/app/checklist_documentos_upload_com_formulario.html/route.ts`: rota server-side que serve o HTML do checklist para evitar 404.
- `src/app/globals.css`: CSS global das telas Next.js.

## Fluxo atual

1. O usuario acessa o painel do corretor.
2. Na tabela de acompanhamento, clica no nome do cliente.
3. O clique abre diretamente o checklist HTML:
   `/checklist_documentos_upload_com_formulario.html?cliente=NOME&reserva=RESERVA`
4. A tela de checklist exibe dados do proponente, dependentes, campos do processo e lista de documentos para upload.

O mesmo padrao tambem foi aplicado na tela CCA: clicar no cliente abre o checklist HTML novo.

## Tela do corretor

Rota: `/painel/acompanhamento`

Estrutura atual:

- Dashboard 1 - Alertas
- Dashboard 2 - SLA
- Taxa de retrabalho abaixo do SLA, na coluna central
- Dashboard 3 - Reservas x Repasses
- Tabela operacional com cliente clicavel

Colunas da tabela:

- Reserva
- Nome do cliente
- Status Caixa
- Status Agehab
- Sinal
- Fiador
- Momento da reserva
- Prazo

Status Caixa usados no conceito do projeto:

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

Status Agehab usados no conceito do projeto:

- aguardando documentacao
- em analise credito
- ficha agehab liberada
- documentos pendenciados
- agehab enviada
- agehab validada

## Tela CCA

Rota: `/cca/acompanhamento`

Estrutura atual:

- Dashboard 1 - Pendencias CCA mantido.
- Dashboard 2 - Clientes por agencia Caixa.
- Dashboard 3 - Resumo operacional CCA:
  - processos com o CCA;
  - encaminhados para conformidade;
  - assinados.
- O card de retrabalho documental CCA foi removido desta tela, pois ficara na tela do coordenador.
- Tabela CCA com produto antes do nome do cliente.

Colunas da tabela CCA:

- Reserva
- Cliente
- Gestor
- Agencia
- Momento do cliente

Prefixos de produto no cliente:

- `(PP)` Produto pago
- `(PN)` Produto negociado com cliente
- `(PA)` Produto em aberto

Momentos do cliente definidos:

- aguardando documentos
- analise credito
- emitir formularios
- formularios emitidos
- formularios assinados
- pendencia documental
- aguardando conformidade
- em agendamento
- agendado para data - horas abrevidadas
- minuta assinada
- processo finalizado

Momentos que devem ficar realcados/alertados para o CCA:

- emitir formularios
- formularios assinados

## Checklist documental

Rota final: `/checklist_documentos_upload_com_formulario.html`

Origem do arquivo:

- `C:\Users\douglas.silva\Downloads\checklist_documentos_upload_com_formulario.html`

Estado atual:

- O HTML original foi copiado para `public/checklist_documentos_upload_com_formulario.html`.
- A tela foi ajustada para fundo branco.
- Cards do checklist foram clareados.
- Textos foram ajustados para contraste com fundo branco.
- O bloco redundante de regras acima dos botoes foi removido.
- O botao ao lado de "Salvar" foi ajustado para fonte visivel.

Campos superiores do checklist:

- Nome completo
- Numero da reserva
- Cidade
- Empreendimento
- Corretor responsavel
- Estado civil
- Tipo de renda
- Tipo de dependente
- Quantidade de dependentes

Regras conceituais:

- casamento exige documentos do conjuge;
- renda informal exige declaracao;
- renda formal exige FGTS;
- dependentes alteram exigencias documentais.

## Visual definido

Direcao visual original:

- enterprise;
- premium;
- operacional;
- fintech/banco;
- dashboards compactos;
- cards internos;
- responsividade.

Mudanca visual recente:

- fundo das telas alterado para branco;
- fontes e componentes ajustados para contraste;
- ainda manter aparencia corporativa e organizada.

## Commits recentes relevantes

- `cf33aad` - clareia cards do checklist documental.
- `34c99b3` - aponta clientes para checklist HTML.
- `e300688` - limpa topo do formulario checklist.

## Onde estamos agora

O projeto esta com as telas principais funcionando e as rotas apontando para o checklist HTML novo. O ponto atual da evolucao e refinar a experiencia visual em fundo branco sem alterar estrutura funcional, mantendo o padrao enterprise e evitando informacoes redundantes.

Proximos passos naturais:

- continuar refinando contraste dos cards no checklist;
- validar no deploy da Vercel apos cada push;
- criar futuramente a tela do coordenador, onde deve entrar o indicador de retrabalho documental CCA;
- revisar responsividade em telas menores;
- transformar dados mockados em dados reais quando a base operacional estiver definida.

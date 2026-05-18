# MAQ2-CREDITO - Continuidade para Codex no VS Code

Atualizado em: 18/05/2026

## Contexto

Projeto: `MAQ2-CREDITO`

Repositorio GitHub:
`https://github.com/catsandygo-design/MAQ2-CREDITO`

Deploy Vercel:
`https://maq-2-credito.vercel.app`

Workspace local:
`C:\Users\douglas.silva\Downloads\sistema-credito\Sistema_credito_pro`

Observacao importante:
o computador local nao tem Node funcional. O build esta sendo validado pelo GitHub + Vercel. Use commits e push para disparar deploy.

## Rotas principais

- Login:
  `https://maq-2-credito.vercel.app/login`

- Acompanhamento do corretor:
  `https://maq-2-credito.vercel.app/painel/acompanhamento`

- Checklist do corretor:
  `https://maq-2-credito.vercel.app/checklist_documentos_upload_com_formulario.html`

- Painel CCA:
  `https://maq-2-credito.vercel.app/cca/acompanhamento`

- Painel analista:
  `https://maq-2-credito.vercel.app/app/analista`

- Checklist analista:
  `https://maq-2-credito.vercel.app/analista/checklist?cliente=Matheus%20Alves%20de%20Melo&reserva=458712`

- Gestor / telemetria:
  `https://maq-2-credito.vercel.app/gestor/telemetria`

## Arquivos principais

- Checklist corretor:
  `public/checklist_documentos_upload_com_formulario.html`

- Checklist analista:
  `public/analista_checklist.html`

- Rota do checklist analista:
  `src/app/analista/checklist/route.ts`

- Tela acompanhamento corretor:
  `src/app/painel/acompanhamento/page.tsx`

- Tela CCA:
  `src/app/cca/acompanhamento/page.tsx`

- Tela analista:
  `src/app/app/analista/page.tsx`

- Tela gestor:
  `src/app/gestor/telemetria/page.tsx`

- CSS global:
  `src/app/globals.css`

## Padrao visual definido

Manter:

- fundo branco/cinza claro;
- cards claros;
- fonte escura com contraste;
- bordas suaves;
- visual enterprise;
- dashboards compactos;
- tabelas com leitura limpa;
- sem alterar layout quando o pedido for ajuste fino.

Evitar:

- cards gigantes;
- espacos vazios;
- textos grandes dentro de tabelas pequenas;
- mudancas amplas quando o usuario pedir ajuste pontual.

## O que ja foi feito

### Acompanhamento do corretor

Rota:
`/painel/acompanhamento`

Implementado:

- tres dashboards superiores;
- alerta com rolagem;
- SLA compacto;
- taxa de retrabalho separada;
- reservas x repasses;
- telemetria com coluna `SLA Cliente`;
- botao no checklist do corretor para voltar para acompanhamento.

### Checklist do corretor

Rota:
`/checklist_documentos_upload_com_formulario.html`

Implementado:

- tela baseada no HTML enviado pelo usuario;
- cabecalho com total de documentos;
- dados do proponente;
- upload por documento;
- botao `Voltar para acompanhamento`.

### Checklist do analista

Rota:
`/analista/checklist`

Implementado:

- checklist baseado no HTML `analista (1).html`;
- remocao dos blocos que o usuario pediu para tirar;
- cabecalho de checklist;
- bloco `Dados do Proponente & Dependentes` acima do checklist;
- leitura de `cliente` e `reserva` pela URL;
- motivo de pendencia em maiusculo, limite 255 caracteres;
- prazo de pendencia com combo:
  `09:00`, `10:00`, `12:00`, `13:00`, `14:00`, `15:00`, `16:00`, `17:00`, `24hs`, `36hs`;
- ajuste de rolagem para o checklist nao sumir.

Regra importante:
quando mover elementos no checklist analista, cuidado com `panel-body` e `leftScroll`, pois a tela usa rolagem interna.

### Tela CCA

Rota:
`/cca/acompanhamento`

Implementado:

- visual branco/cinza;
- cards compactos;
- card 1 pendencias CCA;
- card 2 clientes por agencia Caixa;
- card 3 resumo operacional CCA;
- tabela CCA com reserva, cliente, gestor, agencia e momento do cliente;
- momentos do cliente ajustados.

### Tela analista

Rota:
`/app/analista`

Implementado:

- template visual parecido com CCA/corretor;
- card 1 pendencias acompanhadas;
- card 2 carteira em reserva;
- card 3 SLA;
- telemetria da carteira do analista;
- coluna `Responsavel`;
- momento `Em Processo`.

### Tela gestor

Rota:
`/gestor/telemetria`

Implementado:

- template baseado no analista;
- card 1 pendencias acompanhadas;
- card 2 produtividade por gestor:
  `Gestor | QT reserva | Finalizado | %`;
- total no fim do card 2;
- card 3 SLA com:
  `Melhor SLA`, `Pior SLA`, `Media SLA`;
- `Pior SLA` em vermelho;
- telemetria no padrao da tela de credito/acompanhamento.

## Backend / fluxo de negocio desejado

Fluxo pretendido:

1. Cliente cai para o corretor via integracao CV + app.
2. Corretor abre checklist conforme perfil do cliente.
3. Corretor faz upload da documentacao.
4. Depois do upload, corretor nao pode reenviar, exceto se houver pendencia.
5. Analista recebe documentos.
6. Analista abre documento, avalia e marca:
   - `Aprovado`
   - `Pendenciado`
7. Se pendenciado, sistema libera novo upload para o corretor.
8. Se aprovado pelo analista, processo segue para CCA.
9. CCA valida documentos.
10. CCA pode pendenciar e liberar novo upload.
11. Se tudo OK, CCA emite formularios.
12. Corretor baixa formularios, pega assinatura e faz upload.
13. Processo finaliza como kit Caixa reserva.

Estados do documento:

- `IDLE`
- `ENVIADO`
- `PENDENTE`
- `APROVADO`

Regra analista:

- antes do corretor enviar: botao/estado `Aguardando`;
- depois do envio: botao `Abrir`;
- depois de abrir: select `Aprovado/Pendenciado`;
- se pendenciado: exigir motivo e prazo.

## Supabase / Vercel

Houve erro de build por variaveis Supabase ausentes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Foi ajustado para o build nao quebrar quando variaveis nao estiverem configuradas.

Arquivos relacionados:

- `src/lib/supabase.ts`
- `src/app/api/processos/route.ts`
- `src/app/api/teste-supabase/route.ts`

Ainda falta configurar variaveis reais na Vercel quando o backend Supabase for ativado de verdade.

## Ultimos commits relevantes

- `465d3d3 fix: restaura rolagem do checklist analista`
- `7100407 feat: adiciona dados do proponente no checklist analista`
- `81ac5c2 fix: ajusta indicadores sla gestor`
- `f4fdca2 fix: compacta card produtividade gestor`
- `932a77f feat: cria painel gestor por template analista`
- `5b5b626 feat: adiciona voltar no checklist corretor`
- `61f1f6a feat: adiciona sla cliente na telemetria`
- `3f28d60 fix: ajusta textos da telemetria analista`

## Como trabalhar daqui para frente

1. Fazer alteracoes pequenas e pontuais.
2. Conferir `git diff`.
3. Commitar.
4. `git push origin main`.
5. Aguardar Vercel.
6. Confirmar a rota publicada.

Comandos uteis:

```powershell
git status --short --branch
git diff --check
git add <arquivo>
git commit -m "mensagem"
git push origin main
```

Para verificar deploy via GitHub API:

```powershell
$deployments=(Invoke-WebRequest -Uri 'https://api.github.com/repos/catsandygo-design/MAQ2-CREDITO/deployments?per_page=1' -UseBasicParsing -Headers @{ 'User-Agent'='Codex' } | ConvertFrom-Json)
$statuses=(Invoke-WebRequest -Uri $deployments[0].statuses_url -UseBasicParsing -Headers @{ 'User-Agent'='Codex' } | ConvertFrom-Json)
$statuses | Select-Object state,description,target_url,created_at | Format-List
```

## Observacoes para o Codex no VS Code

O usuario costuma pedir ajustes visuais pontuais. Quando ele disser "nao mexe no layout", alterar somente texto, coluna, cor ou pequenos espacos.

Sempre preservar:

- layout enterprise claro;
- responsividade;
- cards compactos;
- telemetria legivel;
- links e rotas existentes.

Antes de alterar HTML grande (`public/analista_checklist.html`), procurar o bloco exato com `rg` e mexer no menor trecho possivel.

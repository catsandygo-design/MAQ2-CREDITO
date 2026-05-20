# Estrutura do App - Sistema de Credito

## Stack e Linguagem

- Aplicacao em React com Next.js App Router.
- Linguagem principal: TypeScript/TSX.
- Estilos principais em CSS global: `src/app/globals.css`.
- Componentes e telas em `src/app`.
- Dependencias principais:
  - `next`
  - `react`
  - `react-dom`
  - `lucide-react`
  - `@supabase/supabase-js`
- Validacao usada no projeto:
  - `npm run type-check`
  - `npm run build`

## Como Rodar

Node portatil usado no ambiente:

```powershell
$nodeDir='C:\Users\douglas.silva\Downloads\sistema-credito\node-v24.15.0-win-x64\node-v24.15.0-win-x64'
$env:PATH="$nodeDir;$env:PATH"
& "$nodeDir\npm.cmd" run dev
```

URL local padrao:

```text
http://localhost:3000
```

## Estrutura Principal

```text
src/app
  analista/
    page.tsx
    checklist/
      page.tsx
  cca/
    acompanhamento/
      page.tsx
    checklist/
      page.tsx
  checklist_documentos_upload_com_formulario.html/
    page.tsx
  corretor/
    page.tsx
  gestor/
    telemetria/
      page.tsx
  login/
    page.tsx
  painel/
    acompanhamento/
      page.tsx
    checklist-documentos/
      page.tsx
  globals.css
  layout.tsx
  page.tsx

public/
  corretor_checklist_documentos_upload_com_formulario.html
  cca_checklist_documentos_upload.html
  analista_checklist.html
```

## Telas e Rotas

- `/login`: tela de login.
- `/analista`: painel do analista.
- `/analista/checklist`: checklist do analista.
- `/cca/acompanhamento`: acompanhamento CCA.
- `/cca/checklist`: checklist CCA.
- `/painel/acompanhamento`: Fila Viva do corretor.
- `/corretor`: tela do corretor.
- `/gestor/telemetria`: telemetria do gestor.
- `/checklist_documentos_upload_com_formulario.html?origem=corretor`: checklist do corretor convertido para rota React, carregando o formulario original sem alterar layout.

## Ultimas Mudancas Importantes

- Conversao da rota `checklist_documentos_upload_com_formulario.html` para React/Next em `src/app/checklist_documentos_upload_com_formulario.html/page.tsx`.
- A Fila Viva do corretor agora direciona ao checklist do corretor ao clicar no nome do cliente.
- Checklist do corretor recebeu o cabecalho com:
  - Timeline `Kit Caixa`.
  - Timeline `Kit Agehab`.
  - Dados do proponente no modelo visual solicitado.
- Foram adicionados botoes `Voltar`:
  - Checklist analista volta para `/analista`.
  - Checklist CCA volta para `/cca/acompanhamento`.
  - Checklist corretor volta para `/painel/acompanhamento`.
- Checklist do analista:
  - Possui combo `CCA Vinculado`.
  - Mostra downloads enviados pelo CCA nos documentos Caixa.
  - Se o status Caixa voltar para antes de `Emitindo Formularios`, alerta que os anexos serao perdidos e limpa os uploads.
- Checklist CCA:
  - Recebe dados do cliente por parametros.
  - Nao altera status Caixa/Agehab; apenas visualiza timeline.
  - Possui `Agencia Vinculada` com opcoes `1856` e `0972`.
  - Upload dos formularios Caixa aparece quando o status Caixa esta em `Emitindo Formularios`.
  - Cada documento enviado fica com status `Enviado` somente no item anexado.
- Documentos Caixa incluem:
  - `Cheque Especial`
  - `Cartao de Credito`

## Fluxos Atuais

- Corretor acessa a Fila Viva em `/painel/acompanhamento`.
- Ao clicar no nome do cliente, abre o checklist do corretor com `origem=corretor`, `cliente` e `reserva`.
- Analista acessa `/analista/checklist` para revisar documentos, status Caixa/Agehab e downloads do CCA.
- CCA acessa `/cca/acompanhamento` e abre `/cca/checklist` pelo nome do cliente.
- Uploads e status temporarios sao compartilhados via `localStorage`.

## Regras Proibidas Sem Autorizacao

- Nao alterar layout, cores, tamanhos, espacamentos ou posicao de elementos sem pedido direto.
- Nao mexer na tela do analista quando a solicitacao for para CCA, corretor ou outra tela.
- Nao mexer no card/tela usada como modelo; apenas copiar o padrao quando pedido.
- Nao remover checklist, timeline, documentos ou campos que nao foram explicitamente pedidos.
- Nao trocar combobox entre telas.
  - Analista usa `CCA Vinculado`.
  - CCA usa `Agencia Vinculada`.
- Nao criar botoes extras sem autorizacao.
- Nao mover blocos de lugar sem pedido claro.
- Nao alterar regras de upload/download sem pedido claro.
- Nao mudar nomes, textos ou capitalizacao fora do escopo pedido.
- Nao refatorar o projeto inteiro para resolver ajuste pequeno.
- Nao apagar arquivos antigos ou HTMLs de referencia sem autorizacao.

## Regra de Trabalho Recomendada

Antes de qualquer mudanca:

1. Identificar exatamente a tela pedida.
2. Alterar apenas o arquivo necessario.
3. Nao tocar no visual se a tarefa for regra/funcionalidade.
4. Rodar `npm run type-check`.
5. Conferir se o comportamento pedido foi aplicado sem alterar o resto.

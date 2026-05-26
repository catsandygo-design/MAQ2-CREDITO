# Documentacao para Backend FastAPI

Este documento descreve o contrato esperado entre o frontend Next.js e o backend FastAPI/Azure.

## Proxy do Frontend

Arquivo central:

`src/lib/api/proxy.ts`

O frontend consome a API exclusivamente por:

```ts
apiClient.get(path)
apiClient.post(path, body)
apiClient.put(path, body)
apiClient.delete(path)
```

Base URL:

```env
NEXT_PUBLIC_API_BASE_URL=https://sua-api.azurewebsites.net
```

Se `NEXT_PUBLIC_API_BASE_URL` estiver vazio, as chamadas usam o mesmo host do frontend.

## Telas Mapeadas

### Analista

Tela:

`src/app/analista/page.tsx`

Checklist:

`src/app/analista/checklist/page.tsx`

Link para checklist:

```txt
/analista/checklist?cliente={cliente}&reserva={reserva}
```

Consumos atuais:

```http
GET /api/processos/{reserva}
PUT /api/processos/{reserva}
GET /api/processos/{reserva}/uploads?grupo=caixa
DELETE /api/processos/{reserva}/uploads?grupo=caixa
PUT /api/processos/{reserva}/documentos/{documento_key}
PUT /api/processos/{reserva}/documentos/{documento_key}/pendencia
PUT /api/processos/{reserva}/relacionamento/{relacionamento_key}
```

### CCA

Tela:

`src/app/cca/acompanhamento/page.tsx`

Checklist:

`src/app/cca/checklist/page.tsx`

Link para checklist:

```txt
/cca/checklist?cliente={cliente}&reserva={reserva}&empreendimento={empreendimento}&corretor={corretor}&produto={produto}&sinal={sinal}&fiador={fiador}&caixa={caixa}&agehab={agehab}&view=web-cca-v2
```

Consumos atuais:

```http
POST /api/contexto
GET /api/processos/{reserva}
PUT /api/processos/{reserva}/documentos/{documento_key}
PUT /api/processos/{reserva}/documentos/{documento_key}/pendencia
PUT /api/processos/{reserva}/relacionamento/{relacionamento_key}
POST /api/processos/{reserva}/uploads
```

### Gestor

Tela:

`src/app/gestor/telemetria/page.tsx`

Checklist:

`src/app/gestor/checklist/page.tsx`

Link para checklist:

```txt
/gestor/checklist?cliente={cliente}&reserva={reserva}&empreendimento={empreendimento}&corretor={corretor}&produto={produto}&sinal={sinal}&fiador={fiador}&caixa={caixa}&agehab={agehab}&view=web-gestor-v1
```

Consumos atuais:

```http
GET /api/processos/{reserva}
PUT /api/processos/{reserva}/documentos/{documento_key}
PUT /api/processos/{reserva}/documentos/{documento_key}/pendencia
PUT /api/processos/{reserva}/relacionamento/{relacionamento_key}
POST /api/processos/{reserva}/uploads
```

### Corretor

Tela:

`src/app/painel/acompanhamento/page.tsx`

Checklist:

`src/app/painel/checklist-documentos/page.tsx`

Fluxo atual:

```txt
/checklist_documentos_upload_com_formulario.html?origem=corretor&cliente={cliente}&reserva={reserva}
```

Observacao: esta rota ainda atua como redirecionamento/compatibilidade para o formulario legado.

## Contratos de Endpoints

### GET /api/processos/{reserva}

Objetivo:

Carregar o estado completo do processo para preencher checklist e timeline.

Resposta esperada:

```json
{
  "reserva": "458712",
  "cliente": "MATHEUS ALVES",
  "caixa": "emitindo_formularios",
  "agehab": "reserva",
  "documentos": {
    "proponente.identidade": "Aprovado",
    "proponente.cpf": "Pendente",
    "caixa.damp": "Aguardando"
  },
  "relacionamento": {
    "portabilidade-caixa": "sim",
    "open-finance-caixa": "nao"
  },
  "uploadsCca": {
    "caixa.damp": {
      "name": "damp.pdf",
      "data": "https://storage.azure.com/container/damp.pdf"
    }
  },
  "uploadsEnviados": {
    "caixa.damp": true
  },
  "temDocumentoEnviado": true
}
```

Campos opcionais podem ser omitidos. O frontend preserva estado default quando o campo nao vem.

### PUT /api/processos/{reserva}

Objetivo:

Atualizar status macro do processo.

Payloads aceitos:

```json
{ "caixa": "formularios_assinados" }
```

```json
{ "agehab": "ficha_emitida" }
```

Resposta sugerida:

```json
{
  "ok": true,
  "reserva": "458712"
}
```

### PUT /api/processos/{reserva}/documentos/{documento_key}

Objetivo:

Atualizar status de um documento.

Exemplo de `documento_key`:

```txt
proponente.identidade
caixa.damp
agehab.ficha
```

Payload:

```json
{
  "status": "Aprovado"
}
```

Valores aceitos:

```txt
Aguardando
Pendente
Aprovado
Nao se Aplica
Bloqueado
```

Observacao: algumas telas ainda exibem texto com acentuacao corrompida herdada. O backend deve normalizar para uma forma canonica, preferencialmente `Nao se Aplica`.

### PUT /api/processos/{reserva}/relacionamento/{relacionamento_key}

Objetivo:

Atualizar perguntas de relacionamento bancario/produto.

Payload:

```json
{
  "status": "sim"
}
```

Valores aceitos:

```txt
sim
nao
Nao se Aplica
```

Chaves atuais:

```txt
portabilidade-caixa
open-finance-caixa
cpf-pix-caixa
fgts-futuro-orientado
fgts-compra-cliente
produto-orientado
```

### PUT /api/processos/{reserva}/documentos/{documento_key}/pendencia

Objetivo:

Salvar a descricao da pendencia e o prazo de resposta quando o analista/CCA/gestor marca um documento como `Pendente`.

O backend deve usar estes dados para alimentar o Card 1 das telas de acompanhamento, orientando todos os perfis envolvidos.

Payload:

```json
{
  "descricao": "RG ilegivel, reenviar documento com foto legivel.",
  "prazo": "2026-05-21T17:30",
  "documento": "proponente.identidade",
  "origem": "analista",
  "destinoCard": "card1"
}
```

Valores esperados em `origem`:

```txt
analista
cca
gestor
```

Resposta sugerida:

```json
{
  "ok": true,
  "reserva": "458712",
  "documento": "proponente.identidade",
  "card1Atualizado": true
}
```

### GET /api/processos/{reserva}/uploads?grupo=caixa

Objetivo:

Verificar anexos existentes antes de permitir regressao de etapa.

Resposta:

```json
{
  "temAnexoCaixa": true,
  "uploads": [
    {
      "key": "caixa.damp",
      "name": "damp.pdf",
      "url": "https://storage.azure.com/container/damp.pdf"
    }
  ]
}
```

### POST /api/processos/{reserva}/uploads

Objetivo:

Receber upload de documento.

Payload atual enviado pelo frontend:

```json
{
  "grupo": "caixa",
  "key": "caixa.damp",
  "name": "damp-20260521T173000-corretor.pdf",
  "data": "data:application/pdf;base64,..."
}
```

Recomendacao backend:

Aceitar este formato temporariamente e migrar depois para `multipart/form-data` com armazenamento em Azure Blob Storage.

Regra de nomeacao enviada pelo frontend:

```txt
{documento}-{dataHoraISOCompacta}-{corretor}.{extensao}
```

Exemplo:

```txt
identidade-20260521T173000-joao-silva.pdf
cpf-20260521T173245-maria-souza.jpg
```

Resposta sugerida:

```json
{
  "ok": true,
  "key": "caixa.damp",
  "name": "damp.pdf",
  "url": "https://storage.azure.com/container/damp.pdf"
}
```

### DELETE /api/processos/{reserva}/uploads?grupo=caixa

Objetivo:

Remover anexos Caixa quando o processo volta para etapa anterior a `emitindo_formularios`.

Resposta:

```json
{
  "ok": true
}
```

### POST /api/contexto

Objetivo:

Registrar contexto operacional da tela atual.

Payload:

```json
{
  "contexto": "cca"
}
```

Resposta:

```json
{
  "ok": true
}
```

## Status e Etapas

### Caixa

Valores usados no frontend:

```txt
reserva
em_analise_credito
emitindo_formularios
formularios_em_assinatura
formularios_assinados
envio_conformidade
```

Entradas legadas que devem ser aceitas e normalizadas:

```txt
Emitir Formularios -> emitindo_formularios
Emitindo Formularios -> emitindo_formularios
Em Analise Credito -> em_analise_credito
Formularios Em Assinatura -> formularios_em_assinatura
Formularios Assinados -> formularios_assinados
Envio a conformidade -> envio_conformidade
Reserva -> reserva
```

### Agehab

Valores usados no frontend:

```txt
reserva
em_analise_credito
ficha_emitida
ficha_recebida
em_validacao_agehab
agehab_validada
```

## Chaves de Documentos

### Proponente

```txt
proponente.identidade
proponente.cpf
proponente.estado-civil
proponente.residencia
proponente.fgts
```

### Dependente menor

```txt
depmenor.certidao
depmenor.cpf
```

### Dependente maior

```txt
depmaior.identidade
depmaior.estado-civil
depmaior.parentesco
```

### Renda CLT

```txt
rendaclt.holerite
rendaclt.carteira
```

### Renda informal

```txt
rendainf.extrato
rendainf.declaracao
```

### Caixa

```txt
caixa.damp
caixa.ficha
caixa.abertura
caixa.mo
caixa.cheque-especial
caixa.cartao-credito
```

### Agehab

```txt
agehab.decl-end
agehab.decl-renda
agehab.decl-naorenda
agehab.vinculo
agehab.check
agehab.ficha
```

## Recomendacoes Azure

Persistencia:

```txt
Azure SQL ou PostgreSQL: processos, status, relacionamento, auditoria
Azure Blob Storage: arquivos enviados
Azure App Service ou Container Apps: FastAPI
Application Insights: logs e traces
Managed Identity: acesso seguro a Storage/DB
```

Tabela sugerida `processos`:

```txt
reserva PK
cliente
caixa_status
agehab_status
produto
sinal
fiador
corretor
empreendimento
updated_at
```

Tabela sugerida `documentos_status`:

```txt
id PK
reserva FK
documento_key
status
updated_by
updated_at
```

Tabela sugerida `relacionamento_status`:

```txt
id PK
reserva FK
relacionamento_key
status
updated_by
updated_at
```

Tabela sugerida `uploads`:

```txt
id PK
reserva FK
grupo
documento_key
file_name
blob_url
content_type
created_by
created_at
```

## CORS

Permitir origem do frontend Vercel:

```txt
https://*.vercel.app
https://dominio-producao.com
http://localhost:3000
```

Headers:

```txt
Content-Type
Authorization
Accept
```

Metodos:

```txt
GET
POST
PUT
DELETE
OPTIONS
```

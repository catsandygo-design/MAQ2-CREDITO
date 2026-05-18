# Especificacao Tecnica: Workflow Bilateral de Validacao de Documentos

Este documento detalha o mapeamento de processos, a maquina de estados e a implementacao tecnica para o fluxo de documentos entre as interfaces do **Corretor** (ponta de envio) e do **Analista** (ponta de auditoria), usando **Next.js**, **React**, APIs do App Router e persistencia centralizada.

O ponto principal: nao estamos lidando apenas com um botao isolado. O fluxo e uma **maquina de estados compartilhada orientada a papeis**.

---

## 1. Visao Geral do Fluxo

O objetivo e garantir a integridade do processo de analise de credito, impedindo que o corretor altere documentos em auditoria e obrigando o analista a visualizar o arquivo antes de tomar uma decisao de aprovacao ou pendencia.

```text
[Corretor: IDLE] -> Upload -> [Corretor: TRAVADO]
                                      |
                                      v
[Analista: AGUARDANDO] ------> [Analista: ABRIR DOC] -> Fechar -> [Analista: COMBOBOX]
                                      |
                                      +-------------------------------------+
                                                                            |
                                                                            v
                                                                  (Se Pendente)
                                                              [Corretor: DESTRAVADO]
```

## 2. Explicacao Simples

Imagine uma caixa de correio entre o corretor e o analista:

- O corretor coloca o documento dentro da caixa.
- A porta do corretor trava e mostra "Enviado".
- A mesa do analista passa a mostrar "Abrir Documento".
- O analista abre, visualiza e fecha.
- Depois de fechar, aparecem duas opcoes:
  - Aprovado
  - Pendenciado
- Se o analista marcar pendenciado, a porta do corretor destrava para corrigir e reenviar.

## 3. Lógica Master: Causa e Efeito

O maior desafio e a **sincronizacao de estado assincrona**:

- O botao do analista depende de uma acao feita pelo corretor.
- O desbloqueio do corretor depende de uma decisao tomada pelo analista.
- Ambos precisam ler e escrever no mesmo estado central do documento.

Por isso, o status do documento deve ser validado no backend em toda acao. A interface so mostra ou oculta botoes, mas a regra de permissao real precisa ficar no servidor.

## 4. Maquina de Estados do Documento

| Status no Banco | Interface do Corretor | Interface do Analista | Permissao de Escrita |
| :--- | :--- | :--- | :--- |
| `IDLE` | Botao ativo: "Enviar Documento" | Texto: "Aguardando Envio..." | Corretor |
| `ENVIADO` | Travado: "Documento Enviado" | Botao ativo: "Abrir Documento" | Ninguem, em transito |
| `EM_ANALISE` | Travado: "Documento Enviado" | Documento aberto/visualizado | Analista em leitura |
| `PENDENTE` | Destravado: "Corrigir e Reenviar" | Select: "Pendente" | Corretor para correcao |
| `APROVADO` | Travado: "Documento Enviado" | Select: "Aprovado" | Ninguem, fluxo encerrado |

## 5. Estados por Papel

### Corretor

| Status | Comportamento |
| :--- | :--- |
| `IDLE` | Pode enviar documento |
| `ENVIADO` | Nao pode reenviar |
| `EM_ANALISE` | Nao pode alterar |
| `PENDENTE` | Pode corrigir e reenviar |
| `APROVADO` | Nao pode alterar |

### Analista

| Status | Comportamento |
| :--- | :--- |
| `IDLE` | Ve "Aguardando Envio" |
| `ENVIADO` | Ve "Abrir Documento" |
| `EM_ANALISE` | Pode visualizar documento |
| `PENDENTE` | Ve decisao ja tomada |
| `APROVADO` | Ve decisao ja tomada |

## 6. Requisitos Funcionais

- Duas interfaces distintas: Corretor e Analista.
- O corretor faz upload do documento.
- Apos upload bem-sucedido, o corretor fica bloqueado.
- O analista passa de `Aguardando` para `Abrir Documento`.
- O analista precisa abrir o documento antes de aprovar ou pendenciar.
- Apos fechar o visualizador, aparece o combobox de decisao.
- Opcoes do analista:
  - Aprovado
  - Pendenciado
- Se pendenciado, o corretor volta a poder enviar documento.
- Se aprovado, o documento encerra o fluxo de correcao.

## 7. Pontos Cegos e Riscos

### Fechamento do modal

Se o analista abrir o documento e fechar o navegador antes de decidir, o sistema nao pode quebrar o fluxo.

Opcoes:

- manter `viewed` apenas em memoria, obrigando nova visualizacao ao voltar;
- persistir `visualizado_em` no banco para liberar o combobox depois da primeira visualizacao;
- criar status intermediario `EM_ANALISE`.

Para operacao bancaria, a opcao mais auditavel e persistir:

- `visualizado_em`
- `visualizado_por`
- `decidido_em`
- `decidido_por`

### Seguranca e LGPD

O arquivo nao deve usar URL publica permanente.

Recomendacao:

- salvar em bucket privado;
- gerar URL assinada temporaria;
- validar permissao no backend antes de entregar a URL;
- registrar evento de visualizacao.

### Concorrencia

O backend precisa impedir:

- corretor reenviar enquanto status for `ENVIADO`, `EM_ANALISE` ou `APROVADO`;
- analista aprovar documento que ainda nao foi enviado;
- decisao duplicada sem regra de revisao;
- alteracao manual via console do navegador.

## 8. Backend Recomendado

Para este projeto em Vercel, a recomendacao principal e:

- **Supabase Postgres** para dados relacionais;
- **Supabase Storage** para documentos e formularios;
- **Supabase Realtime** para atualizar telas sem F5;
- **Next.js API Routes / Server Actions** para validar regras de negocio;
- **Vercel** para deploy e hosting.

Motivo:

- encaixa bem no Next.js;
- resolve banco, storage e realtime no mesmo ecossistema;
- e mais simples que montar WebSocket proprio;
- facilita auditoria e historico operacional.

## 9. Modelo Inicial de Banco

### Tabela `processos`

```sql
create table processos (
  id uuid primary key default gen_random_uuid(),
  reserva text not null,
  cliente_nome text not null,
  corretor_id uuid,
  analista_id uuid,
  cca_id uuid,
  status text not null default 'aguardando_upload_corretor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Tabela `documentos`

```sql
create table documentos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos(id),
  nome text not null,
  categoria text not null,
  status text not null default 'IDLE',
  storage_path text,
  pendencia text,
  enviado_por uuid,
  enviado_em timestamptz,
  visualizado_por uuid,
  visualizado_em timestamptz,
  decidido_por uuid,
  decidido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Tabela `eventos_workflow`

```sql
create table eventos_workflow (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos(id),
  documento_id uuid references documentos(id),
  ator_id uuid,
  ator_papel text not null,
  acao text not null,
  status_anterior text,
  status_novo text,
  observacao text,
  created_at timestamptz not null default now()
);
```

## 10. API Recomendada

### Upload do corretor

```http
POST /api/processos/:processoId/documentos/:documentoId/upload
```

Responsabilidade:

- validar papel `corretor`;
- validar status `IDLE` ou `PENDENTE`;
- salvar arquivo no storage;
- atualizar documento para `ENVIADO`;
- bloquear novo upload;
- registrar evento.

### Visualizacao do analista

```http
POST /api/processos/:processoId/documentos/:documentoId/visualizar
```

Responsabilidade:

- validar papel `analista`;
- validar status `ENVIADO`;
- registrar `visualizado_em`;
- opcionalmente mudar status para `EM_ANALISE`;
- devolver URL assinada temporaria.

### Decisao do analista

```http
PATCH /api/processos/:processoId/documentos/:documentoId/status
```

Body:

```json
{
  "status": "APROVADO",
  "observacao": ""
}
```

ou:

```json
{
  "status": "PENDENTE",
  "observacao": "Documento ilegivel. Reenviar comprovante atualizado."
}
```

Responsabilidade:

- validar papel `analista`;
- validar que o documento foi visualizado;
- atualizar para `APROVADO` ou `PENDENTE`;
- se `PENDENTE`, liberar reenvio para o corretor;
- registrar evento.

## 11. Componentes de Interface

### Lado do Corretor (`ButtonCorretor.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { Lock, Upload } from 'lucide-react';

interface CorretorProps {
  initialStatus: 'IDLE' | 'ENVIADO' | 'PENDENTE' | 'APROVADO';
  documentId: string;
}

export default function ButtonCorretor({ initialStatus, documentId }: CorretorProps) {
  const [status, setStatus] = useState(initialStatus);

  const handleUploadSimulado = async () => {
    setStatus('ENVIADO');

    await fetch(`/api/documents/${documentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ENVIADO' }),
    });
  };

  if (status === 'ENVIADO' || status === 'APROVADO') {
    return (
      <button
        disabled
        className="w-full max-w-xs flex items-center justify-center gap-2 bg-zinc-700 text-zinc-400 py-3 rounded-lg font-medium cursor-not-allowed"
      >
        <Lock className="w-4 h-4" />
        <span>Documento Enviado</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleUploadSimulado}
      className="w-full max-w-xs flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
    >
      <Upload className="w-4 h-4" />
      <span>{status === 'PENDENTE' ? 'Corrigir e Reenviar Doc' : 'Enviar Documento'}</span>
    </button>
  );
}
```

### Lado do Analista (`ButtonAnalista.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { Eye, Hourglass } from 'lucide-react';

interface AnalistaProps {
  initialStatus: 'IDLE' | 'ENVIADO' | 'PENDENTE' | 'APROVADO';
  documentId: string;
  fileUrl: string;
}

export default function ButtonAnalista({ initialStatus, documentId, fileUrl }: AnalistaProps) {
  const [status, setStatus] = useState(initialStatus);
  const [showModal, setShowModal] = useState(false);
  const [viewed, setViewed] = useState(false);

  const handleCloseModal = () => {
    setShowModal(false);
    setViewed(true);
  };

  const handleDecision = async (decision: 'APROVADO' | 'PENDENTE') => {
    setStatus(decision);

    await fetch(`/api/documents/${documentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: decision }),
    });
  };

  if (status === 'IDLE') {
    return (
      <div className="flex items-center gap-2 text-zinc-500 bg-zinc-100 px-4 py-3 rounded-lg border border-zinc-200 w-full max-w-xs justify-center font-medium">
        <Hourglass className="w-4 h-4 animate-pulse" />
        <span>Aguardando Envio...</span>
      </div>
    );
  }

  if (viewed || status === 'APROVADO' || status === 'PENDENTE') {
    return (
      <div className="flex flex-col gap-1 w-full max-w-xs">
        <label className="text-xs font-semibold text-zinc-500">Definir Status do Documento:</label>
        <select
          value={status}
          onChange={(event) => handleDecision(event.target.value as 'APROVADO' | 'PENDENTE')}
          className="w-full bg-white border-2 border-zinc-300 rounded-lg px-3 py-2.5 font-medium text-zinc-800 focus:border-indigo-500 outline-none transition-colors"
        >
          <option value="ENVIADO" disabled>Selecione uma acao...</option>
          <option value="APROVADO">Aprovar Documento</option>
          <option value="PENDENTE">Apontar Pendencia</option>
        </select>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full max-w-xs flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium shadow-sm transition-colors"
      >
        <Eye className="w-4 h-4" />
        <span>Abrir Documento</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-zinc-50 rounded-t-xl">
              <h3 className="font-bold text-zinc-800">Visualizando Documento</h3>
              <button
                onClick={handleCloseModal}
                className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Fechar e Avaliar
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-zinc-100 flex items-center justify-center min-h-[300px]">
              <div className="bg-white p-8 shadow-sm border rounded text-center text-zinc-600">
                Simulacao do Arquivo: {fileUrl}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

## 12. Realtime

Para que o analista veja o documento mudar de `Aguardando` para `Abrir Documento` sem atualizar a pagina, usar:

- Supabase Realtime escutando a tabela `documentos`;
- ou polling leve a cada poucos segundos;
- ou revalidacao por tag quando a arquitetura estiver em Server Components.

Recomendacao para a primeira versao operacional:

- implementar polling simples nas telas;
- depois evoluir para Supabase Realtime.

## 13. Relacao com BPMN

Esse tipo de controle segue uma logica parecida com BPMN (Business Process Model and Notation), comum em sistemas bancarios:

- uma ponta envia;
- a outra ponta analisa;
- a decisao muda o estado;
- o estado controla permissao;
- o historico precisa ser auditavel.

## 14. Proximo Passo no Projeto

1. Ajustar o modelo atual do backend para incluir status por documento:
   - `IDLE`
   - `ENVIADO`
   - `EM_ANALISE`
   - `PENDENTE`
   - `APROVADO`
2. Criar endpoint de visualizacao com URL assinada.
3. Conectar o checklist do corretor ao upload real.
4. Conectar a tela do analista aos documentos reais.
5. Trocar estados visuais:
   - `Aguardando`
   - `Abrir Documento`
   - `Aprovado/Pendenciado`
6. Persistir historico em `eventos_workflow`.

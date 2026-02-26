# Reformulacao do Fluxo de Credito (V2)

## 1. Objetivo
Redesenhar o fluxo para:
- remover acesso operacional do perfil corretor;
- acelerar cadastro inicial via planilha (Excel/CSV);
- simplificar analise documental;
- separar claramente fila Comercial e fila Repasse;
- manter rastreabilidade de cada mudanca.

---

## 2. Decisoes de produto

### 2.1 Acesso
- Perfil `corretor`: sem acesso ao sistema (rota inativa).
- Perfis ativos: `analista`, `cca/repasse`, `gestor`, `admin`.

### 2.2 Entrada de dados
- Entrada primaria por importacao de planilha.
- Campos minimos do arquivo:
  - `nome_cliente`
  - `data_cadastro`
  - `estagio`
  - `empreendimento`
  - `corretor`
  - `imobiliaria`

### 2.3 Checklist documental
- Substituir combo por 3 opcoes exclusivas:
  - `PENDENTE`
  - `APROVADO`
  - `NAO_APLICA`
- Regra obrigatoria:
  - Se status = `PENDENTE`, exigir `motivo_pendencia` (texto detalhado).

---

## 3. Modelo de estagios

## 3.1 Estagios oficiais (Comercial)
1. `RESERVA`
2. `EM_PROCESSO`
3. `CREDITO`
4. `SECRETARIA_VENDAS`
5. `ASSINATURA_DIRETORIA`
6. `AUTORIZACAO_DIRETORIA`
7. `ENVIO_SIENGE`
8. `VENDA_FINALIZADA`

### 3.2 Estagios da fila Repasse
1. `EM_REPASSE` (entra automaticamente ao chegar em `ASSINATURA_DIRETORIA`)
2. `INICIO_REPASSE` (analista concluiu formularios no CV)
3. `ASSINATURA_AUTORIZADA` (regra final de elegibilidade)

### 3.3 Regra de elegibilidade para `ASSINATURA_AUTORIZADA`
Avancar para `ASSINATURA_AUTORIZADA` quando:
- Comercial = `VENDA_FINALIZADA`
- E (`sinal` = `NAO_TEM` ou `PAGO`)
- E (`fiador` = `NAO_TEM` ou `APROVADO`)

---

## 4. Regras de negocio (resumo operacional)

### 4.1 Em Processo
- Cliente reservou e assinou contrato da empresa.
- Corretor enviou documentos por email.
- Auxiliar/analista valida documentacao e registra checklist.

### 4.2 Credito
- Analista classifica itens do checklist.
- Pendencias devem ter motivo claro para retorno rapido.

### 4.3 Secretaria de Vendas -> Diretoria -> Sienge
- Mudanca de estagio somente com historico (quem, quando, de/para, motivo).
- Cada troca de estagio deve gerar evento auditavel.

---

## 5. Fluxo de telas recomendado (cadastro rapido e intuitivo)

### 5.1 Tela 1: Importacao
- Upload de arquivo (`.csv`, `.xlsx`).
- Preview de linhas + validacoes (antes de gravar).
- Mostrar erros por linha (ex.: estagio invalido, data invalida, nome vazio).
- Acao final: `Importar lote`.

### 5.2 Tela 2: Fila Comercial
- Lista com filtros rapidos:
  - estagio
  - empreendimento
  - corretor
  - imobiliaria
  - periodo de cadastro
- Clique no cliente abre detalhe com dados ja importados.

### 5.3 Tela 3: Analise documental
- Tabela de documentos com 3 opcoes exclusivas por item.
- Se `PENDENTE`, abrir campo de motivo na mesma linha.
- Botao de salvar por bloco + autosave opcional.

### 5.4 Tela 4: Fila Repasse
- Card/lista separada da Comercial.
- Status proprio do Repasse (`EM_REPASSE`, `INICIO_REPASSE`, `ASSINATURA_AUTORIZADA`).
- Alerta de bloqueio quando regra de sinal/fiador nao estiver atendida.

---

## 6. Estrutura de dados sugerida

### 6.1 Entidades
- `cliente` (dados base da planilha)
- `processo` (estagio comercial + etapa repasse + flags)
- `documento_checklist` (status e motivo por documento)
- `historico_processo` (auditoria de mudancas)
- `import_lote` e `import_item` (controle de importacao)

### 6.2 Campos novos importantes
- `processo.fila_atual` (`COMERCIAL` | `REPASSE`)
- `processo.etapa_repasse`
- `processo.data_cadastro_origem`
- `documento_checklist.motivo_pendencia` (obrigatorio quando pendente)

---

## 7. Validacoes obrigatorias no backend
- Nao aceitar estagio fora da tabela oficial.
- Nao aceitar `PENDENTE` sem motivo.
- Nao permitir avancar para `ASSINATURA_AUTORIZADA` sem regra de sinal/fiador.
- Todo update deve gravar historico.

---

## 8. KPIs para gestao
- Tempo medio por estagio (Comercial e Repasse).
- Taxa de pendencia por documento.
- Tempo medio para resolver pendencia.
- Conversao `EM_PROCESSO -> VENDA_FINALIZADA`.
- Volume em gargalo por etapa.

---

## 9. Plano de implementacao recomendado
1. Congelar acesso corretor (feito).
2. Criar importador de planilha com preview e validacao.
3. Refatorar checklist para 3 opcoes + motivo obrigatorio.
4. Separar painel em duas filas (Comercial e Repasse).
5. Adicionar motor de transicoes + historico.
6. Revisar KPIs e dashboard do gestor.

---

## 10. Pontos para alinhamento com gestor (antes do desenvolvimento final)
- Chave unica do cliente na importacao (ideal: CPF; fallback: nome+empreendimento+data).
- Dicionario oficial de documentos do checklist.
- Quem pode alterar cada estagio (analista, repasse, gestor).
- SLA alvo por etapa (para alertas e priorizacao).

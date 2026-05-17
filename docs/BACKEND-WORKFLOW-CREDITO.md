# Backend do Workflow de Credito

## Objetivo

Controlar o fluxo real do Kit Caixa Reserva entre CV, corretor, analista, CCA e assinatura dos formularios.

## Fluxo principal

1. Cliente entra pelo CV e cria um processo no app.
2. Processo cai para o corretor com upload liberado.
3. Corretor faz upload da documentacao conforme perfil do cliente.
4. Depois do upload, o corretor fica bloqueado para novo envio.
5. Analista aprova ou pendencia a documentacao.
6. Se o analista pendenciar, o upload volta a ficar liberado para o corretor.
7. Se o analista aprovar, o processo vai para o CCA.
8. CCA valida ou pendencia a documentacao.
9. Se o CCA pendenciar, o upload volta a ficar liberado para o corretor.
10. Se o CCA aprovar, o CCA emite os formularios.
11. Corretor baixa os formularios pelo controle upload/download/status.
12. Corretor coleta assinatura do cliente e envia os formularios assinados.
13. Com todos os formularios assinados enviados, o processo finaliza como Kit Caixa Reserva.

## Status oficiais do processo

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

## Regras operacionais

- Corretor so envia documentos quando `uploadLiberadoCorretor = true`.
- Upload fica bloqueado apos envio do corretor.
- Analista pode liberar novo upload ao pendenciar documentos.
- CCA tambem pode liberar novo upload ao pendenciar documentos.
- CCA so emite formularios depois de aprovar a documentacao.
- Corretor baixa formularios emitidos e faz upload dos formularios assinados.
- Processo finaliza quando todos os formularios emitidos tiverem assinatura enviada.

## Rotas API criadas

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

## Proximo passo tecnico

Trocar o armazenamento temporario em memoria por Supabase:

- tabela `processos`
- tabela `documentos`
- tabela `formularios`
- tabela `eventos_workflow`
- bucket `documentos-processos`
- bucket `formularios-caixa`

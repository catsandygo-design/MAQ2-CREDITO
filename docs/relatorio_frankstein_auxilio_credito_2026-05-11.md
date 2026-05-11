# Relatorio - Como o Foguetinho auxilia o credito

Data: 11/05/2026

## 1. Papel do Foguetinho no credito

O Foguetinho atua como um operador logico supervisionado dentro do SioCred. Ele nao substitui o analista, o gestor ou a CCA. A funcao dele e ler o contexto do processo, aplicar regras objetivas, apontar risco, sugerir proximas acoes e registrar auditoria.

Na pratica, ele ajuda o credito a responder rapidamente:

1. O cliente pode avancar?
2. O que esta faltando?
3. Qual regra esta travando?
4. Qual a proxima acao mais segura?
5. Existe risco de retrabalho, pendencia ou retorno da CCA?

## 2. Onde ele auxilia hoje

### 2.1 Analise financeira

O Foguetinho compara a composicao financeira do processo:

- valor de venda;
- valor garantido;
- cheque moradia;
- faltante financeiro;
- renda informada;
- comprometimento;
- risco de pos-chaves em simulacao.

Exemplos de apoio:

- identifica quando a composicao nao sustenta o valor da venda;
- aponta falta de valor para fechar a operacao;
- sugere ajustar valor, garantido ou composicao;
- alerta quando o comprometimento pode gerar risco.

Regras relacionadas:

- `FRK-VALOR-001` - composicao financeira insuficiente;
- `FRK-SIM-001` - preco abaixo da politica comercial;
- `FRK-SIM-002` - IS pos-chaves igual/acima de 40%;
- `FRK-SIM-003` - IS pos-chaves entre 35% e 40%.

## 3. Renda e documentacao

O Foguetinho auxilia o credito conferindo se a renda e os documentos basicos sustentam o avanco do processo.

Hoje ele observa:

- renda informada;
- comprovante de renda;
- RG/CPF;
- comprovante de residencia;
- FGTS para perfil CLT;
- renda bruta duplicada entre clientes.

Exemplos de apoio:

- bloqueia ou alerta quando renda nao foi informada;
- bloqueia quando renda nao foi comprovada;
- alerta quando FGTS de CLT nao foi validado;
- destaca clientes com renda bruta identica com marcador `RD`;
- mostra no tooltip quais clientes possuem a mesma renda.

Regras relacionadas:

- `FRK-RENDA-001` - renda nao comprovada;
- `FRK-RENDA-002` - renda nao preenchida;
- `FRK-FGTS-001` - FGTS nao validado para CLT;
- validacao de renda duplicada implementada no painel do analista.

## 4. Dossie documental

O Foguetinho ajuda a reduzir retrabalho documental porque aponta pendencias antes do processo seguir.

Ele auxilia em:

- localizar documentos faltantes;
- separar documento pendente, aprovado, reprovado ou nao aplicavel;
- exigir motivo quando documento esta pendenciado ou reprovado;
- montar resumo de pendencias visiveis;
- evitar que o usuario avance sem tratar ponto obrigatorio.

Problemas que ele evita:

- enviar processo para CCA sem renda comprovada;
- deixar pendencia sem motivo;
- considerar documento oculto ou nao aplicavel como pendente;
- perder tempo procurando manualmente qual secao documental esta travando.

## 5. CCA, Caixa, Agehab, sinal e fiador

O Foguetinho auxilia no fluxo de credito e repasse lendo status criticos:

- status CCA/Caixa;
- status Agehab;
- sinal;
- fiador;
- etapa de repasse;
- assinatura autorizada.

Exemplos de apoio:

- impede assinatura quando Agehab nao esta validada;
- alerta quando sinal esta pendente;
- alerta quando fiador esta pendente;
- identifica pendencias de CCA ou Agehab;
- orienta se o processo pode ou nao entrar em assinatura.

Regras relacionadas:

- `FRK-ASS-001` - assinatura sem Agehab validada;
- `FRK-ASS-002` - assinatura com sinal pendente;
- `FRK-ASS-003` - assinatura com fiador pendente;
- `FRK-WF-001` - assinatura autorizada exige regras de elegibilidade.

## 6. SLA e fila operacional

O Foguetinho tambem ajuda na organizacao da rotina:

- calcula ou apoia leitura de SLA;
- identifica dono atual da pendencia;
- destaca processos em risco;
- ajuda a priorizar fila;
- aponta tarefas do dia.

No credito, isso serve para evitar que o analista perca processos parados ou processos que precisam de resposta rapida.

Regras relacionadas:

- `FRK-SLA-001` - owner de SLA por evento/status;
- status de pendencia por Caixa, Agehab, sinal e fiador;
- alertas de agenda por e-mail 5 minutos antes de tarefas/compromissos.

## 7. Alertas e agenda

O Foguetinho possui canal de alerta por e-mail para tarefas e compromissos.

Funcao no credito:

- lembrar tarefas do dia;
- avisar 5 minutos antes de compromisso;
- reduzir risco de esquecimento;
- manter decisao supervisionada pelo usuario.

Importante:

- o alerta apenas avisa;
- ele nao toma decisao sozinho;
- a acao continua sob responsabilidade do usuario.

## 8. Como ele reduz retrabalho

O Foguetinho reduz retrabalho porque verifica pontos que normalmente geram retorno:

1. Falta de documento.
2. Falta de comprovante de renda.
3. FGTS nao validado.
4. Renda nao preenchida.
5. Composicao financeira insuficiente.
6. Pendencia sem motivo.
7. Agehab nao validada.
8. Sinal ou fiador pendente.
9. Status CCA inconsistente.
10. Renda bruta identica entre clientes.

O ganho pratico e fazer o erro aparecer antes do envio, nao depois que o processo volta.

## 9. Como ele ajuda o gestor de credito

Para o gestor, o Foguetinho pode apoiar:

- leitura de gargalos;
- processos em risco;
- retrabalho por corretor;
- retrabalho por documento;
- pendencias recorrentes;
- tempo medio por etapa;
- acuracia das recomendacoes;
- comparacao entre casos semelhantes.

Isso transforma o sistema em uma ferramenta de gestao, nao apenas uma tela de cadastro.

## 10. Nivel de autonomia recomendado

O Foguetinho deve continuar supervisionado:

| Nivel | Funcao | Exemplo no credito |
| --- | --- | --- |
| 0 | Observa | Mostra que o processo esta sem pendencia critica. |
| 1 | Recomenda | Sugere ajustar valor, pedir renda ou validar FGTS. |
| 2 | Prepara acao | Monta texto de retorno ou resumo de pendencia para o analista confirmar. |
| 3 | Executa acao reversivel | Atualiza prioridade derivada, registra evento, recalcula SLA. |
| 4 | Bloqueia regra objetiva | Impede avanco sem renda comprovada, motivo de pendencia, Agehab, sinal ou fiador quando obrigatorios. |

Ele nao deve:

- aprovar credito final sozinho;
- apagar dados;
- alterar regra oficial sem aprovacao;
- ignorar bloqueio objetivo;
- esconder motivo de decisao;
- substituir o julgamento humano em casos cinzentos.

## 11. Ganhos esperados para o credito

| Area | Ganho esperado |
| --- | --- |
| Analise | Menos erro manual e decisao mais padronizada. |
| Documentos | Menos envio incompleto e menos retorno. |
| CCA | Menos pendencia por falta de informacao basica. |
| Repasse | Menos assinatura travada por Agehab, sinal ou fiador. |
| Gestao | Mais visao de gargalo e prioridade. |
| Treinamento | Novos usuarios aprendem regra vendo a explicacao. |
| Auditoria | Decisoes ficam mais rastreaveis. |

## 12. Limites atuais

O Foguetinho ja ajuda, mas ainda precisa evoluir em alguns pontos:

- algumas regras ainda estao espalhadas entre backend e telas HTML;
- o motor de regras ainda nao e uma fonte unica versionada;
- o status `bloquear` existe no schema, mas a implementacao operacional atual ainda retorna principalmente `viavel` ou `ajustar`;
- o modelo preditivo ainda e bootstrap/sintetico, nao totalmente treinado por feedback real;
- a explicacao precisa aparecer de forma mais padronizada nas telas finais;
- falta backtesting simples para testar regra nova em processos antigos.

## 13. Proximos passos recomendados

1. Centralizar regras que ainda estao no HTML dentro do backend.
2. Criar painel lateral do Foguetinho na Analise do Cliente.
3. Exibir regra, motivo, campo afetado e acao sugerida.
4. Adicionar feedback humano: concordo, discordo, faltou regra, resolvido.
5. Fazer backtesting de regra antes de ativar.
6. Medir acerto: pendencia evitada, retorno CCA, tempo ate assinatura.
7. Evoluir o Foguetinho para recomendacao baseada em historico real.

## 14. Conclusao

O Foguetinho auxilia o credito como um supervisor operacional inteligente. Ele olha para financeiro, renda, documentos, CCA, Agehab, sinal, fiador, SLA e agenda para reduzir erro e mostrar a proxima acao.

O maior valor dele nao e "fazer tudo sozinho". O maior valor e evitar que o usuario avance no escuro.

Ele deve continuar com autonomia supervisionada: forte para alertar, explicar, organizar e bloquear regra objetiva; cauteloso para decisoes sensiveis.

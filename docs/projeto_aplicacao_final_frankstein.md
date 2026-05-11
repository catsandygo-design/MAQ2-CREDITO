# Projeto da Aplicacao Final - SioCred com Foguetinho Autonomo Supervisionado

## 1. Visao

Transformar o sistema atual em uma aplicacao final de credito, comercial e repasse com um motor inteligente central: o FOGUETINHO.

O FOGUETINHO nao deve ser apenas um validador de tela. Ele deve funcionar como uma camada de decisao supervisionada, capaz de:

- ler o contexto completo do cliente;
- aplicar regras de negocio oficiais;
- comparar casos semelhantes;
- sugerir decisoes;
- bloquear avanco quando houver risco objetivo;
- pedir confirmacao humana quando a decisao depender de criterio operacional;
- aprender com o retorno real do analista, CCA, gestor e resultado do processo.

Autonomia supervisionada significa que o FOGUETINHO pode agir, priorizar, alertar e recomendar, mas toda decisao sensivel deve ter rastreabilidade e possibilidade de revisao humana.

## 2. Principio do Produto Final

O sistema final deve ser organizado em torno de processos, nao em torno de telas soltas.

Cada cliente/processo deve ter:

- dados comerciais;
- dados financeiros;
- checklist documental;
- status Caixa/CCA;
- status Agehab;
- sinal e fiador;
- historico de eventos;
- SLA;
- recomendacoes do FOGUETINHO;
- decisao humana;
- resultado final.

O objetivo e reduzir retrabalho, acelerar analise, padronizar decisao e dar clareza gerencial.

## 3. Arquitetura Alvo

### 3.1 Camadas

1. **Interface**
   - React como frontend principal.
   - HTML legado mantido temporariamente apenas durante migracao.

2. **API**
   - FastAPI como backend central.
   - Rotas antigas preservadas ate a migracao acabar.

3. **Banco**
   - Processos, clientes, documentos, historico, eventos e regras.
   - Eventos do FOGUETINHO salvos de forma auditavel.

4. **Motor de Regras**
   - Regras deterministicas versionadas.
   - Toda regra deve ter identificador, descricao, severidade, efeito e origem.

5. **FOGUETINHO Supervisionado**
   - Usa regras deterministicas como base obrigatoria.
   - Usa historico e padroes para recomendacao.
   - Gera explicacao da decisao.
   - Aprende com feedback real.

6. **Camada GPT-like**
   - Nao substitui regra oficial.
   - Atua como interpretador, explicador e comparador de contexto.
   - Ajuda a transformar dados espalhados em leitura operacional.
   - Deve respeitar privacidade, permissoes, logs de auditoria e nunca executar regra por texto livre sem validacao deterministica.

## 4. Como o FOGUETINHO Deve Pensar

O FOGUETINHO deve seguir uma ordem fixa de raciocinio:

1. **Coletar contexto**
   - Cliente, empreendimento, corretor, renda, valor, documentos, status, historico e SLA.

2. **Normalizar dados**
   - Padronizar status, nomes, datas, valores e campos ausentes.

3. **Aplicar regras duras**
   - Bloqueios obrigatorios.
   - Exemplo: pendencia sem motivo, assinatura sem Agehab validada, status Caixa reprovado.

4. **Aplicar regras de atencao**
   - Riscos que nao bloqueiam, mas exigem ciencia humana.

5. **Comparar com historico**
   - Casos parecidos.
   - Documentos que costumam voltar.
   - Corretores/empreendimentos com maior retrabalho.

6. **Gerar recomendacao**
   - Avancar.
   - Ajustar documentos.
   - Ajustar valor.
   - Solicitar renda complementar.
   - Enviar para CCA.
   - Segurar processo.

7. **Definir nivel de autonomia**
   - Pode agir sozinho.
   - Pode sugerir.
   - Precisa de aprovacao.
   - Deve bloquear.

8. **Registrar auditoria**
   - Quais regras dispararam.
   - Quem confirmou ou ignorou.
   - Qual foi o resultado real.

## 5. Niveis de Autonomia Supervisionada

### Nivel 0 - Observador

O FOGUETINHO apenas mostra alertas e explicacoes.

Uso:
- inicio da implantacao;
- regras novas;
- telas ainda nao validadas.

### Nivel 1 - Recomendador

O FOGUETINHO sugere uma acao, mas o usuario decide.

Exemplos:
- sugerir FGTS futuro;
- recomendar renda complementar;
- indicar documento mais provavel de retorno.

### Nivel 2 - Executor com Confirmacao

O FOGUETINHO prepara a acao e pede confirmacao.

Exemplos:
- gerar texto de pendencia;
- preencher observacao sugerida;
- classificar motivo de retorno;
- montar checklist de envio para CCA.

### Nivel 3 - Executor Automatico Seguro

O FOGUETINHO executa sozinho apenas acoes reversiveis e de baixo risco.

Exemplos:
- atualizar prioridade da fila;
- marcar processo como "em risco" quando isso for campo derivado ou evento auditavel;
- gerar evento de auditoria;
- recalcular SLA;
- sugerir owner atual.

### Nivel 4 - Bloqueador

O FOGUETINHO impede avanco quando a regra for objetiva.

Exemplos:
- pendencia sem observacao;
- documento reprovado sem motivo;
- assinatura com Agehab nao validada;
- Caixa bloqueado ou reprovado;
- tentativa de assinatura sem sinal/fiador regular.

## 6. Regras Como Neuronios

Cada regra deve virar um "neuronio operacional".

Estrutura sugerida:

```json
{
  "id": "FRK-AGEHAB-001",
  "nome": "Teto Cheque Moradia",
  "categoria": "agehab",
  "condicao": {
    "campo": "renda_bruta",
    "operador": ">",
    "valor_ref": "3_salarios_minimos",
    "e": [
      {
        "campo": "unidade_retomada",
        "operador": "!=",
        "valor": "sim"
      }
    ]
  },
  "severidade": "bloqueio",
  "acao": "impedir_avanco",
  "mensagem": "Renda acima do teto para Cheque Moradia/Agehab quando a unidade nao e retomada.",
  "autonomia": 4,
  "fonte": "regra_operacional",
  "versao": "2026-05"
}
```

Observacao de engenharia: a condicao da regra deve ser representada por DSL/JSON validado, nunca por `eval` ou execucao dinamica de string.

Tipos de neuronios:

- Financeiro;
- Documental;
- CCA/Caixa;
- Agehab;
- Comercial;
- Repasse;
- SLA;
- Risco;
- Aprendizado;
- Auditoria.

## 7. Memoria do FOGUETINHO

O FOGUETINHO precisa de memoria operacional, nao apenas regra fixa.

### 7.1 Memoria curta

Contexto do processo atual:

- dados do cliente;
- documentos visiveis;
- campos preenchidos;
- status atual;
- pendencias abertas;
- recomendacao gerada.

### 7.2 Memoria historica

Base de eventos:

- recomendacoes anteriores;
- decisoes humanas;
- resultado real;
- tempo ate assinatura;
- retorno da CCA;
- pendencias recorrentes;
- documentos mais problematicos.

### 7.3 Memoria de regras

Repositorio versionado:

- regras ativas;
- regras em teste;
- regras desativadas;
- origem da regra;
- data de mudanca;
- responsavel pela aprovacao.

## 8. Telas Finais Recomendadas

### 8.1 Login

Entrada unica por perfil.

### 8.2 Home por Perfil

Direciona o usuario para o que importa:

- Analista: fila de analise.
- Gestor: indicadores e gargalos.
- CCA/Repasse: fila tecnica.
- Admin: configuracoes e regras.

### 8.3 Central Operacional

Unifica:

- painel analista;
- acompanhamento;
- acompanhamento operacional;
- gargalos;
- SLA;
- prioridades.

Abas sugeridas:

- Agora;
- Comercial;
- Credito;
- Documentos;
- Repasse;
- Risco;
- SLA.

### 8.4 Analise do Cliente

Tela central do processo.

Deve conter:

- dados do cliente;
- dados financeiros;
- checklist documental;
- status Caixa;
- status Agehab;
- sinal;
- fiador;
- observacao;
- historico;
- painel FOGUETINHO.

### 8.5 Dossie Documental

Modulo unico, incorporado na Analise do Cliente.

Status simplificados:

- Pendente;
- Aprovado;
- Nao aplica.

Quando pendente, motivo obrigatorio.

Observacao de compatibilidade: essa simplificacao deve ser de interface. O backend ainda pode manter status internos como `ENVIADO`, `AGUARDANDO_ENVIO`, `ANALISE`, `PENDENCIADO` e `REPROVADO`, desde que exista mapeamento claro entre status operacional e status exibido ao usuario.

### 8.6 Importacao

Entrada oficial de dados por planilha.

Precisa ter:

- preview;
- validacao por linha;
- erros antes de gravar;
- historico do lote.

### 8.7 Repasse

Fila tecnica separada, mas conectada ao processo.

Foco:

- CCA;
- Agehab;
- assinatura;
- sinal;
- fiador;
- etapa de repasse.

### 8.8 Gestor Credito

Painel de decisao.

Indicadores:

- gargalo por etapa;
- retrabalho por corretor;
- retorno CCA;
- pendencias Agehab;
- tempo medio por etapa;
- processos em risco;
- acuracia do FOGUETINHO.

### 8.9 Motor de Regras

Tela nova.

Permite:

- listar regras;
- ativar/desativar;
- ver versao;
- ver impacto;
- simular regra em um processo;
- aprovar regra nova.

### 8.10 Treinamento do FOGUETINHO

Tela nova.

Permite ao usuario dizer:

- acertou;
- errou;
- exagerou;
- faltou regra;
- recomendacao util;
- recomendacao ignorada.

Esse feedback alimenta o aprendizado supervisionado.

## 9. Telas Candidatas a Consolidacao

### Unificar

- `analista_painel`
- `analista_acompanhamento`
- `analista_acompanhamento_operacional`

Destino:

- Central Operacional.

### Unificar

- `analista_crm`
- `analista_reuniao_comercial`

Destino:

- Relacionamento Comercial.

### Incorporar

- `checklist`
- parte documental de `analista`

Destino:

- Dossie Documental dentro da Analise do Cliente.

### Avaliar desativacao

- Telas de corretor, se a regra de produto continuar sendo "corretor sem acesso operacional".
- `cockpit-operacional`, se continuar usando dados mockados.

Observacao de produto: a documentacao V2 afirma que o corretor deve ficar sem acesso ao sistema. Qualquer portal de corretor so deve permanecer se houver decisao formal de produto alterando essa premissa, preferencialmente limitado a pre-cadastro/showroom e sem operacao de credito.

## 10. Comparativo com Tecnologia GPT

Um modelo como GPT trabalha com:

- contexto;
- memoria de conversa ou recuperacao de informacao;
- instrucoes;
- ferramentas;
- avaliacao de resposta;
- supervisao humana;
- historico de feedback.

O equivalente no SioCred deve ser:

- contexto do processo;
- memoria dos eventos;
- regras documentadas;
- ferramentas de acao no sistema;
- avaliacao do resultado real;
- confirmacao do analista;
- historico de aprendizagem.

O FOGUETINHO nao deve "inventar regra". Ele deve:

- recuperar a regra certa;
- aplicar ao caso certo;
- explicar o motivo;
- perguntar quando faltar informacao;
- registrar o que aconteceu;
- aprender com a decisao confirmada.

## 11. Guardrails Obrigatorios

O FOGUETINHO nunca deve:

- aprovar processo final sozinho;
- apagar dados;
- alterar regra oficial sem aprovacao;
- ignorar bloqueio objetivo;
- ocultar regra disparada;
- tomar decisao sensivel sem historico;
- substituir responsabilidade humana em casos cinzentos.

O FOGUETINHO pode:

- priorizar fila;
- sugerir acao;
- bloquear erro objetivo;
- gerar observacao sugerida;
- classificar risco;
- pedir informacao ausente;
- comparar caso com historico;
- registrar evento.

## 12. Roadmap de Implantacao

### Fase 1 - Consolidacao

- Criar inventario unico de regras.
- Marcar cada regra como executavel, documentada, duplicada ou obsoleta.
- Definir telas finais.
- Definir status oficiais.

### Fase 2 - Motor de Regras

- Transformar regras em objetos versionados.
- Criar endpoint unico para avaliar processo.
- Retornar regras disparadas, severidade e recomendacao.

### Fase 3 - FOGUETINHO Supervisionado

- Criar painel de decisao no processo.
- Registrar feedback do usuario.
- Criar explicacao por regra.
- Classificar autonomia por nivel.

### Fase 4 - Aprendizado Real

- Usar eventos historicos.
- Medir acerto.
- Medir retrabalho evitado.
- Treinar modelo com dados reais.
- Promover modelo somente com criterio de qualidade.

### Fase 5 - Produto Final

- Migrar telas principais para React.
- Desativar telas duplicadas somente depois de paridade funcional, testes e rota de rollback.
- Integrar dashboards.
- Manter HTML legado apenas como fallback temporario.

## 13. Indicadores de Sucesso

- Reducao de pendencias sem motivo.
- Reducao de retorno CCA.
- Reducao de tempo medio ate assinatura.
- Aumento de processos sem retrabalho.
- Aumento da acuracia das recomendacoes.
- Maior velocidade de treinamento de novos analistas.
- Menos divergencia entre analistas.

## 14. Decisao Recomendada

Antes de programar novas telas, o proximo passo deve ser criar a matriz:

| Regra | Origem | Executa hoje | Deve executar | Autonomia | Tela afetada |
| --- | --- | --- | --- | --- | --- |

Essa matriz vira o mapa neural do FOGUETINHO.

Depois disso, a implementacao deve comecar pelo motor unico de avaliacao do processo.

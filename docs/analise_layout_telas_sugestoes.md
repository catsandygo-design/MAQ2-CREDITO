# Analise de Layout das Telas - SioCred

## 1. Objetivo

Avaliar o layout atual das telas do SioCred como designer de produto, analista de software e engenheiro de aplicativos, propondo melhorias sem alterar o sistema.

Esta analise considera:

- documentacao existente;
- telas HTML legadas;
- telas React ja iniciadas;
- consistencia visual;
- usabilidade operacional;
- duplicidade de fluxos;
- evolucao para aplicacao final com FOGUETINHO supervisionado.

## 2. Diagnostico Geral

O sistema ja tem uma identidade visual profissional, principalmente nas telas do ecossistema do analista. O arquivo `web/theme_techboard.css` cria uma base corporativa consistente com tons claros, cards, botoes, pills, status e KPIs.

O principal problema nao e visual isolado. O problema e de arquitetura de experiencia:

- muitas telas fazem partes parecidas do mesmo trabalho;
- a navegacao muda de formato entre telas;
- algumas telas sao operacionais, outras parecem painel gerencial, outras parecem formulario;
- ha coexistencia de HTML legado, React em migracao e cockpit separado;
- o FOGUETINHO aparece como componente forte, mas ainda nao organiza a experiencia inteira.

## 3. Leitura por Perfil

### 3.1 Analista

Telas relacionadas:

- `analista_painel.html`
- `analista.html`
- `analista_acompanhamento.html`
- `analista_acompanhamento_operacional.html`
- `analista_reuniao_comercial.html`
- `analista_repasse.html`
- `analista_crm.html`
- `analista_importacao.html`
- `analista_arquivados.html`

Problema principal:

O analista tem muitas portas de entrada. Isso aumenta a carga mental e dificulta saber onde agir primeiro.

Sugestao:

Criar uma experiencia central chamada **Central Operacional**, com abas internas:

- Agora;
- Comercial;
- Credito;
- Documentos;
- Repasse;
- SLA;
- Arquivados.

As telas atuais podem continuar existindo tecnicamente, mas o produto final deve parecer uma unica central.

### 3.2 Gestor

Telas relacionadas:

- `gestor.html`
- `gestor_credito.html`
- `frontend-react/src/pages/GestorDashboardPage.tsx`

Ponto positivo:

O gestor ja tem uma boa direcao visual em React, com dashboard mais rico e indicadores executivos.

Problema:

Ainda ha divisao entre gestor comercial, gestor de credito e dashboard React. Essa separacao pode fazer o gestor procurar indicador em varias telas.

Sugestao:

Unificar em **Dashboard Executivo**, com seletor de visao:

- Comercial;
- Credito;
- Repasse;
- Corretor;
- Empreendimento;
- FOGUETINHO.

### 3.3 CCA / Repasse

Telas relacionadas:

- `cca.html`
- `cca_analise.html`
- `analista_repasse.html`

Problema:

CCA e Repasse aparecem como dominios proximos, mas separados por telas com padroes diferentes.

Sugestao:

Criar uma **Fila Tecnica** com shell visual compartilhado, mantendo permissoes e responsabilidades separadas por perfil. Cada processo deve mostrar:

- status CCA;
- status Agehab;
- etapa de repasse;
- bloqueios de assinatura;
- checklist tecnico;
- proxima acao recomendada.

### 3.4 Corretor

Telas relacionadas:

- `corretor_painel.html`
- `corretor_precadastro.html`
- `corretor_apresentacao.html`

Conflito com a documentacao:

A documentacao V2 recomenda remover acesso operacional do corretor. Mesmo assim, existem telas ativas de corretor.

Sugestao:

Tomar uma decisao de produto:

- Se corretor nao deve acessar: transformar essas telas em fluxo interno ou desativar gradualmente.
- Se corretor deve acessar apenas pre-cadastro/showroom: deixar isso como portal externo simples, sem operacao de credito.

## 4. Diagnostico Visual

### 4.1 Pontos Positivos

- O tema corporativo claro passa profissionalismo.
- KPIs, cards e pills tornam os status escaneaveis.
- Telas do analista ja compartilham parte da mesma linguagem.
- O painel React do gestor tem estrutura mais moderna.
- A tela do analista com FOGUETINHO tem potencial forte de produto.

### 4.2 Pontos de Atencao

- Ha excesso de cards em algumas telas.
- Nem toda tela usa a mesma navegacao.
- Alguns titulos competem entre si por importancia.
- Muitas telas tentam ser dashboard e formulario ao mesmo tempo.
- Algumas telas HTML sao muito grandes, o que dificulta manutencao.
- O usuario pode se perder entre Painel, Acompanhamento, Operacional, CRM e Reuniao Comercial.

### 4.3 Melhorias Visuais Recomendadas

1. **Padronizar shell da aplicacao**
   - Uma barra lateral ou topo unico.
   - Mesmo lugar para perfil, logout, troca de tela e busca.

2. **Reduzir card dentro de card**
   - Usar cards apenas para entidades repetidas, KPIs ou blocos realmente separados.
   - Formularios longos devem usar secoes limpas, nao muitos blocos concorrentes.

3. **Criar hierarquia fixa**
   - H1: nome da tela.
   - H2: secao principal.
   - H3: bloco interno.
   - KPI: numero e label curta.

4. **Status por cor e texto**
   - Verde: pronto/aprovado.
   - Amarelo: atencao/pendente.
   - Vermelho: bloqueio/reprovado.
   - Azul: informativo/em analise.
   - A cor nao deve ser o unico sinal; sempre manter texto legivel e contexto de apoio.

5. **Densidade operacional**
   - Telas de trabalho devem ser mais densas e escaneaveis.
   - Evitar composicao com muito espaco vazio quando o usuario precisa comparar filas.

6. **Responsividade real**
   - Kanbans e tabelas precisam ter comportamento claro em notebook e mobile.
   - No mobile, priorizar lista vertical com filtros fixos.

## 5. Sugestao de Aplicacao Final

### 5.1 Navegacao Final

Menu principal recomendado:

- Inicio
- Central Operacional
- Analise do Cliente
- Importacao
- Fila Tecnica / Repasse
- Dashboard Executivo
- FOGUETINHO
- Admin

### 5.2 Telas Finais

#### Inicio

Resumo por perfil com prioridades do dia.

#### Central Operacional

Unifica painel do analista, acompanhamento e operacional.

Conteudo:

- processos que precisam de acao;
- SLA;
- dono atual;
- proxima etapa;
- bloqueios;
- recomendacao do FOGUETINHO.

#### Analise do Cliente

Tela mais importante do sistema.

Layout sugerido:

- coluna esquerda: dados do cliente e processo;
- centro: documentos e campos de analise;
- coluna direita: FOGUETINHO, bloqueios, historico e proximas acoes.

#### Importacao

Fluxo em etapas:

1. Upload;
2. Preview;
3. Validacao;
4. Correcao;
5. Confirmacao;
6. Resultado do lote.

#### Repasse

Kanban ou lista tecnica focada em assinatura:

- entrada no repasse;
- formularios;
- CCA;
- Agehab;
- sinal;
- fiador;
- assinatura autorizada.

#### Dashboard Executivo

Indicadores para gestor:

- volume por etapa;
- conversao;
- tempo medio;
- gargalos;
- retrabalho;
- pendencias por documento;
- retorno CCA;
- acuracia do FOGUETINHO.

#### FOGUETINHO

Centro de inteligencia:

- regras ativas;
- regras disparadas;
- aprendizado;
- feedback humano;
- simulador de decisao;
- auditoria.

## 6. Melhorias por Tela Atual

### `analista_painel.html`

Manter como base conceitual da Central Operacional.

Melhorias:

- reduzir blocos secundarios;
- destacar "o que precisa de acao agora";
- colocar filtros em faixa compacta;
- aproximar tarefas, SLA e processos em uma mesma leitura.

### `analista.html`

Manter como base da Analise do Cliente.

Melhorias:

- transformar FOGUETINHO em painel lateral fixo;
- separar melhor dados financeiros, documentos e status;
- reduzir rolagem longa;
- mostrar no topo a decisao atual: OK, Atencao ou Bloqueio.

### `analista_acompanhamento.html`

Unificar com Central Operacional.

Melhorias:

- manter kanban apenas como uma visualizacao;
- permitir alternar entre kanban e lista;
- destacar owner atual e SLA.

### `analista_acompanhamento_operacional.html`

Usar como inspiracao para a Central Operacional.

Melhorias:

- remover duplicidade com acompanhamento;
- transformar atalhos em acoes contextuais do processo.

### `analista_repasse.html`

Manter como tela propria, mas mais tecnica.

Melhorias:

- priorizar bloqueios de assinatura;
- deixar claro se o processo pode ou nao chegar em assinatura;
- mostrar CCA, Agehab, sinal e fiador como checklist de elegibilidade.

### `analista_crm.html`

Unificar com Reuniao Comercial.

Melhorias:

- deixar como relacionamento/comunicacao;
- mostrar compromissos, pendencias comerciais e retorno ao corretor.

### `analista_reuniao_comercial.html`

Unificar com CRM.

Melhorias:

- transformar em aba "Compromissos" dentro de Relacionamento Comercial.

### `analista_importacao.html`

Manter.

Melhorias:

- fluxo em etapas;
- validacao visual por linha;
- resumo antes de gravar;
- historico dos lotes importados.

### `analista_arquivados.html`

Manter.

Melhorias:

- filtros por motivo de arquivamento;
- indicador de processos que podem voltar;
- historico do motivo do arquivamento.

### `gestor.html` e `gestor_credito.html`

Unificar com dashboard React.

Melhorias:

- uma unica tela executiva;
- filtros por area;
- visao de gargalo;
- comparativo por periodo;
- explicacoes do FOGUETINHO para os indicadores.

### `checklist.html`

Incorporar na Analise do Cliente.

Melhorias:

- status simplificado na interface;
- motivo obrigatorio quando pendente;
- secoes recolhiveis;
- resumo automatico do que falta.

Observacao de engenharia: simplificar a interface nao significa apagar os status internos atuais. O sistema precisa manter mapeamento entre o status visto pelo usuario e os status do backend/documento.

### `cca.html` e `cca_analise.html`

Unificar visualmente em Fila Tecnica, com controle de acesso por perfil.

Melhorias:

- reduzir troca de tela;
- permitir decisao rapida;
- mostrar impacto no repasse e assinatura.

### Telas de corretor

Avaliar contra decisao V2.

Melhorias:

- se permanecerem, devem virar portal externo simples;
- se nao permanecerem, remover da navegacao operacional.

## 7. FOGUETINHO no Layout

O FOGUETINHO deve aparecer como copiloto operacional, nao como enfeite.

Em cada processo, ele deve mostrar:

- status geral;
- regras disparadas;
- bloqueios;
- sugestao de proxima acao;
- nivel de autonomia;
- campo que precisa de revisao;
- botao para "concordo", "ignorar com justificativa" ou "faltou regra".

Layout recomendado:

- painel lateral direito em desktop;
- bloco fixo superior em telas menores;
- cor por severidade;
- explicacao curta primeiro;
- detalhes expansivos depois.

## 8. Priorizacao das Melhorias

### Alta prioridade

- Unificar navegacao.
- Consolidar Central Operacional.
- Transformar Analise do Cliente na tela principal.
- Colocar FOGUETINHO como painel lateral de decisao.
- Simplificar checklist documental na camada de uso, preservando estados tecnicos necessarios.

### Media prioridade

- Migrar telas mais usadas para React.
- Unificar CRM e Reuniao Comercial.
- Unificar gestor comercial e gestor credito.
- Criar design tokens oficiais.

### Baixa prioridade

- Refinar animacoes.
- Melhorar microinteracoes.
- Reorganizar telas de corretor, dependendo da decisao de produto.

## 9. Riscos de UX

- Excesso de telas gera erro operacional.
- Muitos status parecidos geram interpretacao diferente entre analistas.
- Dashboards sem acao direta viram apenas consulta.
- FOGUETINHO sem explicacao pode perder confianca.
- FOGUETINHO com autonomia demais pode gerar medo operacional.

## 10. Recomendacao Final

O layout final deve deixar de ser um conjunto de paginas e virar uma aplicacao operacional guiada por decisao.

Direcao recomendada:

1. Uma navegacao unica.
2. Uma Central Operacional.
3. Uma Analise do Cliente como tela principal.
4. Um Dashboard Executivo consolidado.
5. Um FOGUETINHO visivel, explicavel e supervisionado.
6. Menos telas, mais contexto.

O ganho esperado e reduzir cliques, reduzir duvida, diminuir retrabalho e transformar as regras ja documentadas em uma experiencia pratica de decisao.

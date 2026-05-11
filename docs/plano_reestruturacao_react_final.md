# Plano de reestruturacao React final - SioCred

Backup criado antes desta etapa:

- Branch: `backup/pre-react-restructure-20260511-150004`
- Tag: `backup-pre-react-restructure-20260511-150004`

## Objetivo

Migrar o SioCred para uma aplicacao React final sem perder regras que hoje ainda vivem nas telas HTML legadas.

A direcao e:

1. React vira a entrada principal.
2. HTML legado fica como fallback temporario.
3. Nenhuma tela antiga sai do ar antes de haver paridade funcional.
4. Cada modulo React deve ter dono, finalidade, valor para usuario e comentarios de implementacao.

## Estrutura criada neste primeiro pacote

### `frontend-react/src/config/finalNavigation.ts`

Arquivo que documenta o mapa final do produto.

Cada modulo possui:

- chave interna;
- nome da tela;
- rota React;
- rota legada, quando ainda existe;
- status da migracao;
- dono operacional;
- proposta;
- valor para o usuario;
- comentarios de implementacao.

Status usados:

- `react-ready`: modulo ja tem tela React com dados reais.
- `react-structure`: modulo criado como estrutura React, ainda sem tela operacional completa.
- `legacy-bridge`: modulo ainda depende do HTML legado.

### `frontend-react/src/components/FinalAppShell.tsx`

Shell estrutural da aplicacao final.

Responsabilidades:

- validar sessao;
- mostrar usuario/perfil;
- centralizar navegacao final;
- permitir logout;
- servir como base para telas futuras.

Este shell evita que cada pagina recrie cabecalho, menu e leitura de sessao.

### `frontend-react/src/pages/FinalWorkspacePage.tsx`

Pagina de transicao para os modulos que ainda nao foram migrados totalmente.

Responsabilidades:

- mostrar o objetivo do modulo;
- mostrar valor para o usuario;
- listar comentarios para implementacao final;
- indicar se o modulo esta em React ou ainda depende do legado;
- oferecer atalho para a tela HTML quando ainda for necessario.

### `frontend-react/src/App.tsx`

Rotas React reorganizadas.

Novas rotas estruturais:

- `/inicio`
- `/central`
- `/analise`
- `/importacao`
- `/repasse`
- `/frankstein`
- `/admin`

Rotas produtivas ja existentes:

- `/analista`
- `/gestor`
- `/gestor-credito`
- `/apresentacao`

Pontes antigas mapeadas para React:

- `/analista/acompanhamento`
- `/analista/acompanhamento-operacional`
- `/analista/reuniao-comercial`
- `/analista/repasse`
- `/analista/importacao`
- `/analista/arquivados`

## Comentario por modulo final

### Inicio

Tela futura de entrada por perfil.

Deve mostrar:

- tarefas de hoje;
- alertas do Foguetinho;
- processos em risco;
- proximas acoes;
- atalhos por perfil.

### Central Operacional

Ja existe uma primeira versao React no painel do analista.

Deve absorver aos poucos:

- acompanhamento;
- operacional;
- arquivados;
- leitura de gargalos;
- fila viva.

### Analise do Cliente

Ainda depende do HTML legado.

Antes de migrar, precisa de contrato unico `ProcessoFull`, contendo:

- dados do cliente;
- dados financeiros;
- documentos;
- status Caixa/CCA;
- Agehab;
- sinal;
- fiador;
- historico;
- regras disparadas do Foguetinho.

### Importacao

Ainda depende do HTML legado.

Migracao deve preservar:

- upload;
- preview;
- validacao por linha;
- historico do lote;
- erros antes de gravar.

### Repasse

Ainda depende do HTML legado.

Migracao deve preservar:

- fila tecnica;
- CCA;
- Agehab;
- sinal;
- fiador;
- assinatura autorizada;
- bloqueios objetivos do Foguetinho.

### Gestor

Ja possui dashboard React com dados reais.

Evolucoes futuras:

- acuracia do Foguetinho;
- retrabalho evitado;
- pendencias por corretor;
- risco por etapa.

### Foguetinho

Modulo estrutural novo.

Deve virar a central de:

- regras;
- feedback humano;
- backtesting;
- autonomia supervisionada;
- auditoria de decisao.

### Admin

Ainda depende do HTML legado.

Migracao deve ser por blocos:

1. Status do sistema.
2. Alertas de e-mail.
3. Logs.
4. Usuarios.
5. Manutencao.

## Proxima etapa tecnica

1. Criar contrato `ProcessoFull`.
2. Migrar Analise do Cliente para React.
3. Criar painel lateral do Foguetinho.
4. Migrar Importacao.
5. Migrar Repasse.
6. Migrar Admin por blocos.

## Criterio para remover uma tela HTML

Uma tela HTML so deve sair do menu quando:

- a rota React consumir os mesmos dados;
- os botoes principais existirem em React;
- as permissoes forem equivalentes;
- os testes passarem;
- houver caminho de rollback;
- o usuario validar que a tela React nao perdeu regra operacional.

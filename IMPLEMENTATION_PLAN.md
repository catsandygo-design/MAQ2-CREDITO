# PROJECT_RULES.md — Guia para economizar tokens e organizar o Codex

## Objetivo

Este arquivo serve para orientar o Codex a trabalhar com menos contexto, menos retrabalho e mais precisão.

O Codex deve seguir este documento antes de criar, alterar ou refatorar qualquer arquivo do projeto.

---

## Stack principal

- React
- TypeScript
- Tailwind CSS
- Vite
- GitHub
- Deploy futuro na Vercel

---

## Regra principal para o Codex

Antes de alterar qualquer arquivo:

1. Ler este `PROJECT_RULES.md`.
2. Ler somente os arquivos necessários para a tarefa.
3. Não analisar o projeto inteiro sem necessidade.
4. Não refazer estrutura global sem autorização.
5. Não alterar arquivos fora do escopo pedido.
6. Sempre explicar quais arquivos pretende alterar antes de modificar.
7. Fazer mudanças pequenas e controladas.

---

## Estrutura ideal do projeto

```txt
src/
├── components/
│   ├── ui/
│   ├── cards/
│   ├── forms/
│   └── layout/
│
├── modules/
│   ├── dashboard/
│   ├── kanban/
│   ├── rating/
│   ├── aderencia-caixa/
│   ├── entrevista/
│   ├── clientes-risco/
│   └── repasse/
│
├── services/
├── hooks/
├── types/
├── utils/
├── constants/
├── layouts/
└── data/
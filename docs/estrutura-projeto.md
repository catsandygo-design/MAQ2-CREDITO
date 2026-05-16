# Estrutura Inicial do Projeto

## Stack
- Next.js
- TypeScript
- Tailwind
- Supabase
- Vercel

## Estrutura de Diretórios

```txt
sistema-credito/
├─ src/
│  ├─ app/
│  │  ├─ dashboard/
│  │  ├─ clientes/
│  │  ├─ kanban/
│  │  ├─ validacao/
│  │  └─ login/
│  │
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ dashboard/
│  │  ├─ kanban/
│  │  ├─ clientes/
│  │  └─ forms/
│  │
│  ├─ lib/
│  │  ├─ supabase/
│  │  ├─ api/
│  │  ├─ utils/
│  │  └─ constants/
│  │
│  ├─ services/
│  │  ├─ cliente/
│  │  ├─ dashboard/
│  │  ├─ kanban/
│  │  └─ validacao/
│  │
│  ├─ rules/
│  │  ├─ validarComprometimento.ts
│  │  ├─ validarOpenFinance.ts
│  │  ├─ validarPixCpf.ts
│  │  ├─ validarPortabilidade.ts
│  │  └─ calcularRisco.ts
│  │
│  ├─ hooks/
│  ├─ types/
│  └─ styles/
│
├─ database/
│  ├─ schema.sql
│  └─ migrations/
│
├─ prototipos-html/
│  ├─ dashboard.html
│  ├─ clientes.html
│  ├─ kanban.html
│  └─ validacao.html
│
├─ docs/
│  ├─ cronograma.md
│  ├─ regras-negocio.md
│  └─ arquitetura.md
│
├─ public/
├─ .env.local
├─ package.json
├─ tsconfig.json
└─ vercel.json
```

## Objetivo da Arquitetura

- Evitar código concentrado em um único arquivo
- Separar lógica de negócio da interface
- Facilitar manutenção
- Facilitar escalabilidade futura
- Permitir reaproveitamento de componentes
- Melhor performance na Vercel

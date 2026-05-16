# MAQ2-Credito Backend TypeScript

Backend TypeScript planejado para substituir gradualmente o backend monolitico atual, mantendo o foco operacional do MAQ2-Credito: processos, documentos, workflow, auditoria e Foguetinho supervisionado.

## Decisao Tecnica

- **TypeScript**: linguagem principal, com tipagem forte e suporte completo a orientacao a objeto.
- **NestJS**: estrutura modular baseada em classes, decorators, controllers, services, guards e dependency injection.
- **Prisma**: camada de banco tipada para PostgreSQL.
- **Zod**: validacao de variaveis de ambiente.
- **Jest + Supertest**: testes unitarios e HTTP.

## Principios

1. Nao recriar um core bancario generico.
2. Preservar o dominio real do MAQ2-Credito.
3. Manter regras auditaveis e explicaveis.
4. Separar dominio, aplicacao e infraestrutura.
5. Migrar por partes, sem quebrar o backend Python atual.

## Modulos Iniciais

- `health`: verificacao de vida da API.
- `processes`: contratos e fluxo basico de processos.
- `documents`: checklist documental com motivo obrigatorio quando pendente.
- `workflow`: regras de transicao, fila atual e elegibilidade de assinatura.
- `foguetinho`: motor supervisionado de avaliacao de regras.
- `audit`: contrato de eventos de auditoria.

## Comandos

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Variaveis

Crie `.env` a partir de `.env.example`.

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/maq2_credito
JWT_SECRET=change-me
```

## Roadmap de Migracao

1. Implementar contratos equivalentes aos fluxos principais.
2. Criar testes de workflow, documentos e Foguetinho.
3. Conectar PostgreSQL via Prisma.
4. Expor endpoints versionados em `/api/v1`.
5. Migrar o frontend React para consumir os novos endpoints por superficie.
6. Manter o FastAPI como legado ate haver paridade.

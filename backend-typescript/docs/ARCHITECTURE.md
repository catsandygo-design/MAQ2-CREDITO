# Arquitetura do Backend TypeScript

## Visao

O backend TypeScript nasce como uma camada nova e isolada para permitir migracao segura do backend atual. A arquitetura usa modulos orientados ao dominio do MAQ2-Credito, nao a nomes de telas.

## Camadas

- **Controllers**: recebem HTTP e delegam para services.
- **Services**: coordenam casos de uso.
- **Domain classes**: concentram regra pura e invariantes.
- **DTOs**: definem contratos externos.
- **Prisma**: persistencia PostgreSQL, sem regra de negocio dentro do ORM.

## Modulos

### Processes

Responsavel por cliente/processo, fila atual, estagio comercial e elegibilidade derivada.

### Documents

Responsavel pelo dossie documental. A primeira regra obrigatoria implementada e que documento pendenciado/reprovado exige motivo.

### Workflow

Responsavel por transicoes e assinatura autorizada. A regra inicial segue a documentacao:

- comercial em `VENDA_FINALIZADA`;
- Agehab validada;
- sinal `NAO_TEM` ou `PAGO`;
- fiador `NAO_TEM`, `APROVADO` ou `FINALIZADO`;
- Caixa em status pronto.

### Foguetinho

Responsavel por avaliacao explicavel e supervisionada. O primeiro corte implementa classes de regra para:

- `FRK-VALOR-001`;
- `FRK-DOC-001`;
- `FRK-RENDA-001`;
- `FRK-FGTS-001`.

### Audit

Contrato inicial para trilha de auditoria. Toda transicao sensivel deve gerar evento.

## Convencoes

- Classes de dominio nao devem depender de NestJS.
- Regras devem retornar explicacao operacional, nao texto tecnico.
- Toda regra bloqueante deve expor `code`, `message`, `affectedField` e `suggestedAction`.
- Novas regras do Foguetinho devem estender `FoguetinhoRule`.

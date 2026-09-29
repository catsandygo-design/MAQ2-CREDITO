# Portabilidade da ficha de reserva do Cliente Avanco para o MAQ2

## Decisao de arquitetura

O MAQ2 nao possui as entidades do Cliente Avanco (`organizations`,
`reservations`, `organization_members`) nem o modulo `backend/src/workflow.js`.
O processo persistido no MAQ2 e `public.fastapi_processos`, criado pelo legado
FastAPI. Por isso, a portabilidade sera feita por uma camada de governanca
propria, referenciada por `reserva`, sem substituir ou apagar registros
existentes.

## Impacto identificado antes da alteracao

| Area | Estado atual | Alteracao segura |
| --- | --- | --- |
| Processo | `fastapi_processos` sem perfil operacional | manter como origem da reserva e vincular novas entidades por `reserva` |
| Documentos | status/upload legados e tela com estado local/demonstracao | criar registros auditaveis de documento; a tela deve consultar a API |
| Pendencias | tabelas legadas sem responsavel/criticidade normalizados | criar `maq2_process_tasks` com dono, prazo, bloqueio e historico |
| Permissoes | token autenticado, sem RBAC de servidor | criar `maq2_user_roles` e politicas RLS por operacao |
| Auditoria | `log_eventos` sem before/after | criar `maq2_reservation_audit` por trigger |

## Limite de publicacao

As tabelas legadas publicas ainda nao podem ter RLS ativado em producao sem
primeiro cadastrar os perfis de todos os usuarios e migrar cada rota Node que
as acessa. A migracao nova protege somente os recursos novos e nao concede
acesso anonimo. A ativacao de RLS nas tabelas legadas deve ser uma mudanca
separada, testada com usuarios reais, para evitar indisponibilidade.

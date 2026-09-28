# Continuação — checklist e publicação

Data: 2026-09-25

## Estado confirmado

- A triagem Gemini está implementada no backend em `backend/app/routers/gemini.py`: identifica tipo, confere correspondência, aplica emissão máxima de 10 anos para documentos de identidade, maioridade na emissão, validade quando disponível e atualidade para documentos recentes.
- A chave Gemini foi configurada somente em `backend/.env.gemini`, que está ignorado pelo Git. A autenticação foi aceita; o teste recebeu `503` temporário de alta demanda do modelo.
- O novo componente `src/components/ChecklistAvanco.tsx` está acessível em `/checklist-novo` e na prévia de desenvolvimento `/dev/checklist-preview`.
- As telas operacionais usam o novo componente `ChecklistAvanco`:
  - `/painel/checklist-documentos`
  - `/analista/checklist`
  - `/cca/checklist`
  - `/gestor/checklist`
- O checklist novo respeita os perfis: corretor e gestor enviam; analista e CCA recebem uma visualização de revisão. A IA não aprova automaticamente: resultados aprovados permanecem como `AGUARDANDO APROVAÇÃO` e são persistidos como `Em analise`.

## Governança a preservar na substituição

1. Manter regras diferentes para corretor, analista, CCA e gestor.
2. Não aprovar automaticamente: resultado de IA deve ficar em revisão humana, exceto fluxo explicitamente autorizado.
3. Persistir status e trilha de auditoria por reserva/documento.
4. Manter autenticação Supabase no frontend e validação do token no backend.

## Bloqueios externos atuais

- A chave administrativa Supabase em `backend/.env` não é JWT e foi recusada com HTTP 401. A URL do projeto corresponde à do frontend, mas é necessária uma `SUPABASE_SERVICE_ROLE_KEY` válida para autenticar requisições do backend.
- Vercel CLI não está instalado, não há `.vercel/` vinculada e a sessão Vercel anterior estava desconectada. Não houve publicação.

## Próxima ação segura

Após receber a chave administrativa válida do Supabase e uma sessão/autorização Vercel, executar teste autenticado de upload e então publicar com as variáveis `VITE_*` no Vercel.

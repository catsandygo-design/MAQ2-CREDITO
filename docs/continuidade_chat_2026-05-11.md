# Continuidade do chat - 2026-05-11

Este arquivo guarda o resumo da conversa para retomarmos depois sem depender do historico do aplicativo.

## Estado do Git

- Branch: `main`
- Ultimo commit local e remoto: `b987678 Expose Foguetinho email settings shortcut`
- `HEAD`, `origin/main` e `origin/HEAD` estavam alinhados neste commit.
- Testes executados apos as mudancas principais: `python -m pytest -q` com `13 passed`.

## O que foi implementado

1. Foguetinho com alerta por e-mail para agenda operacional.
   - Endpoint automatico: `POST /app/api/frankstein/agenda/email-alertas/processar`
   - Workflow GitHub: `.github/workflows/frankstein-email-alerts.yml`
   - Envia alerta 5 minutos antes de tarefas/compromissos com horario.
   - Deduplicacao por `SistemaLog` para nao enviar varias vezes o mesmo alerta.

2. Painel Admin para configurar e testar e-mail do Foguetinho.
   - Arquivo: `web/admin.html`
   - Secao: `Foguetinho - Alertas por e-mail`
   - Campo de destinatarios.
   - Botao `Salvar e-mail`.
   - Botao `Testar envio`.
   - Status de SMTP, destinatario e janela.
   - Atalho no topo: `Configurar e-mail Foguetinho`.

3. Atalho no dashboard do gestor para usuario admin.
   - Arquivo: `frontend-react/src/pages/GestorDashboardPage.tsx`
   - Botao: `Admin / E-mail`
   - Direciona para `/app/admin#franksteinEmailAlerts`.

4. Remocao da comunicacao por WhatsApp no fluxo do Foguetinho.
   - A comunicacao oficial do Foguetinho deve ser por e-mail.
   - Ainda existem campos de contato `whatsapp` para leads/clientes, mas nao como canal de alerta do Foguetinho.

5. Keep alive do Render gratuito.
   - Workflow: `.github/workflows/keep-render-awake.yml`
   - Mantem o SioCred acordado entre 08:40 e 18:30 BRT.

6. Limpeza segura de arquivos no Git.
   - Backups antigos foram removidos do GitHub sem apagar do PC.
   - `.gitignore` atualizado para bloquear backups, bancos locais, logs e arquivos gerados.
   - Pastas `data/raw`, `data/processed` e `data/models` ficaram com `.gitkeep`.

## Configuracao pendente no Render

No print mais recente, o painel mostrou:

- Destinatario: OK
- Janela: 6 min
- SMTP: Pendente

Isso significa que o e-mail de destino ja esta salvo, mas o envio ainda nao funciona ate configurar SMTP no Render.

Para Gmail, configurar no Render:

```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=frank.siocred@gmail.com
EMAIL_SMTP_PASSWORD=SENHA_DE_APP_DO_GOOGLE
EMAIL_SMTP_FROM=frank.siocred@gmail.com
EMAIL_SMTP_STARTTLS=true
```

Importante:

- `EMAIL_SMTP_PASSWORD` deve ser uma senha de app do Google, nao a senha normal do Gmail.
- Para criar senha de app, a conta Google precisa estar com verificacao em duas etapas ativa.
- Depois de salvar as variaveis no Render, fazer redeploy/manual deploy.
- Voltar no SioCred em `/app/admin#franksteinEmailAlerts`, clicar `Atualizar status` e depois `Testar envio`.

## Observacoes tecnicas

- Neste PC, `npm` nao estava disponivel no PATH, entao nao foi possivel rebuildar `frontend-react/dist` localmente.
- O Render deve executar o build pelo `buildCommand` se tiver Node/npm disponivel.
- O modulo principal de e-mail esta no HTML classico `web/admin.html`, entao deve aparecer em `/app/admin#franksteinEmailAlerts` apos deploy.

## Proximos passos recomendados

1. Configurar SMTP no Render.
2. Fazer redeploy.
3. Testar envio pelo painel Admin.
4. Criar uma tarefa com horario na agenda operacional e verificar o alerta 5 minutos antes.
5. Se o botao ainda nao aparecer, verificar se o deploy do Render esta usando o commit `b987678` ou posterior.


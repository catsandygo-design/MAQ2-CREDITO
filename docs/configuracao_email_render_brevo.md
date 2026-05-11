# Configuracao de e-mail no Render Free

O Render Free bloqueia saida SMTP nas portas 25, 465 e 587. Por isso Gmail SMTP pode retornar:

```text
Falha de conexao SMTP: [Errno 101] Network is unreachable
```

Para o Frankstein enviar alertas sem depender dessas portas, use API HTTPS da Brevo.

## Variaveis no Render

Configure em Environment:

```text
EMAIL_DELIVERY_PROVIDER=brevo
EMAIL_BREVO_API_KEY=<chave API da Brevo>
EMAIL_FROM=<remetente verificado na Brevo>
EMAIL_FROM_NAME=Frankstein SioCred
SIOCRED_ALERT_EMAIL_TO=<destinatario dos alertas>
```

As variaveis antigas de SMTP podem continuar no ambiente, mas com `EMAIL_DELIVERY_PROVIDER=brevo` o sistema usa a API.

## Passo de validacao

1. Salve as variaveis no Render.
2. Clique em `Save, rebuild, and deploy`.
3. No painel admin do SioCred, abra `Frankstein - Alertas por e-mail`.
4. Clique em `Atualizar status`.
5. O canal deve aparecer como `API Brevo`.
6. Clique em `Testar envio`.

Se aparecer `Teste aceito pela API Brevo`, o envio saiu do SioCred. Procure pelo assunto `Frankstein: teste de alerta por e-mail`.

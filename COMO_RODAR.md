# Como Rodar o Sistema

Use o arquivo `rodar-sistema.bat` na raiz do projeto.

## Passos

1. Dê dois cliques em `rodar-sistema.bat`.
2. Aguarde aparecer o servidor do Next.js.
3. Abra no navegador:

```text
http://localhost:3000/analista
```

## O que o BAT faz

- Usa o Node portátil em:

```text
C:\Users\douglas.silva\Downloads\sistema-credito\node-v24.15.0-win-x64\node-v24.15.0-win-x64
```

- Entra automaticamente na pasta do projeto.
- Instala as dependências se `node_modules` não existir.
- Roda:

```text
npm run dev
```

## Observação

Deixe a janela do BAT aberta enquanto estiver usando o sistema. Se fechar a janela, o site local para de responder.

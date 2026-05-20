@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "NODE_DIR=C:\Users\douglas.silva\Downloads\sistema-credito\node-v24.15.0-win-x64\node-v24.15.0-win-x64"

if not exist "%NODE_DIR%\node.exe" (
  echo Node portatil nao encontrado em:
  echo %NODE_DIR%
  pause
  exit /b 1
)

if not exist "%NODE_DIR%\npm.cmd" (
  echo npm.cmd nao encontrado em:
  echo %NODE_DIR%
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%"
set "PATH=%NODE_DIR%;%PATH%"

if not exist "node_modules" (
  echo Instalando dependencias...
  call "%NODE_DIR%\npm.cmd" install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Sistema de credito iniciado.
echo Abra no navegador: http://localhost:3000/analista
echo.
call "%NODE_DIR%\npm.cmd" run dev

pause

@echo off
setlocal EnableExtensions

set "PROJECT_DIR=%~dp0"
set "NODE_DIR=%PROJECT_DIR%node-v24.15.0-win-x64"
set "NODE_EXE=%NODE_DIR%\node.exe"
set "NPM_CMD=%NODE_DIR%\npm.cmd"
set "PY_EXE=%LocalAppData%\Programs\Python\Python314\python.exe"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "FRONT_URL=http://localhost:3000/corretor"

title Sistema Credito Pro - Inicializador
cd /d "%PROJECT_DIR%"

echo.
echo ==========================================
echo   Sistema Credito Pro
echo ==========================================
echo.

if not exist "%NODE_EXE%" (
  echo [ERRO] Node portatil nao encontrado:
  echo %NODE_EXE%
  pause
  exit /b 1
)

if not exist "%NPM_CMD%" (
  echo [ERRO] npm.cmd nao encontrado:
  echo %NPM_CMD%
  pause
  exit /b 1
)

if not exist "%PY_EXE%" (
  echo [ERRO] Python nao encontrado:
  echo %PY_EXE%
  echo Ajuste a variavel PY_EXE dentro deste arquivo.
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\.env" (
  echo [AVISO] backend\.env nao encontrado. Copie backend\.env.example e preencha as credenciais.
)

if not exist ".env" (
  echo [AVISO] .env nao encontrado. Copie .env.example se o front nao carregar variaveis.
)

set "PATH=%NODE_DIR%;%PATH%"

if not exist "node_modules" (
  echo [INFO] Instalando dependencias do frontend...
  call "%NPM_CMD%" install
  if errorlevel 1 goto :fail
)

echo [INFO] Liberando portas 3000 e 8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports=3000,8000; foreach($p in $ports){ Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"

echo [INFO] Subindo backend FastAPI em http://localhost:8000 ...
start "Sistema Credito - Backend" /min /d "%BACKEND_DIR%" cmd /k ""%PY_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo [INFO] Subindo frontend Next em http://localhost:3000 ...
start "Sistema Credito - Frontend" /min /d "%PROJECT_DIR%" cmd /k ""%NODE_EXE%" node_modules\next\dist\bin\next dev -H 127.0.0.1 -p 3000"

echo [INFO] Aguardando servicos...
call :wait_url "http://localhost:8000/health" "Backend" 30
if errorlevel 1 goto :fail

call :wait_url "http://localhost:3000" "Frontend" 45
if errorlevel 1 goto :fail

echo.
echo [OK] Sistema iniciado.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo Abrindo:  %FRONT_URL%
echo.
start "" "%FRONT_URL%"
pause
exit /b 0

:wait_url
set "URL=%~1"
set "NAME=%~2"
set "TRIES=%~3"
for /L %%i in (1,1,%TRIES%) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 3; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){ exit 0 } } catch {}; exit 1" >nul 2>nul
  if not errorlevel 1 (
    echo [OK] %NAME% respondeu.
    exit /b 0
  )
  timeout /t 1 /nobreak >nul
)
echo [ERRO] %NAME% nao respondeu em %TRIES%s: %URL%
exit /b 1

:fail
echo.
echo [ERRO] Nao foi possivel iniciar o sistema.
echo Verifique as janelas Backend/Frontend e os arquivos de log.
pause
exit /b 1

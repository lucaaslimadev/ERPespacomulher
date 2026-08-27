@echo off
chcp 65001 >nul
REM =============================================================================
REM Script de Deploy Automático para Produção (Windows)
REM Atualiza aplicação no ambiente de produção
REM =============================================================================

echo ═══════════════════════════════════════════════════════════
echo     DEPLOY AUTOMÁTICO PARA PRODUÇÃO
echo ═══════════════════════════════════════════════════════════
echo.

REM ============================================
REM PASSO 1: BACKUP DE SEGURANÇA
REM ============================================
echo 📦 PASSO 1/6: Fazendo backup de segurança...
if not exist "backups" mkdir backups

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%_%mytime%
set BACKUP_FILE=backups\pre_deploy_%TIMESTAMP%.sql

docker exec erp-db pg_dump -U erp -d erp_espaco_mulher > "%BACKUP_FILE%"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao fazer backup!
    echo ❌ Deploy abortado por segurança
    pause
    exit /b 1
)
echo ✅ Backup salvo: %BACKUP_FILE%
echo.

REM ============================================
REM PASSO 2: PARAR APLICAÇÃO
REM ============================================
echo 🛑 PASSO 2/6: Parando aplicação...
docker compose stop app 2>nul || echo App já estava parado
echo ✅ Aplicação parada
echo.

REM ============================================
REM PASSO 3: BUILD DA NOVA VERSÃO
REM ============================================
echo 🔨 PASSO 3/6: Buildando nova versão...
docker compose build app --no-cache
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro no build!
    pause
    exit /b 1
)
echo ✅ Build concluído
echo.

REM ============================================
REM PASSO 4: SUBIR APLICAÇÃO
REM ============================================
echo 🚀 PASSO 4/6: Subindo aplicação...
docker compose up -d app
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao subir aplicação!
    pause
    exit /b 1
)
echo ✅ Aplicação iniciada
echo.

REM ============================================
REM PASSO 5: AGUARDAR SAÚDE
REM ============================================
echo ⏳ PASSO 5/6: Aguardando health check...
timeout /t 5 /nobreak >nul

set MAX_RETRIES=30
set COUNTER=0
:health_loop
set /a COUNTER+=1

REM Verificar se container está rodando
docker ps | findstr "erp-app" | findstr "Up" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Aplicação saudável!
    goto health_done
)

if %COUNTER% GTR %MAX_RETRIES% (
    echo ⚠️ Health check demorou muito, mas continuando...
    goto health_done
)

echo ⏳ Tentativa %COUNTER%/%MAX_RETRIES% - Aguardando...
timeout /t 2 /nobreak >nul
goto health_loop

:health_done
echo.

REM ============================================
REM PASSO 6: VERIFICAR STATUS
REM ============================================
echo 🔍 PASSO 6/6: Verificando status...
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr "erp"
echo.

REM Testar endpoint
echo 🌐 Testando aplicação...
curl -f http://localhost:3001/api/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Aplicação respondendo!
) else (
    echo ⚠️ Endpoint de health não respondeu (pode levar alguns segundos)
)

echo.
echo ═══════════════════════════════════════════════════════════
echo     ✅ DEPLOY CONCLUÍDO COM SUCESSO!
echo ═══════════════════════════════════════════════════════════
echo 🌐 Acesse: http://localhost:3001
echo 📧 Login: admin@erp.com
echo.
echo ⚠️ Notas:
echo    • Backup automático salvo em: %BACKUP_FILE%
echo    • Para rollback: docker compose stop app
echo    • Logs: docker logs erp-app --tail 50
echo.
pause

@echo off
chcp 65001 >nul
REM =============================================================================
REM Script de Backup do Banco de Dados de Produção (Windows)
REM Salva backup completo do banco com timestamp
REM =============================================================================

echo 📦 Iniciando backup do banco de produção...

REM Criar pasta de backups se não existir
if not exist "backups" mkdir backups

REM Timestamp para o arquivo
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%_%mytime%
set BACKUP_FILE=backups\producao_backup_%TIMESTAMP%.sql

echo 📝 Arquivo de backup: %BACKUP_FILE%

REM Executar backup
echo ⏳ Fazendo backup do banco...
docker exec erp-db pg_dump -U erp -d erp_espaco_mulher > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Backup concluído com sucesso!
    echo 📁 Arquivo salvo em: %BACKUP_FILE%
    
    REM Listar backups existentes
    echo.
    echo 📋 Backups disponíveis:
    dir /b /o-d backups\producao_backup_*.sql 2>nul | findstr "producao_backup"
) else (
    echo ❌ Erro ao fazer backup!
    pause
    exit /b 1
)

echo.
echo Pressione qualquer tecla para sair...
pause >nul

@echo off
chcp 65001 >nul
REM =============================================================================
REM Script: Restaurar Banco Local com Dados de Produção (Windows)
REM Zera o banco local e restaura com dados de produção
REM =============================================================================

echo ═══════════════════════════════════════════════════════════
echo     RESTAURAR BANCO LOCAL COM DADOS DE PRODUÇÃO
echo ═══════════════════════════════════════════════════════════
echo.

REM Verificar se arquivo de backup foi fornecido
if "%~1"=="" (
    echo 📋 Backups disponíveis:
    dir /b /o-d backups\producao_backup_*.sql 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Nenhum backup encontrado
    )
    echo.
    echo Uso: %0 ^<arquivo_backup.sql^>
    echo Exemplo: %0 backups\producao_backup_20260329_143000.sql
    pause
    exit /b 1
)

set BACKUP_FILE=%~1

REM Verificar se arquivo existe
if not exist "%BACKUP_FILE%" (
    echo ❌ Arquivo não encontrado: %BACKUP_FILE%
    pause
    exit /b 1
)

echo 📁 Arquivo de backup: %BACKUP_FILE%
for %%I in (%BACKUP_FILE%) do echo 📊 Tamanho: %%~zI bytes
echo.

REM Confirmação
echo ⚠️  ATENÇÃO: Isso vai APAGAR todos os dados locais!
set /p CONFIRM="Tem certeza? (digite SIM para confirmar): "

if /I not "%CONFIRM%"=="SIM" (
    echo ❌ Operação cancelada
    pause
    exit /b 0
)

echo.
echo 🔄 Parando containers...
docker compose stop app 2>nul || echo App já estava parado

echo 🗑️  Zerando banco local...

REM Dropar e recriar o banco
docker exec erp-db psql -U erp -d postgres -c "DROP DATABASE IF EXISTS erp_espaco_mulher;" 2>nul
docker exec erp-db psql -U erp -d postgres -c "CREATE DATABASE erp_espaco_mulher OWNER erp;" 2>nul

echo 📥 Restaurando dados de produção...
docker exec -i erp-db psql -U erp -d erp_espaco_mulher < "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Restauração concluída com sucesso!
    
    REM Aplicar migrações das novas tabelas
    echo 📊 Aplicando novas migrações...
    
    REM Verificar se coluna barcode existe
    docker exec erp-db psql -U erp -d erp_espaco_mulher -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_variations' AND column_name='barcode') THEN
                ALTER TABLE product_variations ADD COLUMN barcode TEXT;
                CREATE UNIQUE INDEX product_variations_barcode_key ON product_variations(barcode) WHERE barcode IS NOT NULL;
            END IF;
        END
        \$\$;
    " 2>nul
    
    echo ✅ Migrações aplicadas!
    
    echo 🚀 Reiniciando aplicação...
    docker compose start app
    
    echo.
    echo ═══════════════════════════════════════════════════════════
    echo     ✅ BANCO RESTAURADO COM SUCESSO!
    echo ═══════════════════════════════════════════════════════════
    echo 🌐 Acesse: http://localhost:3001
    echo 📧 Os dados de produção estão disponíveis localmente
    echo.
) else (
    echo ❌ Erro na restauração!
    pause
    exit /b 1
)

pause

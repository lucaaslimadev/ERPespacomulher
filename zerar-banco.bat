@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ============================================================
echo   ZERAR BANCO - Apagar dados e recomecar do zero
echo ============================================================
echo.
echo Isso vai:
echo   1. Parar os containers
echo   2. APAGAR todos os dados do banco (vendas, produtos, etc.)
echo   3. Subir de novo com banco limpo (admin, caixa e categorias)
echo.
echo Use isso apos os testes, para iniciar a operacao zerado.
echo.
set /p confirma="Tem certeza? (digite S para confirmar): "
if /i not "%confirma%"=="S" (
  echo Cancelado.
  pause
  exit /b 0
)

echo.
echo Parando e removendo containers e dados do banco...
docker compose down -v
if %errorlevel% neq 0 (
  echo Erro ao parar. Verifique se o Docker esta rodando.
  pause
  exit /b 1
)

echo.
echo Subindo de novo com banco zerado...
docker compose up -d
if %errorlevel% neq 0 (
  echo Erro ao subir. Tente: docker compose up -d --build
  pause
  exit /b 1
)

echo.
echo Pronto. Banco zerado. Aguarde ~1 minuto e acesse:
echo   http://localhost:3001
echo Login: admin@erp.com / Admin@123456
echo.
pause

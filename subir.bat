@echo off
chcp 65001 >nul
echo.
echo ERP Espaco Mulher - Subindo com Docker...
echo.
docker compose up -d --build
if %errorlevel% neq 0 (
  echo.
  echo Se deu erro "docker compose", tente: docker-compose up -d --build
  pause
  exit /b 1
)
echo.
echo Pronto. Acesse: http://localhost:3001
echo Login: admin@erp.com / Admin@123456
echo.
pause

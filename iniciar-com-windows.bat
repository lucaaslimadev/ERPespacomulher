@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: Esperar o Docker estar pronto (até 2 minutos)
set /a tentativas=0
:esperar
docker info >nul 2>&1
if %errorlevel% equ 0 goto subir
set /a tentativas+=1
if %tentativas% geq 60 (
  echo Docker nao iniciou a tempo. Abra o Docker Desktop e rode subir.bat manualmente.
  pause
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto esperar

:subir
docker compose up -d
exit /b 0

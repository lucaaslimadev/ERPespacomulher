@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ============================================================
echo   Configurar ERP Espaco Mulher para iniciar com o Windows
echo ============================================================
echo.
echo Isso vai criar um atalho na pasta "Inicializar" do Windows.
echo Ao ligar o PC e fazer login, o Docker subira os containers
echo automaticamente (apos o Docker Desktop iniciar).
echo.
echo Requisitos:
echo   - Docker Desktop instalado
echo   - Opcao "Start Docker when you sign in" ativada no Docker
echo     (Configuracoes do Docker Desktop - General)
echo.
set /p confirma="Continuar? (S/N): "
if /i not "%confirma%"=="S" exit /b 0

set "PASTA=%~dp0"
set "BAT=%PASTA%iniciar-com-windows.bat"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK=%STARTUP%\ERP-Espaco-Mulher-Iniciar.lnk"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%LNK%'); $s.TargetPath = '%BAT%'; $s.WorkingDirectory = '%PASTA:~0,-1%'; $s.WindowStyle = 7; $s.Save()"

if exist "%LNK%" (
  echo.
  echo Pronto. Atalho criado em:
  echo   %LNK%
  echo.
  echo Na proxima vez que iniciar o Windows e fizer login, os
  echo containers do ERP serao iniciados automaticamente.
  echo.
  echo Para desativar: delete o atalho acima ou execute este
  echo script e escolha a opcao de remover.
) else (
  echo.
  echo Erro ao criar atalho. Crie manualmente:
  echo 1. Win+R, digite: shell:startup
  echo 2. Crie um atalho para: %BAT%
  echo 3. Em "Iniciar em", coloque: %PASTA:~0,-1%
  echo 4. Em "Executar", escolha "Minimizado"
)

echo.
pause

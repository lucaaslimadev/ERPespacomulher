# =============================================================================
# ERP Espaço Mulher - Preparar pasta para pen drive (outra máquina)
# Execute este script DENTRO da pasta do projeto (ERPespacomulher-deploy).
# Gera a pasta "ERPespacomulher-para-outra-maquina" com tudo que precisa levar.
# Na outra máquina o banco ficará ZERADO (primeira execução).
# =============================================================================

$ErrorActionPreference = "Stop"
$nomePasta = "ERPespacomulher-para-outra-maquina"
$origem = $PSScriptRoot
if (-not $origem) { $origem = Get-Location }
$destino = Join-Path (Split-Path $origem -Parent) $nomePasta

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Preparar ERP para outra maquina" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Origem:  $origem" -ForegroundColor Gray
Write-Host "Destino: $destino" -ForegroundColor Gray
Write-Host ""

# Remover pasta destino se existir (criar do zero)
if (Test-Path $destino) {
    Write-Host "Removendo pasta antiga..." -ForegroundColor Yellow
    Remove-Item $destino -Recurse -Force
}

New-Item -ItemType Directory -Path $destino -Force | Out-Null

# Pastas e arquivos a EXCLUIR (nao levar no pen drive)
$excluirPastas = @(
    "node_modules",
    ".next",
    ".git",
    ".turbo",
    ".cursor",
    ".vscode",
    ".idea",
    "coverage",
    ".nyc_output",
    "test-results",
    "playwright-report",
    $nomePasta
)
$excluirArquivos = @(".env", ".env.local", ".env.development", ".env.test")

# Robocopy: copiar tudo exceto o que está acima
$xd = ($excluirPastas | ForEach-Object { "/XD", $_ }) -join " "
$xf = ($excluirArquivos | ForEach-Object { "/XF", $_ }) -join " "
$cmd = "robocopy `"$origem`" `"$destino`" /E /XD $xd /XF $xf /NFL /NDL /NJH /NJS /NC /NS"
Invoke-Expression $cmd
if ($LASTEXITCODE -ge 8) { exit $LASTEXITCODE }

# Copiar .dockerignore (pode ter sido excluído por padrão)
if (Test-Path (Join-Path $origem ".dockerignore")) {
    Copy-Item (Join-Path $origem ".dockerignore") (Join-Path $destino ".dockerignore") -Force
}

# Criar .env.example (na outra maquina pode renomear para .env e ajustar)
$envExample = @"
# Opcional: copie este arquivo para .env e edite se quiser mudar algo.
# Se nao criar .env, o sistema usa os padroes do docker-compose.

# Chave secreta para login (mude em producao)
JWT_SECRET=altere-em-producao-chave-secreta-jwt

# Usuario administrador criado na primeira execucao
ADMIN_EMAIL=admin@erp.com
ADMIN_PASSWORD=Admin@123456
"@
$envExample | Out-File (Join-Path $destino ".env.example") -Encoding UTF8

# Criar LEIA-ME para a outra maquina
$leiaMe = @"
================================================================================
  ERP ESPACO MULHER - INSTRUCOES PARA A OUTRA MAQUINA
================================================================================

O QUE PRECISA NA OUTRA MAQUINA (so isso):
-----------------------------------------
  - Docker Desktop (Docker + Docker Compose)
  - Nao precisa instalar: Node, npm, PostgreSQL, nada mais.

  Download Docker: https://www.docker.com/products/docker-desktop/


COMO RODAR (primeira vez = banco ZERADO):
-----------------------------------------
  1. Copie toda esta pasta do pen drive para a outra maquina
     (ex: C:\ERPespacomulher ou area de trabalho).

  2. Abra o terminal (PowerShell ou CMD) DENTRO dessa pasta.

  3. Execute:
       docker compose up -d --build

  4. Aguarde alguns minutos (primeira vez demora: baixa imagens e builda a app).
     Quando aparecer "Container erp-app Started", esta pronto.

  5. Acesse no navegador:   http://localhost:3001

  6. Login padrao:
       Usuario: admin@erp.com
       Senha:   Admin@123456

  O banco de dados comeca VAZIO. O sistema cria as tabelas e o usuario
  admin na primeira subida.


COMANDOS UTEIS:
---------------
  Subir de novo:        docker compose up -d
  Parar:                docker compose down
  Ver logs da app:      docker compose logs -f app
  Zerar o banco de novo: docker compose down -v
                         (apaga o volume do banco; depois suba com up -d --build)


OPCIONAL - Trocar senha do admin:
---------------------------------
  Crie um arquivo .env nesta pasta (pode copiar de .env.example) e edite:
  ADMIN_EMAIL=admin@erp.com
  ADMIN_PASSWORD=SuaSenhaForteAqui

  Depois: docker compose up -d --build


O QUE FOI LEVADO NO PEN DRIVE (esta pasta):
-------------------------------------------
  - Codigo fonte do projeto (app, api, components, prisma, etc.)
  - Dockerfile e docker-compose.yml
  - Scripts de inicializacao do banco
  - Nao foi levado: node_modules, .next, .git, dados do banco desta maquina.
  Por isso na outra maquina o banco comeca zerado.

================================================================================
"@
$leiaMe | Out-File (Join-Path $destino "LEIA-ME-OUTRA-MAQUINA.txt") -Encoding UTF8

# Checklist do que foi levado
$checklist = @"
================================================================================
  CHECKLIST - O QUE LEVAR NO PEN DRIVE (uma pasta so)
================================================================================

Leve a pasta inteira:  ERPespacomulher-para-outra-maquina

Dentro dela deve ter (confira antes de tirar o pen drive):
--------------------------------------------------------------------------------
[ ] Dockerfile
[ ] docker-compose.yml
[ ] docker-entrypoint.sh
[ ] .dockerignore
[ ] package.json, package-lock.json, next.config.js, tsconfig.json
[ ] LEIA-ME-OUTRA-MAQUINA.txt    <-- instrucoes para a outra maquina
[ ] .env.example                  <-- opcional: copiar para .env e editar
[ ] Pasta  app/
[ ] Pasta  components/
[ ] Pasta  lib/
[ ] Pasta  prisma/
[ ] Pasta  scripts/   (com init-db.sql e docker-init.js)
[ ] Pasta  public/
[ ] Pasta  types/

NAO levar (e nao esta nesta pasta):
--------------------------------------------------------------------------------
- node_modules   (grande; na outra maquina o Docker instala)
- .next          (build; o Docker faz de novo)
- .git           (historico; desnecessario para rodar)
- .env           (contem senhas; use .env.example na outra maquina)
- Dados do banco (ficam no Docker desta maquina; na outra o banco comeca zerado)

Na outra maquina: instalar so Docker Desktop, depois docker compose up -d --build
================================================================================
"@
$checklist | Out-File (Join-Path $destino "LISTA-ITENS-PEN-DRIVE.txt") -Encoding UTF8

# Listar o que foi incluido (resumo)
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host "  PASTA CRIADA COM SUCESSO" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "Copie a pasta abaixo para o pen drive:" -ForegroundColor White
Write-Host "  $destino" -ForegroundColor Yellow
Write-Host ""
Write-Host "Itens incluidos (o que vai no pen drive):" -ForegroundColor Cyan
Get-ChildItem $destino -Recurse -File | Measure-Object | ForEach-Object { Write-Host "  Total de arquivos: $($_.Count)" -ForegroundColor Gray }
Write-Host "  - Dockerfile, docker-compose.yml, docker-entrypoint.sh" -ForegroundColor Gray
Write-Host "  - app/, components/, lib/, prisma/, scripts/, public/, types/" -ForegroundColor Gray
Write-Host "  - package.json, package-lock.json, next.config.js, etc." -ForegroundColor Gray
Write-Host "  - LEIA-ME-OUTRA-MAQUINA.txt (instrucoes)" -ForegroundColor Gray
Write-Host "  - .env.example (opcional)" -ForegroundColor Gray
Write-Host ""
Write-Host "NAO incluido (banco zerado na outra maquina):" -ForegroundColor Cyan
Write-Host "  - node_modules, .next, .git" -ForegroundColor Gray
Write-Host "  - .env (nao levar senhas; use .env.example na outra maquina)" -ForegroundColor Gray
Write-Host "  - Dados do PostgreSQL (ficam no Docker daqui; na outra maquina comeca vazio)" -ForegroundColor Gray
Write-Host ""

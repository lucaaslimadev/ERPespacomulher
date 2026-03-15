# =============================================================================
# ERP Espaço Mulher - Build Multi-Arquitetura (Windows PowerShell)
# Use Docker Buildx para gerar imagens para x86_64 e linux/arm64
# =============================================================================

$ErrorActionPreference = "Stop"

$ImageName = if ($env:IMAGE_NAME) { $env:IMAGE_NAME } else { "erp-espaco-mulher" }
$ImageTag = if ($env:IMAGE_TAG) { $env:IMAGE_TAG } else { "latest" }
$Registry = $env:REGISTRY
$Push = $env:PUSH -eq "1"

if ($Registry) {
    $ImageFull = "$Registry/$ImageName`:$ImageTag"
} else {
    $ImageFull = "$ImageName`:$ImageTag"
}

Write-Host "=============================================="
Write-Host "  Build Multi-Arquitetura"
Write-Host "  Imagem: $ImageFull"
Write-Host "  Plataformas: linux/amd64, linux/arm64"
Write-Host "=============================================="

# Verifica se o buildx builder existe
$builderExists = docker buildx inspect erp-multiarch 2>$null
if (-not $builderExists) {
    Write-Host "Criando builder multi-arquitetura..."
    docker buildx create --name erp-multiarch --use
}

docker buildx use erp-multiarch

if ($Registry -and $Push) {
    Write-Host "Build + Push para $Registry..."
    docker buildx build `
        --platform linux/amd64,linux/arm64 `
        --tag $ImageFull `
        --push `
        .
} else {
    # Windows: build apenas amd64 e carrega localmente (compose usará essa imagem)
    Write-Host "Build linux/amd64 (para Windows) + load local..."
    docker buildx build `
        --platform linux/amd64 `
        --tag $ImageFull `
        --load `
        .
    Write-Host "Imagem carregada. Execute: docker-compose up -d"
}

Write-Host "Build concluído."

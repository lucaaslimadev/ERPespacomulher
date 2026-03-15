#!/bin/bash
# ==============================================================================
# Build da imagem Docker para Windows (linux/amd64) a partir do Mac Apple Silicon
# Uso: ./scripts/build-para-windows.sh
# ==============================================================================

set -e

IMAGE_NAME="erpespacomulher-app"
IMAGE_TAG="latest"
OUTPUT_FILE="erp-app-image.tar"

echo "========================================================"
echo "  Build para Windows (linux/amd64) — Mac Apple Silicon"
echo "========================================================"
echo ""

# Verifica se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
  echo "ERRO: Docker não está rodando. Abra o Docker Desktop e tente novamente."
  exit 1
fi

# Verifica se o buildx tem suporte a amd64
echo "[1/4] Verificando suporte a buildx para linux/amd64..."
if ! docker buildx inspect default | grep -q "linux/amd64"; then
  echo "      Criando builder multi-arch..."
  docker buildx create --name multiarch-builder --use --bootstrap
else
  echo "      OK — buildx suporta linux/amd64"
fi
echo ""

# Build da imagem forçando linux/amd64
echo "[2/4] Buildando imagem para linux/amd64 (pode demorar alguns minutos)..."
docker buildx build \
  --platform linux/amd64 \
  --load \
  --tag "${IMAGE_NAME}:${IMAGE_TAG}" \
  .
echo "      OK — imagem buildada com sucesso"
echo ""

# Exporta a imagem para arquivo .tar
echo "[3/4] Exportando imagem para '${OUTPUT_FILE}'..."
docker save -o "${OUTPUT_FILE}" "${IMAGE_NAME}:${IMAGE_TAG}"
echo "      OK — arquivo gerado: $(du -sh ${OUTPUT_FILE} | cut -f1)"
echo ""

echo "[4/4] Pronto!"
echo ""
echo "========================================================"
echo "  Como instalar no Windows:"
echo "========================================================"
echo ""
echo "  1. Copie estes arquivos para o PC Windows:"
echo "     - ${OUTPUT_FILE}"
echo "     - docker-compose.migracao.yml"
echo "     - .env (ou configure as variáveis manualmente)"
echo ""
echo "  2. No Windows, abra o PowerShell ou CMD e execute:"
echo "     docker load -i ${OUTPUT_FILE}"
echo "     docker compose -f docker-compose.migracao.yml up -d"
echo ""
echo "  3. Acesse: http://localhost:3000"
echo "========================================================"

#!/usr/bin/env bash
# =============================================================================
# ERP Espaço Mulher - Build Multi-Arquitetura (linux/amd64 + linux/arm64)
# Use Docker Buildx para gerar imagens para x86_64 e ARM64
# =============================================================================

set -e

IMAGE_NAME="${IMAGE_NAME:-erp-espaco-mulher}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"

# Se REGISTRY estiver definido, prefixa o nome da imagem
if [ -n "$REGISTRY" ]; then
  IMAGE_FULL="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
  IMAGE_FULL="${IMAGE_NAME}:${IMAGE_TAG}"
fi

echo "=============================================="
echo "  Build Multi-Arquitetura"
echo "  Imagem: ${IMAGE_FULL}"
echo "  Plataformas: linux/amd64, linux/arm64"
echo "=============================================="

# Verifica se o buildx builder existe
if ! docker buildx inspect erp-multiarch &>/dev/null; then
  echo "Criando builder multi-arquitetura..."
  docker buildx create --name erp-multiarch --use
fi

docker buildx use erp-multiarch

# Build e push (para registry) ou load (para uso local em amd64)
if [ -n "$REGISTRY" ] && [ "${PUSH:-0}" = "1" ]; then
  echo "Build + Push para ${REGISTRY}..."
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag "${IMAGE_FULL}" \
    --push \
    .
else
  echo "Build (sem push). Para carregar localmente use: --load (apenas uma plataforma)"
  echo "Exemplo para Windows/AMD64: docker buildx build --platform linux/amd64 -t ${IMAGE_FULL} --load ."
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag "${IMAGE_FULL}" \
    --output type=oci,dest=./erp-espaco-mulher-image.tar \
    .
  echo "Imagem OCI salva em ./erp-espaco-mulher-image.tar"
fi

echo "Build concluído."

#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  ZERAR BANCO - Apagar dados e recomeçar do zero"
echo "============================================================"
echo ""
echo "Isso vai:"
echo "  1. Parar os containers"
echo "  2. APAGAR todos os dados do banco (vendas, produtos, etc.)"
echo "  3. Subir de novo com banco limpo (admin, caixa e categorias)"
echo ""
echo "Use isso após os testes, para iniciar a operação zerado."
echo ""
read -p "Tem certeza? (digite s para confirmar): " confirma
if [ "$confirma" != "s" ] && [ "$confirma" != "S" ]; then
  echo "Cancelado."
  exit 0
fi

echo ""
echo "Parando e removendo containers e dados do banco..."
docker compose down -v

echo ""
echo "Subindo de novo com banco zerado..."
docker compose up -d

echo ""
echo "Pronto. Banco zerado. Aguarde ~1 minuto e acesse:"
echo "  http://localhost:3001"
echo "Login: admin@erp.com / Admin@123456"
echo ""

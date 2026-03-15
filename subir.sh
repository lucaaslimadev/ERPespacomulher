#!/bin/bash
set -e
echo ""
echo "ERP Espaço Mulher - Subindo com Docker..."
echo ""
docker compose up -d --build
if [ $? -ne 0 ]; then
  echo ""
  echo "Se deu erro 'docker compose', tente: docker-compose up -d --build"
  exit 1
fi
echo ""
echo "Pronto. Acesse: http://localhost:3001"
echo "Login: admin@erp.com / Admin@123456"
echo ""

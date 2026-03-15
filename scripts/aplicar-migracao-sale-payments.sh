#!/bin/bash

echo "🔧 Aplicando migração para criar tabela sale_payments..."

# Verificar se o PostgreSQL está rodando
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL não está rodando. Inicie o PostgreSQL primeiro."
    exit 1
fi

# Ler variáveis do .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Aplicar migração usando Prisma
echo "📦 Executando prisma db push..."
npx prisma db push --accept-data-loss

# Gerar cliente Prisma
echo "🔨 Gerando cliente Prisma..."
npx prisma generate

echo "✅ Migração aplicada com sucesso!"
echo ""
echo "Agora você pode testar o pagamento misto no PDV."

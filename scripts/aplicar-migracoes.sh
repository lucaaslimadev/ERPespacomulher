#!/bin/bash

# Script para aplicar migrações do banco de dados e regenerar Prisma Client

echo "🔄 Aplicando migrações do banco de dados..."

# Verificar se o PostgreSQL está rodando
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL não está rodando. Iniciando..."
    brew services start postgresql@16
    sleep 3
fi

# Aplicar migrações
echo "📦 Aplicando migrações do Prisma..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Migrações aplicadas com sucesso!"
else
    echo "❌ Erro ao aplicar migrações"
    exit 1
fi

# Gerar Prisma Client
echo "🔨 Regenerando Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client regenerado com sucesso!"
else
    echo "❌ Erro ao regenerar Prisma Client"
    exit 1
fi

echo ""
echo "✅ Tudo pronto! O banco de dados está atualizado."
echo ""
echo "📝 Próximos passos:"
echo "   1. Reinicie o servidor Next.js: npm run dev"
echo "   2. Verifique se os fornecedores aparecem no menu"

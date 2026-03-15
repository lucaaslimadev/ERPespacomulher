#!/bin/bash

echo "🚀 Iniciando PostgreSQL 16..."
echo ""

# Verificar se já está rodando
if pg_isready > /dev/null 2>&1; then
    echo "✅ PostgreSQL já está rodando!"
    exit 0
fi

# Tentar iniciar o serviço
echo "📦 Iniciando serviço..."
brew services start postgresql@16

# Aguardar alguns segundos
sleep 3

# Verificar novamente
if pg_isready > /dev/null 2>&1; then
    echo "✅ PostgreSQL iniciado com sucesso!"
    echo ""
    echo "📊 Status:"
    pg_isready
else
    echo "⚠️  PostgreSQL pode estar iniciando..."
    echo "   Aguarde alguns segundos e execute: ./verificar-banco.sh"
fi

#!/bin/bash

echo "🧹 Limpeza completa do cache..."
echo ""

# Matar processos do Next.js que possam estar rodando
echo "🛑 Parando processos do Next.js..."
pkill -f "next dev" || true
pkill -f "next-server" || true

# Aguardar processos terminarem
sleep 2

echo "🗑️  Removendo cache do Next.js..."
rm -rf .next

echo "🗑️  Removendo cache do node_modules..."
rm -rf node_modules/.cache

echo "🗑️  Removendo cache do Turbo (se existir)..."
rm -rf .turbo

echo "🗑️  Removendo arquivos temporários do TypeScript..."
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true

echo "🧹 Limpando cache do npm..."
npm cache clean --force 2>/dev/null || true

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "🚀 Iniciando servidor de desenvolvimento..."
echo ""

# Aguardar um pouco antes de iniciar
sleep 1

# Iniciar o servidor
npm run dev

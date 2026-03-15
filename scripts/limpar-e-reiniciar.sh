#!/bin/bash

echo "🛑 Parando servidor Next.js..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2

echo "🧹 Limpando cache do Next.js..."
rm -rf .next

echo "🧹 Limpando cache do node_modules..."
rm -rf node_modules/.cache

echo "🧹 Limpando cache do Turbo..."
rm -rf .turbo

echo "🧹 Limpando cache do npm..."
npm cache clean --force

echo "🧹 Limpando cache do sistema (macOS)..."
rm -rf ~/Library/Caches/Next.js 2>/dev/null || true

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "🚀 Iniciando servidor..."
echo ""
npm run dev

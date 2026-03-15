#!/bin/bash

echo "🧹 Limpando cache completo do Next.js e dependências..."

# Parar processos do Next.js se estiverem rodando
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

# Limpar cache do Next.js
echo "📦 Limpando .next..."
rm -rf .next

# Limpar cache do node_modules
echo "📦 Limpando node_modules/.cache..."
rm -rf node_modules/.cache

# Limpar cache do Turbo (se existir)
echo "📦 Limpando .turbo..."
rm -rf .turbo

# Limpar cache do npm
echo "📦 Limpando cache do npm..."
npm cache clean --force

# Limpar cache do sistema (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📦 Limpando cache do sistema (macOS)..."
    rm -rf ~/Library/Caches/Next.js 2>/dev/null || true
fi

echo ""
echo "✅ Cache limpo com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Reinicie o servidor: npm run dev"
echo "   2. Limpe o cache do navegador (Cmd+Shift+R no Mac, Ctrl+Shift+R no Windows/Linux)"
echo "   3. Verifique se o erro de hidratação foi resolvido"

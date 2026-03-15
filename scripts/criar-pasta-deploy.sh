#!/bin/bash
# Cria pasta ERPespacomulher-deploy com apenas os arquivos necessários para deploy no Windows

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$PROJECT_DIR/ERPespacomulher-deploy"

echo "📦 Criando pasta de deploy em: $DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Arquivos na raiz
for f in Dockerfile docker-compose.yml .dockerignore .env.example package.json package-lock.json next.config.js tailwind.config.js postcss.config.js tsconfig.json .eslintrc.json; do
  if [ -f "$PROJECT_DIR/$f" ]; then
    cp "$PROJECT_DIR/$f" "$DEPLOY_DIR/"
    echo "  ✓ $f"
  fi
done

# Pastas (excluindo node_modules, .next, etc.)
for dir in app components lib public prisma scripts types; do
  if [ -d "$PROJECT_DIR/$dir" ]; then
    cp -r "$PROJECT_DIR/$dir" "$DEPLOY_DIR/"
    # Remove node_modules e .next se existirem dentro
    find "$DEPLOY_DIR/$dir" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
    find "$DEPLOY_DIR/$dir" -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
    echo "  ✓ $dir/"
  fi
done

# README de deploy
if [ -f "$PROJECT_DIR/README_DEPLOY_WINDOWS.md" ]; then
  cp "$PROJECT_DIR/README_DEPLOY_WINDOWS.md" "$DEPLOY_DIR/"
  echo "  ✓ README_DEPLOY_WINDOWS.md"
fi

echo ""
echo "🎉 Pasta criada: $DEPLOY_DIR"
echo ""
echo "Próximos passos:"
echo "  1. Copie a pasta ERPespacomulher-deploy para o Windows"
echo "  2. Renomeie para ERPespacomulher (opcional)"
echo "  3. Crie o .env: copy .env.example .env"
echo "  4. Execute: docker-compose up -d --build"
echo ""

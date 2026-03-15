#!/bin/sh
set -e

echo "🚀 Inicializando container ERP Espaço Mulher..."
echo "📅 Data: $(date)"
echo "🕒 Timezone: $(date +%Z)"

# Verificar variáveis de ambiente
echo "🔍 Verificando configurações..."
echo "NODE_ENV: $NODE_ENV"
echo "ADMIN_EMAIL: $ADMIN_EMAIL"
echo "DATABASE_URL: $(echo $DATABASE_URL | cut -d'@' -f2 | cut -d'?' -f1)"

# Aguardar banco de dados ficar pronto
echo "🔄 Aguardando banco de dados..."
max_retries=30
counter=0
until npx prisma db push --accept-data-loss --skip-generate; do
  counter=$((counter + 1))
  if [ $counter -gt $max_retries ]; then
    echo "❌ Banco de dados não respondeu após $max_retries tentativas"
    exit 1
  fi
  echo "⏳ Tentativa $counter de $max_retries. Aguardando banco de dados..."
  sleep 2
done

echo "✅ Schema do banco sincronizado com Prisma (db push)"

# Executar script de inicialização (cria admin, categorias, etc)
if [ -f scripts/docker-init.js ]; then
    echo "⚙️ Executando script de inicialização..."
    echo "📧 Criando admin com email: $ADMIN_EMAIL"
    node scripts/docker-init.js
    if [ $? -eq 0 ]; then
        echo "✅ Script de inicialização concluído com sucesso!"
    else
        echo "❌ Script de inicialização falhou!"
        exit 1
    fi
else
    echo "⚠️ Script scripts/docker-init.js não encontrado!"
fi

echo "✅ Container pronto para receber requisições!"
echo "🌐 Acesse: http://localhost:3001"
echo "📧 Login: $ADMIN_EMAIL"

# Executar comando principal (npm run start)
exec "$@"
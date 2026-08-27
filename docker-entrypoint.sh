#!/bin/sh
set -e

echo "Inicializando container ERP Espaco Mulher..."
echo "Data: $(date)"
echo "Timezone: $(date +%Z)"

# Verifica variaveis obrigatorias
required_env_vars="DATABASE_URL JWT_SECRET ADMIN_EMAIL ADMIN_PASSWORD"
for env_name in $required_env_vars; do
  eval "env_value=\${$env_name:-}"
  if [ -z "$env_value" ]; then
    echo "Erro: variavel obrigatoria nao definida: $env_name"
    exit 1
  fi
done

DB_HOST="${POSTGRES_HOST:-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-erp}"
DB_NAME="${POSTGRES_DB:-erp_espaco_mulher}"

echo "Verificando configuracoes..."
echo "NODE_ENV: $NODE_ENV"
echo "ADMIN_EMAIL: $ADMIN_EMAIL"
echo "DATABASE_HOST: $DB_HOST"
echo "DATABASE_PORT: $DB_PORT"
echo "DATABASE_NAME: $DB_NAME"

# Aguardar banco de dados ficar pronto usando pg_isready
echo "Aguardando banco de dados..."
max_retries=30
counter=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  counter=$((counter + 1))
  if [ $counter -gt $max_retries ]; then
    echo "Erro: banco de dados nao respondeu apos $max_retries tentativas"
    exit 1
  fi
  echo "Tentativa $counter de $max_retries. Aguardando banco de dados..."
  sleep 2
done

echo "Banco de dados conectado"

echo "Executando migracoes..."
set +e
npx prisma migrate deploy > /tmp/prisma_migrate.log 2>&1
MIGRATE_EXIT=$?
set -e

if [ "$MIGRATE_EXIT" -ne 0 ] && grep -q "P3005" /tmp/prisma_migrate.log 2>/dev/null; then
  if [ "${PRISMA_AUTO_BASELINE_ON_P3005:-1}" = "0" ]; then
    echo "Erro P3005: o banco ja tem tabelas mas sem historico Prisma (_prisma_migrations)."
    echo "Opcoes: volume novo, baseline manual (prisma migrate resolve), ou PRISMA_AUTO_BASELINE_ON_P3005=1"
    cat /tmp/prisma_migrate.log
    exit 1
  fi
  echo "P3005: schema existente sem historico Prisma — baseline automatico (marcar migrações como aplicadas)..."
  for name in $(ls -1 prisma/migrations 2>/dev/null | grep -E '^[0-9]' | sort); do
    [ -d "prisma/migrations/$name" ] || continue
    npx prisma migrate resolve --applied "$name" 2>/dev/null || true
  done
  set +e
  npx prisma migrate deploy > /tmp/prisma_migrate2.log 2>&1
  MIGRATE_EXIT=$?
  set -e
  if [ "$MIGRATE_EXIT" -ne 0 ]; then
    cat /tmp/prisma_migrate2.log
    exit 1
  fi
elif [ "$MIGRATE_EXIT" -ne 0 ]; then
  cat /tmp/prisma_migrate.log
  exit 1
fi

echo "Migracoes aplicadas"

# Executar script de inicialização (cria admin, categorias, etc)
if [ -f scripts/docker-init.js ]; then
    echo "Executando script de inicializacao..."
    echo "Criando admin com email: $ADMIN_EMAIL"
    node scripts/docker-init.js
else
    echo "Erro: script scripts/docker-init.js nao encontrado"
    exit 1
fi

echo "Container pronto para receber requisicoes"
HOST_PORT="${DOCKER_HOST_APP_PORT:-3001}"
echo "Acesse (mapeamento host): http://localhost:${HOST_PORT}"
echo "Login: $ADMIN_EMAIL"

# Executar comando principal (npm run start)
exec "$@"
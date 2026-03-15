#!/usr/bin/env bash
# Sobe só o banco no Docker e roda o app no seu Mac — para testar rápido, sem build da imagem do app.
set -e
cd "$(dirname "$0")/.."

# Credenciais do Postgres no docker-compose (db)
export DATABASE_URL="postgresql://erp:erp_senha_segura@localhost:5433/erp_espaco_mulher?schema=public"

echo ">>> Parando containers antigos que possam estar na porta 5432..."
docker compose down 2>/dev/null || true

echo ">>> Subindo só o PostgreSQL..."
docker compose up -d db

echo ">>> Esperando o banco ficar pronto..."
for i in {1..30}; do
  if docker compose exec -T db pg_isready -U erp -d erp_espaco_mulher 2>/dev/null; then
    echo ">>> Banco pronto."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo ">>> Banco não respondeu a tempo."
    exit 1
  fi
  sleep 1
done

# Garante .env com credenciais do Postgres no Docker (evita "credentials for lucaslima are not valid")
echo ">>> Ajustando .env para o banco no Docker..."
node scripts/garantir-env-docker-db.js

echo ">>> Rodando migrações..."
npx prisma migrate deploy

echo ">>> Seed (pode ignorar erro se já tiver dados)..."
npm run db:seed 2>/dev/null || true

echo ">>> Iniciando o app em http://localhost:3000"
echo ">>> Login: admin / admin123"
npm run dev

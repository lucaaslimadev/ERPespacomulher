#!/bin/bash

echo "🚀 Iniciando PostgreSQL e verificando banco de dados..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Verificar se PostgreSQL está rodando
echo "1️⃣ Verificando PostgreSQL..."
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL está rodando!${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL não está rodando. Tentando iniciar...${NC}"
    
    # Tentar diferentes métodos de inicialização
    if brew services start postgresql@16 2>/dev/null; then
        echo -e "${GREEN}✅ Serviço iniciado via brew services${NC}"
        sleep 3
    elif pg_ctl -D /opt/homebrew/var/postgresql@16 start 2>/dev/null; then
        echo -e "${GREEN}✅ Serviço iniciado via pg_ctl${NC}"
        sleep 3
    else
        echo -e "${RED}❌ Não foi possível iniciar automaticamente${NC}"
        echo ""
        echo "Por favor, execute manualmente:"
        echo "  brew services start postgresql@16"
        echo "  ou"
        echo "  pg_ctl -D /opt/homebrew/var/postgresql@16 start"
        exit 1
    fi
    
    # Verificar novamente
    sleep 2
    if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL iniciado com sucesso!${NC}"
    else
        echo -e "${RED}❌ PostgreSQL ainda não está respondendo${NC}"
        echo "   Aguarde alguns segundos e tente novamente"
        exit 1
    fi
fi

echo ""

# 2. Verificar se o banco existe
echo "2️⃣ Verificando banco de dados 'erp_espaco_mulher'..."
DB_EXISTS=$(psql -h localhost -U $(whoami) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='erp_espaco_mulher'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${GREEN}✅ Banco de dados 'erp_espaco_mulher' existe${NC}"
else
    echo -e "${YELLOW}⚠️  Banco de dados não existe. Criando...${NC}"
    
    if psql -h localhost -U $(whoami) -d postgres -c "CREATE DATABASE erp_espaco_mulher;" 2>/dev/null; then
        echo -e "${GREEN}✅ Banco de dados criado com sucesso!${NC}"
    elif psql -h localhost -U postgres -d postgres -c "CREATE DATABASE erp_espaco_mulher;" 2>/dev/null; then
        echo -e "${GREEN}✅ Banco de dados criado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro ao criar banco de dados${NC}"
        echo ""
        echo "Tente criar manualmente:"
        echo "  psql postgres"
        echo "  CREATE DATABASE erp_espaco_mulher;"
        echo "  \\q"
        exit 1
    fi
fi

echo ""

# 3. Aplicar migrações do Prisma
echo "3️⃣ Aplicando migrações do Prisma..."
if npx prisma db push --accept-data-loss 2>&1 | grep -q "Your database is now in sync"; then
    echo -e "${GREEN}✅ Migrações aplicadas com sucesso!${NC}"
elif npx prisma db push --accept-data-loss 2>&1 | grep -q "already in sync"; then
    echo -e "${GREEN}✅ Banco de dados já está sincronizado!${NC}"
else
    echo -e "${YELLOW}⚠️  Verificando status das migrações...${NC}"
    npx prisma db push --accept-data-loss
fi

echo ""

# 4. Gerar cliente Prisma
echo "4️⃣ Gerando cliente Prisma..."
if npx prisma generate > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Cliente Prisma gerado com sucesso!${NC}"
else
    echo -e "${YELLOW}⚠️  Aviso ao gerar cliente Prisma (pode estar OK)${NC}"
    npx prisma generate
fi

echo ""
echo -e "${GREEN}🎉 Banco de dados configurado e pronto para uso!${NC}"
echo ""
echo "📝 Próximos passos:"
echo "   - O frontend deve estar rodando em http://localhost:3000"
echo "   - Se necessário, execute: npm run db:seed (para popular dados iniciais)"
echo ""

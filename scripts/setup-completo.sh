#!/bin/bash

set -e  # Parar em caso de erro

echo "🚀 Configuração Automática Completa - ERP Espaço Mulher"
echo "=================================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir sucesso
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Função para imprimir erro
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para imprimir aviso
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Função para imprimir info
info() {
    echo -e "ℹ️  $1"
}

# 1. Verificar se PostgreSQL está rodando
echo "1️⃣ Verificando PostgreSQL..."
if pg_isready -q 2>/dev/null; then
    success "PostgreSQL está rodando"
else
    warning "PostgreSQL não está rodando"
    echo ""
    echo "Por favor, inicie o PostgreSQL manualmente:"
    echo "  brew services start postgresql@16"
    echo ""
    echo "Ou se já estiver instalado em outro local:"
    echo "  pg_ctl -D /opt/homebrew/var/postgresql@16 start"
    echo ""
    read -p "Pressione Enter após iniciar o PostgreSQL, ou Ctrl+C para cancelar..."
    
    # Aguardar um pouco e verificar novamente
    sleep 2
    if pg_isready -q 2>/dev/null; then
        success "PostgreSQL está rodando agora"
    else
        error "PostgreSQL ainda não está rodando"
        echo "Verifique se o serviço está ativo: brew services list"
        exit 1
    fi
fi
echo ""

# 2. Determinar usuário do PostgreSQL
echo "2️⃣ Determinando usuário do PostgreSQL..."
PG_USER=""
if psql -U $(whoami) -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    PG_USER=$(whoami)
    success "Usuário: $PG_USER"
elif psql -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    PG_USER="postgres"
    success "Usuário: $PG_USER"
else
    # Tentar descobrir o usuário padrão
    PG_USER=$(whoami)
    warning "Usando usuário padrão: $PG_USER"
fi
echo ""

# 3. Verificar se banco já existe
echo "3️⃣ Verificando banco de dados..."
if psql -U "$PG_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw erp_espaco_mulher; then
    warning "Banco 'erp_espaco_mulher' já existe"
    read -p "Deseja recriar? Isso apagará todos os dados! (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        info "Removendo banco existente..."
        psql -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS erp_espaco_mulher;" 2>/dev/null || true
        success "Banco removido"
    else
        success "Usando banco existente"
        SKIP_DB_CREATE=true
    fi
fi

# 4. Criar banco de dados
if [ "$SKIP_DB_CREATE" != "true" ]; then
    echo "4️⃣ Criando banco de dados..."
    if psql -U "$PG_USER" -d postgres -c "CREATE DATABASE erp_espaco_mulher;" >/dev/null 2>&1; then
        success "Banco de dados criado com sucesso!"
    else
        error "Erro ao criar banco de dados"
        echo "Tente criar manualmente:"
        echo "  psql -U $PG_USER -d postgres -c 'CREATE DATABASE erp_espaco_mulher;'"
        exit 1
    fi
fi
echo ""

# 5. Criar arquivo .env
echo "5️⃣ Configurando arquivo .env..."
if [ -f .env ]; then
    warning "Arquivo .env já existe"
    read -p "Deseja sobrescrever? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        info "Mantendo arquivo .env existente"
        SKIP_ENV=true
    fi
fi

if [ "$SKIP_ENV" != "true" ]; then
    # Gerar JWT_SECRET aleatório
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://${PG_USER}@localhost:5432/erp_espaco_mulher?schema=public"

# JWT Secret
JWT_SECRET="${JWT_SECRET}"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
    success "Arquivo .env criado"
    info "DATABASE_URL: postgresql://${PG_USER}@localhost:5432/erp_espaco_mulher"
    info "JWT_SECRET: Gerado automaticamente"
fi
echo ""

# 6. Gerar cliente Prisma
echo "6️⃣ Gerando cliente Prisma..."
if npm run db:generate 2>&1 | grep -q "Generated Prisma Client"; then
    success "Cliente Prisma gerado"
else
    # Tentar novamente mostrando o erro
    if npm run db:generate 2>&1 | grep -q "Generated Prisma Client"; then
        success "Cliente Prisma gerado"
    else
        error "Erro ao gerar cliente Prisma"
        echo "Executando novamente para ver o erro:"
        npm run db:generate
        exit 1
    fi
fi
echo ""

# 7. Executar migrações
echo "7️⃣ Criando tabelas no banco de dados..."
if npm run db:migrate -- --name init >/dev/null 2>&1; then
    success "Migrações executadas com sucesso"
else
    # Tentar sem o --name
    if npm run db:migrate >/dev/null 2>&1; then
        success "Migrações executadas com sucesso"
    else
        error "Erro ao executar migrações"
        echo "Tente manualmente: npm run db:migrate"
        exit 1
    fi
fi
echo ""

# 8. Popular com dados iniciais
echo "8️⃣ Populando banco com dados iniciais..."
if npm run db:seed >/dev/null 2>&1; then
    success "Dados iniciais criados"
    echo ""
    echo "Usuários criados:"
    echo "  👤 Admin:    admin@erp.com / admin123"
    echo "  👤 Gerente:  gerente@erp.com / gerente123"
    echo "  👤 Caixa:    caixa@erp.com / caixa123"
else
    warning "Erro ao popular banco (pode ser normal se já tiver dados)"
    info "Tente manualmente: npm run db:seed"
fi
echo ""

# 9. Verificação final
echo "9️⃣ Verificando configuração..."
if psql -U "$PG_USER" -d erp_espaco_mulher -c "\dt" >/dev/null 2>&1; then
    TABLE_COUNT=$(psql -U "$PG_USER" -d erp_espaco_mulher -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    if [ ! -z "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt "0" ]; then
        success "Banco configurado com $TABLE_COUNT tabela(s)"
    else
        warning "Banco criado mas sem tabelas"
    fi
else
    warning "Não foi possível verificar tabelas"
fi
echo ""

# Resumo final
echo "=================================================="
echo -e "${GREEN}🎉 Configuração Completa!${NC}"
echo ""
echo "Próximos passos:"
echo "  1. Iniciar servidor: npm run dev"
echo "  2. Acessar: http://localhost:3000"
echo "  3. Fazer login: admin@erp.com / admin123"
echo ""
echo "Arquivos criados:"
echo "  ✅ .env (configurações)"
echo "  ✅ Banco de dados: erp_espaco_mulher"
echo "  ✅ Tabelas criadas"
echo "  ✅ Dados iniciais"
echo ""

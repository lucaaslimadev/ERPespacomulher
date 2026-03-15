#!/bin/bash

echo "🗄️  Configurando Banco de Dados - ERP Espaço Mulher"
echo ""

# Verificar se o PostgreSQL está rodando
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL não está rodando!"
    echo "   Inicie o PostgreSQL com: brew services start postgresql@16"
    echo "   Ou: pg_ctl -D /opt/homebrew/var/postgresql@16 start"
    exit 1
fi

echo "✅ PostgreSQL está rodando"
echo ""

# Verificar se o banco já existe
if psql -lqt | cut -d \| -f 1 | grep -qw erp_espaco_mulher; then
    echo "⚠️  Banco 'erp_espaco_mulher' já existe"
    read -p "   Deseja recriar? Isso apagará todos os dados! (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "🗑️  Removendo banco existente..."
        psql -c "DROP DATABASE IF EXISTS erp_espaco_mulher;"
    else
        echo "✅ Usando banco existente"
        exit 0
    fi
fi

# Criar banco de dados
echo "📦 Criando banco de dados..."

# Tentar diferentes formas de conexão
if psql -U $(whoami) -d postgres -c "CREATE DATABASE erp_espaco_mulher;" 2>/dev/null; then
    echo "✅ Banco de dados criado com sucesso!"
elif psql -U postgres -d postgres -c "CREATE DATABASE erp_espaco_mulher;" 2>/dev/null; then
    echo "✅ Banco de dados criado com sucesso!"
elif psql -h localhost -U $(whoami) -d postgres -c "CREATE DATABASE erp_espaco_mulher;" 2>/dev/null; then
    echo "✅ Banco de dados criado com sucesso!"
else
    echo "❌ Erro ao criar banco de dados"
    echo ""
    echo "Tente criar manualmente com um destes comandos:"
    echo "   psql -U $(whoami) -d postgres -c 'CREATE DATABASE erp_espaco_mulher;'"
    echo "   psql -U postgres -d postgres -c 'CREATE DATABASE erp_espaco_mulher;'"
    echo "   psql postgres -c 'CREATE DATABASE erp_espaco_mulher;'"
    echo ""
    echo "Ou conecte manualmente:"
    echo "   psql postgres"
    echo "   CREATE DATABASE erp_espaco_mulher;"
    echo "   \\q"
    exit 1
fi

echo ""
echo "📝 Próximos passos:"
echo "   1. Configure o arquivo .env com suas credenciais"
echo "   2. Execute: npm run db:generate"
echo "   3. Execute: npm run db:migrate"
echo "   4. Execute: npm run db:seed (opcional)"
echo ""

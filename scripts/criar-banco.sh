#!/bin/bash

echo "🗄️  Criando Banco de Dados - ERP Espaço Mulher"
echo ""

# Verificar se o banco já existe
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw erp_espaco_mulher; then
    echo "✅ Banco 'erp_espaco_mulher' já existe!"
    exit 0
fi

echo "Tentando criar banco de dados..."
echo ""

# Tentar diferentes métodos
echo "Método 1: Usuário do sistema..."
if psql -U $(whoami) -d postgres -c "CREATE DATABASE erp_espaco_mulher;" 2>/dev/null; then
    echo "✅ Banco criado com sucesso usando usuário: $(whoami)"
    exit 0
fi

echo "Método 2: Usuário postgres..."
if psql -U postgres -d postgres -c "CREATE DATABASE erp_espaco_mulher;" 2>/dev/null; then
    echo "✅ Banco criado com sucesso usando usuário: postgres"
    exit 0
fi

echo "Método 3: Conexão TCP localhost..."
if psql -h localhost -U $(whoami) -d postgres -c "CREATE DATABASE erp_espaco_mulher;" 2>/dev/null; then
    echo "✅ Banco criado com sucesso via TCP"
    exit 0
fi

echo ""
echo "❌ Não foi possível criar o banco automaticamente"
echo ""
echo "Por favor, execute manualmente:"
echo ""
echo "1. Conecte ao PostgreSQL:"
echo "   psql postgres"
echo ""
echo "2. Crie o banco:"
echo "   CREATE DATABASE erp_espaco_mulher;"
echo ""
echo "3. Saia:"
echo "   \\q"
echo ""
echo "Ou tente:"
echo "   psql -U $(whoami) postgres -c 'CREATE DATABASE erp_espaco_mulher;'"
echo "   psql -U postgres postgres -c 'CREATE DATABASE erp_espaco_mulher;'"

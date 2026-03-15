#!/bin/bash

echo "🔍 Verificando status do PostgreSQL..."
echo ""

# Verificar se o PostgreSQL está rodando
if pg_isready > /dev/null 2>&1; then
    echo "✅ PostgreSQL está RODANDO"
    echo ""
    
    # Tentar conectar e listar bancos
    echo "📊 Listando bancos de dados disponíveis:"
    psql -l 2>/dev/null | grep -E "Name|erp_espaco_mulher" || echo "   (Não foi possível listar - verifique permissões)"
    echo ""
    
    # Verificar se o banco específico existe
    if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw erp_espaco_mulher; then
        echo "✅ Banco 'erp_espaco_mulher' EXISTE"
        
        # Tentar conectar ao banco
        if psql -d erp_espaco_mulher -c "SELECT version();" > /dev/null 2>&1; then
            echo "✅ Conexão com o banco OK"
            
            # Contar tabelas
            TABLE_COUNT=$(psql -d erp_espaco_mulher -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
            if [ ! -z "$TABLE_COUNT" ]; then
                echo "📋 Tabelas no banco: $TABLE_COUNT"
            fi
            
            # Contar usuários
            USER_COUNT=$(psql -d erp_espaco_mulher -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
            if [ ! -z "$USER_COUNT" ]; then
                echo "👥 Usuários cadastrados: $USER_COUNT"
            fi
        else
            echo "⚠️  Banco existe mas não foi possível conectar"
            echo "   Verifique as credenciais no arquivo .env"
        fi
    else
        echo "⚠️  Banco 'erp_espaco_mulher' NÃO EXISTE"
        echo "   Execute: ./setup-db.sh para criar"
    fi
else
    echo "❌ PostgreSQL NÃO está rodando"
    echo ""
    echo "🚀 Para iniciar:"
    echo ""
    echo "   macOS:"
    echo "   brew services start postgresql"
    echo ""
    echo "   Linux:"
    echo "   sudo systemctl start postgresql"
    echo ""
    echo "   Ou manualmente:"
    echo "   pg_ctl -D /usr/local/var/postgres start"
    echo ""
fi

echo ""
echo "📝 Verificação concluída!"

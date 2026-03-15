#!/bin/bash

echo "🔍 Diagnóstico do PostgreSQL 16"
echo "================================"
echo ""

# 1. Verificar status do serviço Homebrew
echo "1️⃣ Status do serviço Homebrew:"
brew services list | grep postgresql@16
echo ""

# 2. Verificar se o processo está rodando
echo "2️⃣ Processos PostgreSQL:"
ps aux | grep -i postgres | grep -v grep | head -3
echo ""

# 3. Verificar porta padrão
echo "3️⃣ Verificando porta 5432:"
lsof -i :5432 2>/dev/null | head -3 || echo "   Nenhum processo na porta 5432"
echo ""

# 4. Tentar conectar
echo "4️⃣ Testando conexão:"
if pg_isready 2>&1; then
    echo "   ✅ PostgreSQL está respondendo!"
else
    echo "   ❌ PostgreSQL não está respondendo"
    echo ""
    echo "   Tentando localizar o socket..."
    ls -la /tmp/.s.PGSQL.* 2>/dev/null || echo "   Nenhum socket encontrado em /tmp"
    ls -la /var/run/postgresql/.s.PGSQL.* 2>/dev/null || echo "   Nenhum socket encontrado em /var/run/postgresql"
fi
echo ""

# 5. Verificar diretório de dados
echo "5️⃣ Diretório de dados:"
if [ -d "/opt/homebrew/var/postgresql@16" ]; then
    echo "   Encontrado: /opt/homebrew/var/postgresql@16"
    ls -la /opt/homebrew/var/postgresql@16/postgresql.conf 2>/dev/null && echo "   ✅ Arquivo de configuração existe"
elif [ -d "/usr/local/var/postgresql@16" ]; then
    echo "   Encontrado: /usr/local/var/postgresql@16"
    ls -la /usr/local/var/postgresql@16/postgresql.conf 2>/dev/null && echo "   ✅ Arquivo de configuração existe"
else
    echo "   ⚠️  Diretório de dados não encontrado nos locais padrão"
fi
echo ""

# 6. Soluções sugeridas
echo "💡 Soluções sugeridas:"
echo ""
echo "   Se o serviço não estiver funcionando, tente:"
echo ""
echo "   1. Reiniciar o serviço:"
echo "      brew services restart postgresql@16"
echo ""
echo "   2. Iniciar manualmente:"
echo "      pg_ctl -D /opt/homebrew/var/postgresql@16 start"
echo "      # ou"
echo "      pg_ctl -D /usr/local/var/postgresql@16 start"
echo ""
echo "   3. Verificar logs:"
echo "      tail -f /opt/homebrew/var/log/postgresql@16.log"
echo "      # ou"
echo "      tail -f /usr/local/var/log/postgresql@16.log"
echo ""

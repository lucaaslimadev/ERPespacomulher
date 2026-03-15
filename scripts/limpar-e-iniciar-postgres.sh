#!/bin/bash

echo "🧹 Limpando processos antigos do PostgreSQL e reiniciando..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Parar serviços do PostgreSQL
echo "1️⃣ Parando serviços do PostgreSQL..."
brew services stop postgresql@16 2>/dev/null || true
pg_ctl -D /opt/homebrew/var/postgresql@16 stop 2>/dev/null || true
pg_ctl -D /usr/local/var/postgresql@16 stop 2>/dev/null || true

# 2. Matar processos antigos
echo "2️⃣ Removendo processos antigos..."
pkill -9 postgres 2>/dev/null || true
sleep 2

# 3. Limpar memória compartilhada (se possível)
echo "3️⃣ Limpando recursos do sistema..."
# No macOS, a memória compartilhada geralmente é limpa automaticamente

# 4. Aguardar um pouco
sleep 2

# 5. Tentar iniciar novamente
echo "4️⃣ Iniciando PostgreSQL..."
if brew services start postgresql@16 2>/dev/null; then
    echo -e "${GREEN}✅ Serviço iniciado via brew services${NC}"
    sleep 5
elif pg_ctl -D /opt/homebrew/var/postgresql@16 start 2>/dev/null; then
    echo -e "${GREEN}✅ Serviço iniciado via pg_ctl${NC}"
    sleep 5
else
    echo -e "${RED}❌ Não foi possível iniciar automaticamente${NC}"
    echo ""
    echo "Por favor, execute manualmente em um novo terminal:"
    echo "  brew services stop postgresql@16"
    echo "  pkill -9 postgres"
    echo "  sleep 3"
    echo "  brew services start postgresql@16"
    exit 1
fi

# 6. Verificar se está funcionando
echo "5️⃣ Verificando status..."
sleep 3
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL está rodando e respondendo!${NC}"
    echo ""
    echo "📊 Status:"
    pg_isready
    echo ""
    echo -e "${GREEN}🎉 Pronto! Agora execute: ./iniciar-banco.sh${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL pode estar iniciando ainda...${NC}"
    echo "   Aguarde 10 segundos e execute: pg_isready"
    echo "   Se ainda não funcionar, reinicie o computador ou execute:"
    echo "   brew services restart postgresql@16"
fi

#!/bin/bash
# =============================================================================
# Script de Deploy Automático para Produção
# Atualiza aplicação no ambiente de produção
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    DEPLOY AUTOMÁTICO PARA PRODUÇÃO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

POSTGRES_USER="${POSTGRES_USER:-erp}"
POSTGRES_DB="${POSTGRES_DB:-erp_espaco_mulher}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# ============================================
# PASSO 1: BACKUP DE SEGURANÇA
# ============================================
echo -e "${YELLOW}📦 PASSO 1/6: Fazendo backup de segurança...${NC}"
mkdir -p backups
BACKUP_FILE="backups/pre_deploy_$(date +%Y%m%d_%H%M%S).sql"
docker exec erp-db pg_dump -U "$POSTGRES_USER" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" > "$BACKUP_FILE" 2>/dev/null || {
    echo -e "${RED}❌ Erro ao fazer backup!${NC}"
    echo -e "${RED}❌ Deploy abortado por segurança${NC}"
    exit 1
}
echo -e "${GREEN}✅ Backup salvo: $BACKUP_FILE${NC}"
echo ""

# ============================================
# PASSO 2: BUILD DA NOVA VERSÃO
# ============================================
echo -e "${YELLOW}🔨 PASSO 2/6: Buildando nova versão...${NC}"
docker compose build app --no-cache
echo -e "${GREEN}✅ Build concluído${NC}"
echo ""

# ============================================
# PASSO 3: VALIDAR MIGRAÇÕES PENDENTES
# ============================================
echo -e "${YELLOW}🧪 PASSO 3/6: Validando estado das migrações...${NC}"
docker compose run --rm --no-deps app npx prisma migrate status
echo -e "${GREEN}✅ Estado de migrações validado${NC}"
echo ""

# ============================================
# PASSO 4: REINICIAR APLICAÇÃO
# ============================================
echo -e "${YELLOW}🚀 PASSO 4/6: Recriando aplicação...${NC}"
docker compose up -d app
echo -e "${GREEN}✅ Aplicação iniciada${NC}"
echo ""

# ============================================
# PASSO 5: AGUARDAR SAÚDE
# ============================================
echo -e "${YELLOW}⏳ PASSO 5/6: Aguardando health check...${NC}"
sleep 5

MAX_RETRIES=30
COUNTER=0
until [ "$COUNTER" -gt "$MAX_RETRIES" ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' erp-app 2>/dev/null || echo "unhealthy")
    
    if [ "$HEALTH" = "healthy" ]; then
        echo -e "${GREEN}✅ Aplicação saudável!${NC}"
        break
    fi
    
    COUNTER=$((COUNTER + 1))
    echo -e "${YELLOW}⏳ Tentativa $COUNTER/$MAX_RETRIES - Status: $HEALTH${NC}"
    sleep 2
done

if [ "$COUNTER" -gt "$MAX_RETRIES" ]; then
    echo -e "${RED}❌ Health check não ficou saudável no tempo esperado${NC}"
    echo -e "${YELLOW}Rollback sugerido:${NC}"
    echo -e "${YELLOW}  1) docker compose stop app${NC}"
    echo -e "${YELLOW}  2) Restaurar backup: psql -U $POSTGRES_USER -d $POSTGRES_DB < $BACKUP_FILE${NC}"
    exit 1
fi
echo ""

# ============================================
# PASSO 6: VERIFICAR STATUS
# ============================================
echo -e "${YELLOW}🔍 PASSO 6/6: Verificando status...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep erp || true
echo ""

# Testar endpoint
echo -e "${YELLOW}🌐 Testando aplicação...${NC}"
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Aplicação respondendo!${NC}"
else
    echo -e "${YELLOW}⚠️  Endpoint de health não respondeu (pode levar alguns segundos)${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}    ✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🌐 Acesse: http://localhost:3001${NC}"
echo -e "${GREEN}📧 Login: admin@erp.com${NC}"
echo ""
echo -e "${YELLOW}⚠️  Notas:${NC}"
echo -e "${YELLOW}   • Backup automático salvo em: $BACKUP_FILE${NC}"
echo -e "${YELLOW}   • Para rollback de dados: psql -U $POSTGRES_USER -d $POSTGRES_DB < $BACKUP_FILE${NC}"
echo -e "${YELLOW}   • Logs: docker logs erp-app --tail 50${NC}"

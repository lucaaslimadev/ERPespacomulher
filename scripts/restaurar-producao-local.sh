#!/bin/bash
# =============================================================================
# Script: Restaurar Banco Local com Dados de Produção
# Zera o banco local e restaura com dados de produção
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    RESTAURAR BANCO LOCAL COM DADOS DE PRODUÇÃO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar se arquivo de backup foi fornecido
if [ -z "$1" ]; then
    echo -e "${YELLOW}📋 Backups disponíveis:${NC}"
    ls -lh backups/producao_backup_*.sql 2>/dev/null || echo -e "${RED}❌ Nenhum backup encontrado${NC}"
    echo ""
    echo -e "${YELLOW}Uso: $0 <arquivo_backup.sql>${NC}"
    echo -e "Exemplo: $0 backups/producao_backup_20260329_143000.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Arquivo não encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 Arquivo de backup: $BACKUP_FILE${NC}"
echo -e "${YELLOW}📊 Tamanho: $(du -h $BACKUP_FILE | cut -f1)${NC}"
echo ""

# Confirmação
echo -e "${RED}⚠️  ATENÇÃO: Isso vai APAGAR todos os dados locais!${NC}"
read -p "Tem certeza? (digite 'SIM' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SIM" ]; then
    echo -e "${YELLOW}❌ Operação cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Parando containers...${NC}"
docker compose stop app

echo -e "${YELLOW}🗑️  Zerando banco local...${NC}"

# Dropar e recriar o banco
docker exec erp-db psql -U erp -d postgres -c "DROP DATABASE IF EXISTS erp_espaco_mulher;" 2>/dev/null || true
docker exec erp-db psql -U erp -d postgres -c "CREATE DATABASE erp_espaco_mulher OWNER erp;" 2>/dev/null || true

echo -e "${YELLOW}📥 Restaurando dados de produção...${NC}"
docker exec -i erp-db psql -U erp -d erp_espaco_mulher < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Restauração concluída com sucesso!${NC}"
    
    # Aplicar migrações das novas tabelas
    echo -e "${YELLOW}📊 Aplicando novas migrações...${NC}"
    
    # Verificar se tabelas novas existem
    docker exec erp-db psql -U erp -d erp_espaco_mulher -c "
        DO \$\$
        BEGIN
            -- Verificar se coluna barcode existe
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_variations' AND column_name='barcode') THEN
                ALTER TABLE product_variations ADD COLUMN barcode TEXT;
                CREATE UNIQUE INDEX product_variations_barcode_key ON product_variations(barcode) WHERE barcode IS NOT NULL;
            END IF;
        END
        \$\$;
    " 2>/dev/null || echo "Migração barcode já aplicada"
    
    echo -e "${GREEN}✅ Migrações aplicadas!${NC}"
    
    echo -e "${YELLOW}🚀 Reiniciando aplicação...${NC}"
    docker compose start app
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}    ✅ BANCO RESTAURADO COM SUCESSO!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🌐 Acesse: http://localhost:3001${NC}"
    echo -e "${GREEN}📧 Os dados de produção estão disponíveis localmente${NC}"
    
else
    echo -e "${RED}❌ Erro na restauração!${NC}"
    exit 1
fi

#!/bin/bash
# =============================================================================
# Script de Backup do Banco de Dados de Produção
# Salva backup completo do banco com timestamp
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📦 Iniciando backup do banco de produção...${NC}"

# Criar pasta de backups se não existir
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Timestamp para o arquivo
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/producao_backup_$TIMESTAMP.sql"

echo -e "${YELLOW}📝 Arquivo de backup: $BACKUP_FILE${NC}"

# Executar backup
echo -e "${YELLOW}⏳ Fazendo backup do banco...${NC}"
docker exec erp-db pg_dump -U erp -d erp_espaco_mulher > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup concluído com sucesso!${NC}"
    echo -e "${GREEN}📁 Arquivo salvo em: $BACKUP_FILE${NC}"
    echo -e "${GREEN}📊 Tamanho: $(du -h $BACKUP_FILE | cut -f1)${NC}"
    
    # Listar backups existentes
    echo -e "\n${YELLOW}📋 Backups disponíveis:${NC}"
    ls -lh $BACKUP_DIR/producao_backup_*.sql 2>/dev/null | tail -5
else
    echo -e "${RED}❌ Erro ao fazer backup!${NC}"
    exit 1
fi

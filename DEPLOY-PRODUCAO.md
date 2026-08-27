# 📦 DEPLOY PARA PRODUÇÃO - GUIA COMPLETO

## 📋 O Que Precisa Copiar do Projeto

### ✅ Arquivos OBRIGATÓRIOS (copiar para produção):

```
📁 app/                    ← APIs e páginas Next.js (NOVO - Consignados, Returns)
📁 components/             ← Componentes React (NOVO - Consignments modais)
📁 lib/                    ← Utilitários, middleware, auth
📁 prisma/
   └── schema.prisma       ← Modelos atualizados (Consignment, ExchangeItem, ReturnItem)
📁 public/
   └── logo.jpeg           ← Logo da loja
📁 scripts/
   ├── docker-init.js      ← Inicialização do banco
   └── *.sh                ← Scripts de backup/deploy (NOVOS)
📄 docker-compose.yml      ← Configuração Docker
📄 Dockerfile              ← Build da aplicação
📄 docker-entrypoint.sh     ← Entrypoint do container
📄 package.json            ← Dependências
📄 next.config.js          ← Config Next.js
📄 .env.local              ← Variáveis de ambiente (CRIAR NOVO)
```

### ❌ NÃO Copiar:

```
❌ node_modules/           ← Reinstalar com npm install
❌ .next/                  ← Build gerado automaticamente
❌ postgres-data/          ← Dados do banco local
❌ backups/                ← Backups locais
❌ *.log                   ← Arquivos de log
❌ .git/                   ← Se usar git
```

---

## 🚀 PROCESSO DE DEPLOY

### **OPÇÃO 1: Deploy Automático (Recomendado)**

```bash
# 1. Na máquina de PRODUÇÃO, execute:
./scripts/deploy-producao.sh
```

Este script faz automaticamente:
1. ✅ Backup de segurança
2. ✅ Para a aplicação
3. ✅ Builda nova versão
4. ✅ Sobe aplicação
5. ✅ Aguarda health check
6. ✅ Verifica status

---

### **OPÇÃO 2: Deploy Manual Passo a Passo**

#### **Na máquina de DESENVOLVIMENTO:**

```bash
# 1. Parar servidor local
taskkill /F /IM node.exe  # Windows
# ou
pkill -f "next dev"         # Linux/Mac

# 2. Compactar arquivos para enviar
zip -r deploy.zip app/ components/ lib/ prisma/ public/ scripts/ \
    docker-compose.yml Dockerfile docker-entrypoint.sh \
    package.json next.config.js

# 3. Enviar para máquina de produção (SCP, pendrive, etc.)
```

#### **Na máquina de PRODUÇÃO:**

```bash
# 1. Fazer backup ANTES de tudo
docker exec erp-db pg_dump -U erp -d erp_espaco_mulher > \
    backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql

# 2. Parar aplicação
docker compose stop app

# 3. Copiar novos arquivos (extrair deploy.zip na pasta do projeto)

# 4. Rebuildar
docker compose build app

# 5. Subir
docker compose up -d app

# 6. Verificar
docker ps
curl http://localhost:3001/api/health
```

---

## 📊 MIGRAÇÕES DO BANCO

### As novas tabelas já foram criadas no seu banco local:

- ✅ `product_variations.barcode` (código de barras por variação)
- ✅ `returns`, `return_items`, `exchange_items` (trocas/devoluções)
- ✅ `consignments`, `consignment_items` (consignados)

### Na produção, as migrações são aplicadas automaticamente!

Caso precise aplicar manualmente:

```bash
# Na máquina de produção:
docker exec -i erp-db psql -U erp -d erp_espaco_mulher < migration_variation_barcode.sql
docker exec -i erp-db psql -U erp -d erp_espaco_mulher < migration_returns.sql
docker exec -i erp-db psql -U erp -d erp_espaco_mulher < migration_consignment.sql
```

---

## 💾 SCRIPTS DE BACKUP/RESTORE

### **1. Backup de Produção:**

```bash
# Na máquina de PRODUÇÃO:
./scripts/backup-producao.sh

# Resultado: backups/producao_backup_20260329_143000.sql
```

### **2. Restaurar Produção no Local:**

```bash
# Na máquina de DESENVOLVIMENTO:
./scripts/restaurar-producao-local.sh backups/producao_backup_20260329_143000.sql

# ⚠️ Isso vai APAGAR o banco local e colocar dados de produção!
```

---

## 🔧 CONFIGURAÇÃO DO .env.local (Produção)

Crie o arquivo `.env.local` na máquina de produção:

```env
# Database
DATABASE_URL="postgresql://erp:erp_senha_segura@db:5432/erp_espaco_mulher?schema=public"

# JWT (MUDE EM PRODUÇÃO!)
JWT_SECRET="sua-chave-secreta-muito-forte-aqui-256-bits"

# Admin
ADMIN_EMAIL="admin@erp.com"
ADMIN_PASSWORD="SuaSenhaForte123!"

# Ambiente
NODE_ENV=production
```

⚠️ **IMPORTANTE:** Nunca use a mesma JWT_SECRET do desenvolvimento!

---

## 🌐 PORTAS

| Serviço | Porta Externa | Porta Interna |
|---------|--------------|---------------|
| App     | 3001         | 3000          |
| Banco   | 5433         | 5432          |

Acesse: http://localhost:3001

---

## ✅ CHECKLIST PRÉ-DEPLOY

- [ ] Fiz backup do banco de produção
- [ ] Testei localmente as novas funcionalidades
- [ ] Copiei todos os arquivos necessários
- [ ] Configurei o .env.local com senhas fortes
- [ ] Verifiquei se logo.jpeg está em public/
- [ ] Tenho plano de rollback (backup)

---

## 🆘 ROLLBACK (Se der errado)

```bash
# 1. Parar aplicação
docker compose stop app

# 2. Restaurar banco do backup
docker exec -i erp-db psql -U erp -d erp_espaco_mulher < backup_pre_deploy_xxx.sql

# 3. Voltar para imagem anterior (se tiver)
docker compose up -d app

# Ou rebuildar versão antiga:
# git checkout <commit-anterior>
# docker compose up -d --build
```

---

## 📞 Comandos Úteis

```bash
# Ver logs
docker logs erp-app --tail 50

# Ver status
docker ps

# Restart app
docker compose restart app

# Entrar no container
docker exec -it erp-app sh

# Entrar no banco
docker exec -it erp-db psql -U erp -d erp_espaco_mulher

# Limpar tudo (CUIDADO!)
docker compose down -v  # Remove volumes também!
```

---

## 🎉 RESUMO

1. **Backup** → `./scripts/backup-producao.sh`
2. **Deploy** → `./scripts/deploy-producao.sh`
3. **Restore Local** → `./scripts/restaurar-producao-local.sh <backup.sql>`

**Suporte:** Verifique os logs com `docker logs erp-app --tail 50`

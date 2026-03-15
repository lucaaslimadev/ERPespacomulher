-- scripts/init-db.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Garantir que o usuário tem permissões
GRANT ALL PRIVILEGES ON DATABASE erp_espaco_mulher TO erp;

-- Conectar ao banco específico
\c erp_espaco_mulher;

-- Garantir permissões no schema public
GRANT ALL ON SCHEMA public TO erp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO erp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO erp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO erp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO erp;
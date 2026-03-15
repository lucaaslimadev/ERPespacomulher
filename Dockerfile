# =============================================================================
# ERP Espaço Mulher - Dockerfile de Produção
# Versão otimizada para Windows/macOS com correções de rede extremas
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 - Builder
# -----------------------------------------------------------------------------
FROM node:20-slim AS builder

# Evitar prompts interativos durante o build
ENV DEBIAN_FRONTEND=noninteractive
ENV TERM=xterm

WORKDIR /app

# Instalar dependências necessárias (com correção do debconf)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    apt-utils && \
    rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração do npm primeiro
COPY .npmrc* ./

# Copiar arquivos de dependência (melhora cache)
COPY package.json package-lock.json* ./

# Criar .npmrc se não existir com configurações otimizadas
RUN if [ ! -f .npmrc ]; then \
    echo "fetch-retries=10" >> .npmrc && \
    echo "fetch-retry-factor=4" >> .npmrc && \
    echo "fetch-retry-mintimeout=40000" >> .npmrc && \
    echo "fetch-retry-maxtimeout=240000" >> .npmrc && \
    echo "fetch-timeout=1200000" >> .npmrc && \
    echo "audit=false" >> .npmrc && \
    echo "fund=false" >> .npmrc && \
    echo "registry=https://registry.npmjs.org/" >> .npmrc && \
    echo "maxsockets=3" >> .npmrc && \
    echo "strict-ssl=false" >> .npmrc && \
    echo "prefer-offline=true" >> .npmrc; \
    fi

# Configurar npm globalmente com timeouts extremos
RUN npm config set fetch-retries 10 && \
    npm config set fetch-retry-factor 4 && \
    npm config set fetch-retry-mintimeout 40000 && \
    npm config set fetch-retry-maxtimeout 240000 && \
    npm config set fetch-timeout 1200000 && \
    npm config set audit false && \
    npm config set fund false && \
    npm config set registry https://registry.npmjs.org/ && \
    npm config set maxsockets 3 && \
    npm config set strict-ssl false && \
    npm config set prefer-offline true

# Configuração opcional para binários do Prisma (variável de ambiente, não npm)
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

# Criar diretório para cache do Prisma
RUN mkdir -p /root/.cache/prisma

# Pré-baixar binários do Prisma (falha silenciosa se não conseguir)
RUN npx prisma version --skip-generate || true

# Limpar cache do npm
RUN npm cache clean --force

# Instalar dependências (uma retentativa em caso de falha de rede)
RUN npm install --no-audit --progress=false --fetch-retries=10 --fetch-timeout=120000 || \
    (echo "⚠️ Primeira tentativa falhou. Nova tentativa em 15s..." && sleep 15 && npm cache clean --force && \
     npm install --no-audit --progress=false --fetch-retries=10 --fetch-timeout=120000)

# Verificar se node_modules foi criado
RUN if [ ! -d "node_modules" ]; then \
    echo "❌ Falha na instalação das dependências" && exit 1; \
    else echo "✅ Dependências instaladas com sucesso"; fi

# Prisma generate (usa binários já baixados)
COPY prisma ./prisma
RUN npx prisma generate

# Copiar restante do código
COPY . .

# Garantir pasta public
RUN mkdir -p public

# Variável usada apenas no build
ENV JWT_SECRET=build-placeholder

# Build do Next.js
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2 - Runtime
# -----------------------------------------------------------------------------
FROM node:20-slim AS runner

# Evitar prompts interativos
ENV DEBIAN_FRONTEND=noninteractive
ENV TERM=xterm

WORKDIR /app

# Instalar dependências necessárias
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    wget && \
    rm -rf /var/lib/apt/lists/*

# Criar usuário não-root para segurança
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Variáveis de ambiente
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copiar build do estágio anterior
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json* ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/.npmrc* ./

# Verificar permissões
RUN chmod -R 755 /app

# Copiar e configurar entrypoint
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh 2>/dev/null || true

# Mudar para usuário não-root
USER nextjs

# Porta da aplicação
EXPOSE 3000

# Health check mais robusto
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || wget -qO- http://localhost:3000/api/health || exit 1

# Entrypoint e comando
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
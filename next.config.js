/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build mais rápido: lint pode ser rodado separado (npm run lint)
  eslint: { ignoreDuringBuilds: true },
  // Desabilitar otimizações agressivas em desenvolvimento que podem causar problemas
  swcMinify: true,
  
  // Configurações para desenvolvimento mais estável
  onDemandEntries: {
    // Aumentar o tempo de inatividade antes de descarregar páginas
    maxInactiveAge: 60 * 1000, // 60 segundos
    // Aumentar o buffer de páginas
    pagesBufferLength: 5,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  
  // Headers para melhorar o cache de arquivos estáticos
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

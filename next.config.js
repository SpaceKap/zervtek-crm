/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@inquiry-pooler/db"],
  serverExternalPackages: ["@inquiry-pooler/db", "@prisma/client"],
  // Only use 'standalone' output for production builds
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  compress: true, // Enable gzip compression for API responses
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
}

module.exports = nextConfig

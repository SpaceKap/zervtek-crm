/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use 'standalone' output for production builds
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  compress: true, // Enable gzip compression for API responses
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig

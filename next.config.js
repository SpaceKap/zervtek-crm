/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true, // Enable gzip compression for API responses
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@inquiry-pooler/db", "@prisma/client"],
  },
};

module.exports = nextConfig;

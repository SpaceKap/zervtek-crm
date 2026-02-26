/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@inquiry-pooler/db"],
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@inquiry-pooler/db", "@prisma/client"],
  },
};

module.exports = nextConfig;

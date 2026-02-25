/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@inquiry-pooler/db"],
  serverExternalPackages: ["@inquiry-pooler/db", "@prisma/client"],
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;

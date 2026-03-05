/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@inquiry-pooler/db", "@prisma/client"],
};

module.exports = nextConfig;

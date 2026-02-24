/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@inquiry-pooler/db"],
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;

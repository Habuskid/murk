/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@coinbase/coinbase-sdk"],
  },
}

export default nextConfig

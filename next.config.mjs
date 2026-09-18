/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "@coinbase/cdp-sdk",
      "@x402/core",
      "@x402/evm",
      "@x402/fetch",
    ],
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@x402/core",
    "@x402/evm",
    "@x402/fetch",
  ],
}

export default nextConfig

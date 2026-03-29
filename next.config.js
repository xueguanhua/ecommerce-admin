/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@cloudbase/node-sdk'],
  },
  images: {
    domains: ['localhost', 'mmbiz.qpic.cn'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cos.*.myqcloud.com',
      },
      {
        protocol: 'https',
        hostname: '*.tcb.qcloud.la',
      },
      {
        protocol: 'https',
        hostname: '**.myqcloud.com',
      },
    ],
  },
}

module.exports = nextConfig

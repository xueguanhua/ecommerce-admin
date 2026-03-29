/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@cloudbase/node-sdk'],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  images: {
    unoptimized: true,
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

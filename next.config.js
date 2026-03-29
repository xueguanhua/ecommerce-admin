/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
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

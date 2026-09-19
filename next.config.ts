import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  compress: true,
  images: {
    domains: ['cdn.tarifwerk.eu', 'images.unsplash.com'],
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [64, 128, 256, 384, 512],
  },
  async headers() {
    return [
      {
        source: '/:all*(js|css|png|jpg|jpeg|svg|webp|avif)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(.*)',
        headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:" }],
      },
    ];
  },
};

export default config;

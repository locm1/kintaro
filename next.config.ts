import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: false, // Webhookのためにfalseに設定
  images: {
    unoptimized: true
  },
  
  // Webhookエンドポイントのリダイレクトを防止
  async redirects() {
    return []
  }
};

export default nextConfig;

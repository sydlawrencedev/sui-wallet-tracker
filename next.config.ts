import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@': [path.resolve(__dirname, '.')],
      '@/components': [path.resolve(__dirname, 'components')],
      '@/app': [path.resolve(__dirname, 'app')]
    }
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '.'),
        '@/components': path.resolve(__dirname, 'components'),
        '@/app': path.resolve(__dirname, 'app')
      };
    }
    return config;
  }
};

export default nextConfig;

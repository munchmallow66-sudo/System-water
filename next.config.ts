import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      }
    ]
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zKX2utWUvy4Y@ep-rough-bonus-a1rixpjo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'village-water-management-secret-key-2024',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'dg5rr9ett',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '257974337439388',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || 'LbbpWu6xNMl45u7UogSPXkbHQGk',
  },
};

export default nextConfig;


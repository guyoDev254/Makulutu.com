const path = require('path')
const { loadEnvConfig } = require('@next/env')

// Load .env / .env.local / .env.development* before reading vars (same as Next at runtime).
loadEnvConfig(path.resolve(__dirname))

const isProd = process.env.NODE_ENV === 'production'
// Dev: always expose a local API default so the client bundle never calls production by mistake.
// Prod build: never default to localhost (Vercel must set NEXT_PUBLIC_API_URL or api.ts uses its fallback).
const nextPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (!isProd ? 'http://localhost:2000' : undefined)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Slim image for Docker; leave unset on Vercel.
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.digitaloceanspaces.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.makulutu.com',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '2000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'api.makulutu.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '2000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '2000',
        pathname: '/uploads/**',
      },
    ],
  },
  env: {
    ...(nextPublicApiUrl ? { NEXT_PUBLIC_API_URL: nextPublicApiUrl } : {}),
  },
}

module.exports = nextConfig

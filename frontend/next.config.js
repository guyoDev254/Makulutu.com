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
  env: {
    ...(nextPublicApiUrl ? { NEXT_PUBLIC_API_URL: nextPublicApiUrl } : {}),
  },
}

module.exports = nextConfig

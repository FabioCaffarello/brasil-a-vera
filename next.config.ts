import type { NextConfig } from 'next'

const replitDomain = process.env.REPLIT_DEV_DOMAIN

const nextConfig: NextConfig = {
  allowedDevOrigins: replitDomain
    ? [replitDomain, `*.${replitDomain}`]
    : ['*'],
}

export default nextConfig

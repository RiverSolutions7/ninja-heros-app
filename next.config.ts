import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow dev-mode asset requests from the LAN IP so that mobile devices
  // hitting http://192.168.x.x:3001 can fully hydrate client components.
  // Without this, Next 16 blocks cross-origin dev resources and onClick/
  // onTouch handlers never wire up — the page renders via SSR but taps
  // do nothing. Safe to leave loose in dev; ignored in production.
  allowedDevOrigins: ['192.168.4.32', '*.local', '192.168.*.*'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig

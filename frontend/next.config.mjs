/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Allow PDF uploads up to 10 MB through the server action that forwards
    // them to the backend (Next.js defaults the server-action body limit to
    // 1 MB, which rejects larger PDFs before they reach the API).
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig

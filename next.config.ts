import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/:section(chat|profile|account|history|learning-paths|login|signup|auth|admin)/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
    }];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

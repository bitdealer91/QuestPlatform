/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  webpack: (config) => {
    // Ignore optional node-only prettifier pulled by pino via walletconnect logger
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
      'pino-abstract-transport': false,
      'worker_threads': false,
    };
    // Some dependencies may try to require Node built-ins; ensure they don't break the client bundle
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
};

export default nextConfig;

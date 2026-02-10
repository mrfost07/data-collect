/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for MediaPipe WASM files
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;

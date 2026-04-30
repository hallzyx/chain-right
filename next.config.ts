import type { NextConfig } from "next";

// 0G SDKs necesitan polyfills de Node.js (crypto, stream, buffer, process)
const nextConfig: NextConfig = {
  serverExternalPackages: ["@0glabs/0g-ts-sdk", "@0glabs/0g-serving-broker", "ethers"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      buffer: false,
      process: false,
      url: false,
      path: false,
    };

    return config;
  },
};

export default nextConfig;

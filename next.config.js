/** @type {import('next').NextConfig} */

await import("./env.mjs");

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

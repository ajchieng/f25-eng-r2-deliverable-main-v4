/** @type {import('next').NextConfig} */

// Validate environment variables early during boot.
await import("./env.mjs");

// Next.js runtime configuration for this app.
const nextConfig = {
  // Enables additional React warnings in development.
  reactStrictMode: true,
  images: {
    // Keep image optimization disabled for simpler static/export-friendly behavior.
    unoptimized: true,
  },
};

export default nextConfig;

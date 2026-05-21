/** @type {import('next').NextConfig} */
const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://chickaudit-server.onrender.com"
    : "http://localhost:4000";

const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;

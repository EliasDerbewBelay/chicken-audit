/** @type {import('next').NextConfig} */
const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://chickaudit-server.onrender.com"
    : "http://localhost:4000";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(
  /\/+$/,
  "",
);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

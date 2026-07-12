/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Local dev only: proxy /api/* to the Python dev server (scripts/local_api.py).
    // On Vercel (production/preview), Python functions in api/*.py handle these.
    if (!process.env.USE_LOCAL_API) return [];
    const base = process.env.LOCAL_API_URL ?? "http://127.0.0.1:5328";
    return [
      { source: "/api/ask", destination: `${base}/ask` },
      { source: "/api/anatomy", destination: `${base}/anatomy` },
      { source: "/api/diagnose", destination: `${base}/diagnose` },
    ];
  },
};

export default nextConfig;

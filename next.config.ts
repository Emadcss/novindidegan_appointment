import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // درایور PostgreSQL فقط سمت سرور است و نباید باندل شود
  serverExternalPackages: ["pg"],
};

export default nextConfig;

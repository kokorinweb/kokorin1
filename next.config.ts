import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ИИ-помощник ходит наружу — держим SDK только на Node-рантайме.
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;

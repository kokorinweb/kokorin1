import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Telegram-вебхук и чат ИИ ходят наружу — держим их только на Node-рантайме.
  serverExternalPackages: ["grammy", "@anthropic-ai/sdk"],
};

export default nextConfig;

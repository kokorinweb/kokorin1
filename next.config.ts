import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Телеграм-вебхук, чат ИИ и драйверы базы ходят наружу или тянут нативные
  // модули — держим их только на Node-рантайме, без сборки в бандл.
  serverExternalPackages: ["grammy", "@anthropic-ai/sdk", "pg", "@electric-sql/pglite"],
};

export default nextConfig;

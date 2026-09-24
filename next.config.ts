import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 собирает статику в out/ для показа по ссылке.
 *
 * Помощник в этой сборке работает по заранее заданным вопросам: серверного
 * роута нет, а значит нет и ключа, который пришлось бы куда-то класть.
 * Пути к ассетам относительные, чтобы папку можно было положить куда угодно.
 */
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // ИИ-помощник ходит наружу — держим SDK только на Node-рантайме.
  serverExternalPackages: ["@anthropic-ai/sdk"],
  ...(isExport
    ? { output: "export" as const, assetPrefix: "./", images: { unoptimized: true } }
    : {}),
};

export default nextConfig;

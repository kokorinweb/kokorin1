import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Превью проектов — собственные SVG из public/. Оптимизатор изображений
  // для них ничего не даёт (вектор и так масштабируется), поэтому они
  // отдаются обычным тегом, а не next/image.
  reactStrictMode: true,
};

export default nextConfig;

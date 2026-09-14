import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Картинки в /public опциональны: пока файла нет, сцена рисуется градиентом.
 * Проверяем наличие на сервере, чтобы не отдавать браузеру заведомо битый src.
 * Какие файлы ищет сайт — перечислено в public/README.md.
 */
export function publicImage(file: string): string | null {
  return existsSync(join(process.cwd(), "public", file)) ? `/${file}` : null;
}

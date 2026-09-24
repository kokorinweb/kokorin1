import { readdirSync } from "node:fs";
import path from "node:path";

/**
 * Какие фотографии реально лежат в public/photos.
 *
 * Читаем каталог один раз при сборке. Пока файла нет, вместо <img> рисуется
 * иллюстрация — и браузер не ходит впустую за несуществующей картинкой.
 * Положили файл — пересобрали, он встал на место сам.
 */
const PHOTO_DIR = path.join(process.cwd(), "public", "photos");
const EXTENSIONS = ["avif", "webp", "jpg", "jpeg", "png"];

const available: string[] = (() => {
  try {
    return readdirSync(PHOTO_DIR);
  } catch {
    // Каталога нет — значит и фотографий нет. Это нормальное состояние.
    return [];
  }
})();

/** Путь к фотографии с таким именем или null, если её ещё не прислали. */
export function photoSrc(name: string): string | null {
  for (const extension of EXTENSIONS) {
    const file = `${name}.${extension}`;
    if (available.includes(file)) return `/photos/${file}`;
  }
  return null;
}

import type { ReactNode } from "react";
import { photoSrc } from "@/lib/photos";

type PhotoProps = {
  /** Имя файла без расширения: kitchens → public/photos/kitchens.jpg */
  name: string;
  alt: string;
  /** Для картинок над сгибом: грузим сразу и с высоким приоритетом. */
  priority?: boolean;
  className?: string;
  /** Иллюстрация-подложка: видна, пока фотографии нет. */
  children: ReactNode;
};

/**
 * Фотография с рисованной подложкой.
 *
 * Пока в public/photos пусто, посетитель видит иллюстрацию. Появился файл с
 * нужным именем — он встаёт на её место без единой правки в коде.
 */
export function Photo({ name, alt, priority = false, className, children }: PhotoProps) {
  const src = photoSrc(name);

  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- обычный файл из public, без оптимизатора
        <img
          src={src}
          alt={alt}
          width={1200}
          height={900}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        children
      )}
    </span>
  );
}

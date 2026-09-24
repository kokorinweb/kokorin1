/**
 * Статическая сборка для показа по ссылке.
 *
 * App Router не умеет экспортировать POST-роуты, поэтому на время сборки
 * уводим src/app/api в папку с подчёркиванием (такие папки роутер не видит),
 * а потом возвращаем обратно — в том числе если сборка упала.
 */
import { execFileSync } from "node:child_process";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const api = path.join(root, "src", "app", "api");
const parked = path.join(root, "src", "app", "_api-parked-for-export");

if (existsSync(parked)) {
  throw new Error(`Осталась папка от прошлой сборки: ${parked}. Верните её в src/app/api вручную.`);
}

const hasApi = existsSync(api);
if (hasApi) renameSync(api, parked);

try {
  rmSync(path.join(root, "out"), { recursive: true, force: true });
  execFileSync("npx", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1", NEXT_PUBLIC_DEMO: "1" },
  });
} finally {
  if (hasApi) renameSync(parked, api);
}

// GitHub Pages прогоняет содержимое через Jekyll и выбрасывает папки на
// подчёркивание — а Next кладёт всё в _next. Этот файл выключает Jekyll.
writeFileSync(path.join(root, "out", ".nojekyll"), "");

console.log("\nГотово: out/");

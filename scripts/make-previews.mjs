/**
 * Рисует превью проектов в public/shots/*.svg.
 *
 * Это нарисованные миниатюры композиций, а не скриншоты реальных сайтов —
 * так и подписано в блоке подборки. Каждая миниатюра собрана в палитре
 * своего кейса, поэтому ряд плиток читается как разные работы, а не как
 * повторённый шаблон.
 *
 * Запуск: node scripts/make-previews.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/shots");

const W = 600;
const H = 400;

/** Палитры повторяют `palette` из src/content/site.ts: [фон, акцент, светлый]. */
const projects = [
  { id: "lumen-english", name: "LUMEN", bg: "#1B1F3B", accent: "#F5C451", light: "#EEF1FF" },
  { id: "arca-residence", name: "ARCA", bg: "#141310", accent: "#C9B08A", light: "#EDE7DC" },
  { id: "luna-residence", name: "ЛУНА", bg: "#10151C", accent: "#7FA8D8", light: "#E6EDF5" },
  { id: "glow-beauty", name: "GLOW", bg: "#2A1520", accent: "#E88FA8", light: "#FBEEF2" },
  { id: "strata", name: "STRATA", bg: "#07070A", accent: "#C6F24E", light: "#D8DCE0" },
  { id: "severa", name: "SEVERA", bg: "#0B1418", accent: "#6FD4CE", light: "#DCE9EA" },
];

const alpha = (hex, a) => {
  const v = hex.replace("#", "");
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const chrome = (p) => `
  <rect x="0" y="0" width="${W}" height="34" fill="${alpha(p.light, 0.05)}"/>
  <text x="26" y="22" font-family="Helvetica, Arial, sans-serif" font-size="11"
        font-weight="700" letter-spacing="1.6" fill="${p.light}">${p.name}</text>
  ${[0, 1, 2].map((i) => `<rect x="${452 + i * 34}" y="15" width="22" height="4" rx="2" fill="${alpha(p.light, 0.3)}"/>`).join("")}
  <rect x="552" y="11" width="30" height="13" rx="6.5" fill="${p.accent}"/>
`;

const bars = (x, y, widths, h, fill, gap = 12) =>
  widths
    .map((w, i) => `<rect x="${x}" y="${y + i * (h + gap)}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`)
    .join("");

/** Первый экран: крупный заголовок, кнопка и массивный блок изображения. */
const layoutHero = (p) => `
  ${chrome(p)}
  <defs>
    <linearGradient id="g-${p.id}-hero" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${alpha(p.accent, 0.85)}"/>
      <stop offset="55%" stop-color="${alpha(p.accent, 0.22)}"/>
      <stop offset="100%" stop-color="${alpha(p.light, 0.05)}"/>
    </linearGradient>
  </defs>
  <rect x="330" y="66" width="244" height="292" rx="16" fill="url(#g-${p.id}-hero)"/>
  <circle cx="452" cy="196" r="62" fill="${alpha(p.bg, 0.55)}"/>
  ${bars(26, 84, [252, 210, 168], 22, p.light, 14)}
  ${bars(26, 200, [214, 176], 7, alpha(p.light, 0.38), 12)}
  <rect x="26" y="244" width="116" height="34" rx="17" fill="${p.accent}"/>
  <rect x="154" y="244" width="104" height="34" rx="17" fill="none" stroke="${alpha(p.light, 0.3)}" stroke-width="1.5"/>
  ${[0, 1, 2]
    .map(
      (i) => `<g>
        <rect x="${26 + i * 100}" y="312" width="24" height="24" rx="6" fill="${alpha(p.accent, 0.3)}"/>
        <rect x="${26 + i * 100}" y="346" width="66" height="5" rx="2.5" fill="${alpha(p.light, 0.28)}"/>
      </g>`,
    )
    .join("")}
`;

/** Сетка карточек: каталог, тарифы, услуги. */
const layoutGrid = (p) => `
  ${chrome(p)}
  ${bars(26, 62, [206], 18, p.light, 0)}
  ${bars(26, 92, [284], 6, alpha(p.light, 0.32), 0)}
  ${[0, 1, 2, 3, 4, 5]
    .map((i) => {
      const x = 26 + (i % 3) * 186;
      const y = 128 + Math.floor(i / 3) * 136;
      const lead = i === 1 || i === 3;
      return `<g>
        <rect x="${x}" y="${y}" width="162" height="116" rx="12"
              fill="${lead ? alpha(p.accent, 0.16) : alpha(p.light, 0.05)}"
              stroke="${lead ? alpha(p.accent, 0.45) : alpha(p.light, 0.1)}" stroke-width="1"/>
        <rect x="${x + 14}" y="${y + 14}" width="${lead ? 30 : 22}" height="${lead ? 30 : 22}" rx="7"
              fill="${lead ? p.accent : alpha(p.light, 0.22)}"/>
        <rect x="${x + 14}" y="${y + 58}" width="104" height="8" rx="4" fill="${alpha(p.light, 0.6)}"/>
        <rect x="${x + 14}" y="${y + 74}" width="128" height="5" rx="2.5" fill="${alpha(p.light, 0.24)}"/>
        <rect x="${x + 14}" y="${y + 86}" width="88" height="5" rx="2.5" fill="${alpha(p.light, 0.24)}"/>
      </g>`;
    })
    .join("")}
`;

/** Разворот: текстовая колонка рядом с большим медиаблоком. */
const layoutSplit = (p) => `
  ${chrome(p)}
  <defs>
    <linearGradient id="g-${p.id}-split" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="${alpha(p.accent, 0.6)}"/>
      <stop offset="100%" stop-color="${alpha(p.light, 0.07)}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="34" width="268" height="366" fill="url(#g-${p.id}-split)"/>
  <rect x="44" y="120" width="180" height="180" rx="90" fill="${alpha(p.bg, 0.45)}"/>
  ${bars(300, 76, [232, 190], 20, p.light, 12)}
  ${bars(300, 148, [248, 228, 196], 6, alpha(p.light, 0.34), 11)}
  <rect x="300" y="216" width="124" height="32" rx="16" fill="${p.accent}"/>
  <rect x="300" y="276" width="274" height="1" fill="${alpha(p.light, 0.14)}"/>
  ${[0, 1, 2]
    .map(
      (i) => `<g>
        <rect x="300" y="${294 + i * 32}" width="${[54, 40, 62][i]}" height="12" rx="6" fill="${alpha(p.accent, 0.75)}"/>
        <rect x="${366 + [0, 0, 0][i]}" y="${298 + i * 32}" width="${[150, 178, 132][i]}" height="5" rx="2.5" fill="${alpha(p.light, 0.26)}"/>
      </g>`,
    )
    .join("")}
`;

const layouts = { hero: layoutHero, grid: layoutGrid, split: layoutSplit };

mkdirSync(outDir, { recursive: true });

let count = 0;
for (const p of projects) {
  for (const [kind, render] of Object.entries(layouts)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  ${render(p).trim()}
</svg>
`;
    writeFileSync(resolve(outDir, `${p.id}-${kind}.svg`), svg, "utf8");
    count += 1;
  }
}

console.log(`Готово: ${count} превью в public/shots/`);

import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "../globals.css";
import "./helix.css";
import { ScrollReveal } from "@/components/ScrollReveal";

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

/** Моноширинный только для служебных подписей: счётчика кадров, ярлыков, подсказок. */
const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600"],
  variable: "--font-jet",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NUCLEA — геномная диагностика",
  description:
    "Полногеномное секвенирование с покрытием 30×: от пробирки до клинического отчёта за шесть часов.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

/**
 * Отдельный root layout: у сцены нет ни шапки ресторана, ни корзины, ни чата —
 * ничего, что могло бы влезть в кадр.
 */
export default function ExperienceLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${sans.variable} ${mono.variable} hx-root`}>
      <body className="void">
        {children}
        <ScrollReveal />
      </body>
    </html>
  );
}

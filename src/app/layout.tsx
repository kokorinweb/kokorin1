import type { Metadata, Viewport } from "next";
import { Akt, Golos_Text } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { site } from "@/content/site";

// Akt — кириллический гротеск Дмитрия Гренева. Переменная ось веса даёт
// контраст между сверхтонким и чёрным начертанием без второй гарнитуры.
const akt = Akt({
  subsets: ["latin", "cyrillic"],
  variable: "--font-akt",
  display: "swap",
});

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  variable: "--font-golos",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.brand} — сайты и автоматизация для бизнеса`,
    template: `%s · ${site.brand}`,
  },
  description:
    "Создаю сайты и автоматизации, которые понятно объясняют ценность бизнеса, собирают заявки и уверенно работают после запуска.",
  openGraph: {
    title: `${site.brand} — сайты и автоматизация для бизнеса`,
    description:
      "Разработка сайтов, интернет-магазины, ИИ-ассистенты, Telegram-боты и автоматизация заявок.",
    locale: "ru_RU",
    type: "website",
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${akt.variable} ${golos.variable}`}>
      <head>
        {/*
          Ставим флаг js до первой отрисовки: правила появления секций висят
          на html.js, поэтому без скрипта контент просто виден, а со скриптом
          нет вспышки уже показанного блока.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
      </head>
      <body>
        <SmoothScroll />
        <a
          href="#main"
          className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
        >
          К содержимому
        </a>
        {children}
      </body>
    </html>
  );
}

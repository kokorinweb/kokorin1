import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { RESTAURANT } from "@/lib/restaurant";

const serif = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${RESTAURANT.name} — ${RESTAURANT.tagline}`,
    template: `%s · ${RESTAURANT.name}`,
  },
  description: `Итальянский ресторан в центре Москвы: паста ручной работы, пицца на дровах, доставка ${RESTAURANT.delivery.zone}.`,
  openGraph: {
    title: `${RESTAURANT.name} — ${RESTAURANT.tagline}`,
    description: "Паста ручной работы, неаполитанская пицца на дровах, доставка и самовывоз.",
    locale: "ru_RU",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f0",
};

/**
 * Корневой layout держит только то, что общее у сайта и админки: html, шрифты,
 * стили. Шапка с корзиной и подвал переехали в группу (site) — в админке
 * они не нужны.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

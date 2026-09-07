import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { RESTAURANT, siteUrl } from "@/lib/restaurant";

const serif = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-code",
  display: "swap",
});

const description =
  "Японский ресторан НОРИ на Малой Бронной: охлаждённая рыба каждое утро, авторские роллы и сеты. Бронь столика по схеме зала и предзаказ блюд к вашему приходу.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${RESTAURANT.name} — ${RESTAURANT.tagline}`,
    template: `%s · ${RESTAURANT.name}`,
  },
  description,
  keywords: ["японский ресторан", "суши", "роллы", "бронь столика", "Москва", "НОРИ"],
  openGraph: {
    title: `${RESTAURANT.name} — ${RESTAURANT.tagline}`,
    description,
    locale: "ru_RU",
    type: "website",
    siteName: RESTAURANT.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Кандзи в декоре. Google отдаёт unicode-range, поэтому качается только нужный кусок. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&display=swap"
        />
        {/* Помечаем документ до первой отрисовки: только тогда включается scroll-reveal. */}
        <script
          dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("js")' }}
        />
      </head>
      <body className="flex min-h-dvh flex-col bg-ink">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-shu focus:px-5 focus:py-2.5 focus:font-semibold focus:text-ink"
        >
          К содержимому
        </a>
        <CartProvider>
          <Header />
          <main id="content" className="flex-1">
            {children}
          </main>
          <Footer />
          <ChatWidget />
        </CartProvider>
      </body>
    </html>
  );
}

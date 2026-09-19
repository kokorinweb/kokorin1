import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Догоняй — сводки групповых чатов",
  description:
    "Бот для Telegram: пересказывает, что было в групповом чате, и присылает персональное «что я пропустил».",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}

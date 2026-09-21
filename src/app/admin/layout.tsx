import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Панель заказов",
  // Админку в поиске видеть незачем.
  robots: { index: false, follow: false },
};

/** Внешняя оболочка админки: только фон. Проверка входа — в группе (panel). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-panel text-ink">{children}</div>;
}

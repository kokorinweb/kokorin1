import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";

/**
 * Единственная точка проверки входа для всех страниц панели.
 * Страница /admin/login лежит вне этой группы — иначе редирект зациклится.
 *
 * Экспорты роутов (CSV) проверяют сессию у себя: обработчики маршрутов
 * не проходят через layout.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentSession())) redirect("/admin/login");
  return <>{children}</>;
}

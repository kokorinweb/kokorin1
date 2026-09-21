"use client";

import { usePathname } from "next/navigation";
import { ButtonLink } from "./ui";

/**
 * Главное действие на узком экране. На самой странице нового заказа кнопка
 * скрыта: кнопка, ведущая туда, где ты уже стоишь, — это шум.
 */
export function MobilePrimary() {
  const pathname = usePathname();
  if (pathname === "/admin/orders/new") return null;

  return (
    <div className="lg:hidden">
      <ButtonLink href="/admin/orders/new" tone="primary" className="w-full">
        Новый заказ
      </ButtonLink>
    </div>
  );
}

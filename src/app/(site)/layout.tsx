/**
 * Оболочка публичного сайта: корзина, шапка, подвал, виджет ИИ-консультанта.
 *
 * Админка живёт в /admin и в эту группу не входит намеренно: менеджеру не нужны
 * ни корзина, ни чат с Лукой, ни подвал с часами работы — ему нужен стол заказов.
 */
import { CartProvider } from "@/components/CartContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="paper flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatWidget />
      </div>
    </CartProvider>
  );
}

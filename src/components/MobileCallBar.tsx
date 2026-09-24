"use client";

import { useEffect, useState } from "react";
import { COMPANY, PHONE_HREF, WHATSAPP_GREETING, whatsappUrl } from "@/lib/company";
import { PhoneIcon, WhatsappIcon } from "./Icons";

/**
 * Липкая панель на телефоне. Сайт для мебельщика смотрят с телефона и почти
 * всегда заканчивают звонком или сообщением — держим оба действия под пальцем.
 *
 * Пока на экране секция заявки, панель уезжает вниз: там у человека уже есть
 * поле ввода и своя кнопка отправки, и перекрывать их плавающей панелью —
 * значит мешать ровно в тот момент, ради которого всё и затевалось.
 */
export function MobileCallBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const brief = document.getElementById("brief");
    if (!brief) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      // Реагируем, когда секция занимает заметную часть экрана, а не краем.
      { threshold: 0.25 },
    );
    observer.observe(brief);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sand/95 backdrop-blur-md transition-transform duration-300 md:hidden ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex gap-2 p-3">
        <a
          href={whatsappUrl(WHATSAPP_GREETING)}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={hidden ? -1 : undefined}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-walnut px-4 py-3.5 text-sm font-semibold text-sand transition-colors duration-200 hover:bg-walnut-deep"
          style={{ touchAction: "manipulation" }}
        >
          <WhatsappIcon className="h-5 w-5" />
          WhatsApp
        </a>
        <a
          href={PHONE_HREF}
          aria-label={`Позвонить по номеру ${COMPANY.phone}`}
          tabIndex={hidden ? -1 : undefined}
          className="flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-surface px-6 py-3.5 text-sm font-semibold transition-colors duration-200 hover:border-walnut hover:text-walnut"
          style={{ touchAction: "manipulation" }}
        >
          <PhoneIcon className="h-5 w-5" />
          Позвонить
        </a>
      </div>
    </div>
  );
}

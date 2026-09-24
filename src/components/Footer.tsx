import { COMPANY, PHONE_HREF } from "@/lib/company";
import { Logomark } from "./Icons";

export function Footer() {
  return (
    <footer className="border-t border-line bg-sand-deep">
      {/* Нижний отступ — чтобы липкая панель на телефоне не накрывала текст. */}
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-12 sm:px-6 md:pb-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <Logomark className="h-10 w-10 shrink-0" />
            <div>
              <p className="display text-lg leading-tight" translate="no">
                {COMPANY.name}
              </p>
              <p className="text-sm text-ink-soft">{COMPANY.tagline}</p>
            </div>
          </div>

          <address className="not-italic text-sm leading-relaxed text-ink-soft">
            <p>{COMPANY.address}</p>
            <p>{COMPANY.hours}</p>
            <p className="mt-1">
              <a href={PHONE_HREF} className="font-semibold text-ink tabular-nums hover:text-walnut">
                {COMPANY.phone}
              </a>
              <span className="ml-2">— телефон, WhatsApp и Viber</span>
            </p>
          </address>

          <p className="text-sm text-ink-soft">
            <a
              href={COMPANY.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-walnut"
            >
              Карточка на Яндекс Картах
            </a>
          </p>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-soft">
          © {new Date().getFullYear()} {COMPANY.name}, {COMPANY.city}. Мебель по индивидуальным
          размерам.
        </p>
      </div>
    </footer>
  );
}

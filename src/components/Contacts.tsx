import { COMPANY, PHONE_HREF, WHATSAPP_GREETING, whatsappUrl } from "@/lib/company";
import { ClockIcon, PhoneIcon, PinIcon, WhatsappIcon } from "./Icons";

export function Contacts() {
  return (
    <section id="contacts" className="grain relative overflow-hidden bg-night text-sand">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(44rem 24rem at 80% 0%, rgba(184,137,43,0.22), transparent 62%)",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brass">Контакты</p>
            <h2 className="display mt-3 text-4xl leading-tight sm:text-5xl">
              Приезжайте или напишите
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-sand/70 text-pretty">
              Проще всего — в WhatsApp: можно сразу прислать фото помещения и размеры, даже
              приблизительные.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappUrl(WHATSAPP_GREETING)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-brass px-7 py-4 font-semibold text-night transition-opacity duration-200 hover:opacity-90"
                style={{ touchAction: "manipulation" }}
              >
                <WhatsappIcon className="h-5 w-5" />
                Написать в WhatsApp
              </a>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center justify-center gap-2.5 rounded-full border border-sand/25 px-7 py-4 font-semibold transition-colors duration-200 hover:border-brass hover:text-brass"
                style={{ touchAction: "manipulation" }}
              >
                <PhoneIcon className="h-5 w-5" />
                <span className="tabular-nums">{COMPANY.phone}</span>
              </a>
            </div>
          </div>

          <dl className="space-y-7 lg:pt-16">
            <div className="flex gap-4">
              <PinIcon className="mt-0.5 h-6 w-6 shrink-0 text-brass" />
              <div className="min-w-0">
                <dt className="text-sm text-sand/55">Адрес</dt>
                <dd className="mt-1 text-lg">{COMPANY.address}</dd>
                <dd className="mt-1.5">
                  <a
                    href={COMPANY.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brass underline decoration-brass/40 underline-offset-4 transition-opacity duration-200 hover:opacity-80"
                  >
                    Открыть на Яндекс Картах
                  </a>
                </dd>
              </div>
            </div>

            <div className="flex gap-4">
              <ClockIcon className="mt-0.5 h-6 w-6 shrink-0 text-brass" />
              <div className="min-w-0">
                <dt className="text-sm text-sand/55">Время работы</dt>
                <dd className="mt-1 text-lg">{COMPANY.hours}</dd>
              </div>
            </div>

            <div className="flex gap-4">
              <PhoneIcon className="mt-0.5 h-6 w-6 shrink-0 text-brass" />
              <div className="min-w-0">
                <dt className="text-sm text-sand/55">Телефон, WhatsApp и Viber</dt>
                <dd className="mt-1 text-lg tabular-nums">
                  <a href={PHONE_HREF} className="transition-colors duration-200 hover:text-brass">
                    {COMPANY.phone}
                  </a>
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

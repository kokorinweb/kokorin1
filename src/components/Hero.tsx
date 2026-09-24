import { COMPANY, PHONE_HREF, WHATSAPP_GREETING, whatsappUrl } from "@/lib/company";
import { MaterialsBoard } from "./Art";
import { ClockIcon, PhoneIcon, PinIcon, WhatsappIcon } from "./Icons";

const FACTS = [
  { Icon: PinIcon, text: COMPANY.addressShort },
  { Icon: ClockIcon, text: "Ежедневно 10:00 — 20:00" },
  { Icon: WhatsappIcon, text: "Отвечаем в WhatsApp" },
];

export function Hero() {
  return (
    <section className="grain glow relative overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24 lg:pt-20">
        <div className="rise relative z-10">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-walnut/25 bg-surface/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-walnut">
            {COMPANY.city} и ближайшие районы
          </p>

          <h1 className="display text-[2.6rem] leading-[1.06] sm:text-6xl lg:text-[4.1rem]">
            Мебель на заказ
            <br />в {COMPANY.city}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft text-pretty">
            {COMPANY.subtitle}. Делаем по вашим размерам — под нишу, под скос потолка и под
            технику, которая уже куплена.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappUrl(WHATSAPP_GREETING)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-walnut px-7 py-4 text-base font-semibold text-sand transition-colors duration-200 hover:bg-walnut-deep"
              style={{ touchAction: "manipulation" }}
            >
              <WhatsappIcon className="h-5 w-5" />
              Обсудить проект в WhatsApp
            </a>
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-ink/15 bg-surface px-7 py-4 text-base font-semibold transition-colors duration-200 hover:border-walnut hover:text-walnut"
              style={{ touchAction: "manipulation" }}
            >
              <PhoneIcon className="h-5 w-5" />
              <span className="tabular-nums">{COMPANY.phone}</span>
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-ink-soft">
            {FACTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2 whitespace-nowrap">
                <Icon className="h-4 w-4 shrink-0 text-walnut" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div
            className="absolute inset-6 rounded-[2.5rem] bg-walnut/10 blur-2xl"
            aria-hidden="true"
          />
          <MaterialsBoard className="rise relative h-auto w-full mx-auto max-w-xl drop-shadow-xl" />
        </div>
      </div>
    </section>
  );
}

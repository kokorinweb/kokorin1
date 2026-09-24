import { COMPANY, PHONE_HREF, WHATSAPP_GREETING, whatsappUrl } from "@/lib/company";
import { Logomark, WhatsappIcon } from "./Icons";

const NAV = [
  { href: "#catalog", label: "Каталог" },
  { href: "#works", label: "Как это выглядит" },
  { href: "#brief", label: "Заявка" },
  { href: "#contacts", label: "Контакты" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-sand/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a href="#main" className="flex min-w-0 items-center gap-3">
          <Logomark className="h-10 w-10 shrink-0" />
          <span className="min-w-0">
            <span className="display block truncate text-lg leading-tight" translate="no">
              {COMPANY.name}
            </span>
            <span className="block truncate text-xs tracking-wide text-ink-soft">
              Мебель на заказ · {COMPANY.city}
            </span>
          </span>
        </a>

        <nav aria-label="Разделы сайта" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-7 text-sm font-medium">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-ink-soft transition-colors duration-200 hover:text-walnut"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-6">
          <a
            href={PHONE_HREF}
            className="hidden whitespace-nowrap text-sm font-semibold tabular-nums transition-colors duration-200 hover:text-walnut sm:block"
          >
            {COMPANY.phone}
          </a>
          <a
            href={whatsappUrl(WHATSAPP_GREETING)}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full bg-walnut px-5 py-2.5 text-sm font-semibold text-sand transition-colors duration-200 hover:bg-walnut-deep md:inline-flex"
          >
            <WhatsappIcon className="h-4 w-4" />
            Написать
          </a>
        </div>
      </div>
    </header>
  );
}

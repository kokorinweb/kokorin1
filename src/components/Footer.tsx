import { footer, site } from "@/content/site";

/**
 * Страница заканчивается якорем, а не затухает: имя во всю ширину закрывает
 * композицию тем же знаком, с которого она началась.
 */
export function Footer() {
  return (
    <footer className="relative overflow-hidden pt-10">
      <div className="shell">
        <p
          aria-hidden="true"
          className="display select-none"
          style={{
            fontSize: "clamp(3rem, 15.5vw, 14rem)",
            lineHeight: 0.78,
            letterSpacing: "-0.045em",
            color: "var(--color-ink-high)",
          }}
        >
          {site.brand}
        </p>

        <div
          className="mt-10 flex flex-col gap-6 border-t py-8 md:flex-row md:items-center md:justify-between"
          style={{ borderColor: "var(--color-line)" }}
        >
          <div>
            <p className="display text-[0.95rem]" style={{ fontWeight: 800 }}>
              {site.legalName}
            </p>
            <p className="mt-1 text-[0.875rem]" style={{ color: "var(--color-fg-soft)" }}>
              {site.tagline}
            </p>
          </div>

          <nav aria-label="Документы" className="flex flex-wrap gap-x-7 gap-y-2">
            {footer.legal.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[0.8125rem] transition-colors duration-200 hover:text-[var(--color-fg)]"
                style={{ color: "var(--color-fg-mute)" }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <p className="label">{footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}

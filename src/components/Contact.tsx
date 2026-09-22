import { Icon, type IconName } from "./Icon";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { contact } from "@/content/site";

const channelIcon: Record<string, IconName> = {
  telegram: "telegram",
  instagram: "instagram",
  email: "mail",
};

/**
 * Закрывающая секция. Каналы связи показаны крупными строками, а не
 * мелкими значками: это последнее действие страницы, и оно должно быть
 * самым заметным на экране.
 */
export function Contact() {
  return (
    <section id="contact" className="section">
      <div className="shell">
        <SectionHead
          index={contact.index}
          kicker={contact.kicker}
          title={contact.title}
          lead={contact.lead}
        />

        <ul className="border-t" style={{ borderColor: "var(--color-line)" }}>
          {contact.channels.map((channel, i) => (
            <Reveal as="li" key={channel.kind} delay={Math.min(i, 3) * 70}>
              <a
                href={channel.href}
                target={channel.kind === "email" ? undefined : "_blank"}
                rel={channel.kind === "email" ? undefined : "noreferrer noopener"}
                className="group flex items-center gap-5 border-b py-6 transition-colors duration-300 md:gap-8 md:py-8"
                style={{
                  borderColor: "var(--color-line)",
                  transitionTimingFunction: "var(--ease-out-soft)",
                }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 group-hover:border-[var(--color-acid)] group-hover:text-[var(--color-acid)] md:h-14 md:w-14"
                  style={{
                    borderColor: "var(--color-line-strong)",
                    color: "var(--color-fg-soft)",
                  }}
                >
                  <Icon name={channelIcon[channel.kind]} size={21} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="label block">{channel.label}</span>
                  <span
                    className="display mt-1.5 block truncate text-[clamp(1.25rem,3vw,2.25rem)] transition-colors duration-300 group-hover:text-[var(--color-acid)]"
                    style={{ fontWeight: 700 }}
                  >
                    {channel.value}
                  </span>
                </span>

                <Icon
                  name="arrow-up-right"
                  size={22}
                  className="shrink-0 opacity-35 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:opacity-100"
                />
              </a>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
          {contact.badges.map((badge) => (
            <span key={badge} className="flex items-center gap-2.5">
              <Icon name="check" size={15} style={{ color: "var(--color-acid)" }} />
              <span className="text-[0.875rem]" style={{ color: "var(--color-fg-soft)" }}>
                {badge}
              </span>
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

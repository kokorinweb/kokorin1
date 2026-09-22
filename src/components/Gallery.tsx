"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { cases, gallery } from "@/content/site";
import type { DriftWallItem } from "./DriftWall";

// Стена живёт только в браузере: на сервере от неё нет ни разметки,
// ни смысла, а анимационный цикл тянуть в SSR незачем.
const DriftWall = dynamic(() => import("./DriftWall"), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden="true" />,
});

const LAYOUTS = ["hero", "split", "grid"] as const;

export function Gallery() {
  // Перемешиваем детерминированно: соседние плитки должны быть из разных
  // проектов, но порядок обязан совпадать между сборками.
  const items = useMemo<DriftWallItem[]>(() => {
    const flat: DriftWallItem[] = LAYOUTS.flatMap((layout) =>
      cases.items.map((item) => ({
        image: `/shots/${item.id}-${layout}.svg`,
        title: item.title,
        href: item.href,
      })),
    );

    // Шаг взаимно прост с длиной набора, поэтому обход задевает каждую
    // плитку ровно один раз и разводит одинаковые проекты по колонкам.
    const step = 5;
    return flat.map((_, i) => flat[(i * step) % flat.length]);
  }, []);

  return (
    <section id="gallery" className="section">
      <div className="shell">
        <SectionHead
          index={gallery.index}
          kicker={gallery.kicker}
          title={gallery.title}
          lead={gallery.lead}
        />
      </div>

      {/* Стена идёт во всю ширину: её край — часть эффекта, а не обрезка */}
      <Reveal className="relative h-[22rem] w-full sm:h-[28rem] md:h-[34rem]">
        <DriftWall
          items={items}
          columns={5}
          tileWidth={224}
          tileHeight={150}
          gap={20}
          radius={12}
          tilt={14}
          turn={-13}
          perspective={1150}
          depth={130}
          speed={38}
          direction="up"
          variance={0.42}
          parallax={0.55}
          lift={58}
          fade={0.58}
          dim={0.68}
          overlayColor="#07070a"
        />
      </Reveal>

      <div className="shell">
        <p className="mt-6 text-[0.8125rem] leading-[1.5]" style={{ maxWidth: "58ch", color: "var(--color-fg-mute)" }}>
          {gallery.note}
        </p>
      </div>
    </section>
  );
}

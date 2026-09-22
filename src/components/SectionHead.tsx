import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/**
 * Номер секции здесь не украшение: он показан как позиция в общей
 * последовательности (03 / 08), то есть сообщает, где читатель находится.
 */
export function SectionHead({
  index,
  total = "08",
  kicker,
  title,
  lead,
  aside,
}: {
  index: string;
  total?: string;
  kicker: string;
  title: string;
  lead?: string;
  aside?: ReactNode;
}) {
  return (
    <Reveal className="section-head">
      <div className="hairline flex items-baseline gap-3 pt-5">
        <span className="label tnum" style={{ color: "var(--color-acid)" }}>
          {index}
        </span>
        <span className="label tnum" aria-hidden="true">
          / {total}
        </span>
        <span className="label ml-2">{kicker}</span>
      </div>

      <div className="mt-8 grid gap-x-12 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-end">
        <h2 className="display-section whitespace-pre-line">{title}</h2>
        {lead ? <p className="lead md:pb-2">{lead}</p> : null}
        {aside}
      </div>
    </Reveal>
  );
}

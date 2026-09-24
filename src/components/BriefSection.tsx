"use client";

import { useRef, useState } from "react";
import { BriefChat } from "./BriefChat";
import { BriefForm } from "./BriefForm";

const TABS = [
  { id: "chat", label: "Собрать с помощником" },
  { id: "form", label: "Обычная форма" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const NOTES = [
  "Размеры можно приблизительные",
  "Заявка уходит в WhatsApp одним сообщением",
  "Без регистрации и личного кабинета",
];

export function BriefSection({ aiEnabled }: { aiEnabled: boolean }) {
  const [tab, setTab] = useState<TabId>("chat");
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  /** Переключение вкладок стрелками — этого ждёт любой, кто ходит с клавиатуры. */
  function handleTabKeys(event: React.KeyboardEvent<HTMLButtonElement>) {
    const order = TABS.map((item) => item.id);
    const index = order.indexOf(tab);

    const next =
      event.key === "ArrowRight"
        ? order[(index + 1) % order.length]
        : event.key === "ArrowLeft"
          ? order[(index - 1 + order.length) % order.length]
          : event.key === "Home"
            ? order[0]
            : event.key === "End"
              ? order[order.length - 1]
              : null;

    if (!next) return;
    event.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section id="brief" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-walnut">Заявка</p>
        <h2 className="display mt-3 text-4xl leading-tight sm:text-5xl">
          Расскажите, что хотите заказать
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft text-pretty">
          Мебель считается по конкретным размерам, поэтому «сколько стоит кухня?» без вводных
          никто не ответит. Помощник задаст нужные вопросы и соберёт из ответов готовую заявку.
        </p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          {NOTES.map((note) => (
            <li key={note} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-walnut" aria-hidden="true" />
              {note}
            </li>
          ))}
        </ul>
      </header>

      <div
        role="tablist"
        aria-label="Способ оставить заявку"
        className="mt-10 inline-flex rounded-full border border-line bg-surface p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`brief-tab-${item.id}`}
            ref={(node) => {
              tabRefs.current[item.id] = node;
            }}
            aria-selected={tab === item.id}
            aria-controls={`brief-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={handleTabKeys}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200 ${
              tab === item.id
                ? "bg-walnut text-sand"
                : "text-ink-soft hover:text-walnut"
            }`}
            style={{ touchAction: "manipulation" }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div
          role="tabpanel"
          id="brief-panel-chat"
          aria-labelledby="brief-tab-chat"
          hidden={tab !== "chat"}
        >
          {tab === "chat" && <BriefChat aiEnabled={aiEnabled} />}
        </div>

        <div
          role="tabpanel"
          id="brief-panel-form"
          aria-labelledby="brief-tab-form"
          hidden={tab !== "form"}
        >
          {tab === "form" && (
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 lg:max-w-2xl">
              <BriefForm />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

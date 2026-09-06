"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import { RESTAURANT } from "@/lib/restaurant";

type Message = { role: "user" | "assistant"; content: string };

const GREETING: Message = {
  role: "assistant",
  content:
    "Ciao! Я Лука, консультант «Osteria Bellini». Подскажу по меню и составу блюд, помогу выбрать и добавлю всё в корзину. Что хотите съесть сегодня?",
};

const SUGGESTIONS = [
  "Что взять, если я не ем мясо?",
  "В карбонаре есть сливки?",
  "Собери ужин на двоих до 4000 ₽",
];

/** Отправляем на сервер только последние ходы — длинный контекст тут не нужен. */
const HISTORY_LIMIT = 10;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { add } = useCart();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;

    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-HISTORY_LIMIT).map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Сервис недоступен");
      }

      // Действия ассистента применяем к настоящей корзине на клиенте.
      for (const action of data.actions ?? []) {
        if (action.type === "add_to_cart") add(action.itemId, action.quantity);
        if (action.type === "show_category") router.push(`/menu?cat=${action.category}`);
      }

      setMessages((current) => [...current, { role: "assistant", content: data.text }]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Не получилось связаться с помощником. Позвоните нам: ${RESTAURANT.phone}`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="chat-panel"
        className="fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-terracotta px-5 text-cream shadow-lg shadow-ink/20 transition-transform hover:scale-105"
      >
        <span aria-hidden className="text-xl">
          {open ? "×" : "💬"}
        </span>
        <span className="hidden text-sm font-semibold sm:inline">
          {open ? "Закрыть" : "Спросить Луку"}
        </span>
      </button>

      {open && (
        <div
          id="chat-panel"
          role="dialog"
          aria-label="ИИ-консультант ресторана"
          className="rise fixed bottom-24 right-4 z-50 flex max-h-[min(560px,calc(100dvh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-cream-dark bg-cream shadow-2xl shadow-ink/20"
        >
          <div className="flex items-center gap-3 border-b border-cream-dark bg-basil px-4 py-3 text-cream">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/20 text-lg">
              🍝
            </div>
            <div>
              <div className="text-sm font-semibold">Лука · ИИ-консультант</div>
              <div className="text-xs opacity-80">Отвечает по меню и доставке</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "ml-auto bg-basil text-cream"
                    : "bg-white/80 text-ink"
                }`}
              >
                {message.content}
              </div>
            ))}

            {pending && (
              <div className="w-16 rounded-2xl bg-white/80 px-3.5 py-3 text-sm text-ink-soft">
                <span className="inline-flex gap-1">
                  <Dot delay="0ms" />
                  <Dot delay="150ms" />
                  <Dot delay="300ms" />
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-terracotta/10 px-3.5 py-2.5 text-sm text-terracotta">
                {error}
              </div>
            )}

            {messages.length === 1 && !pending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-cream-dark bg-white/70 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-basil hover:text-basil"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="flex gap-2 border-t border-cream-dark bg-white/60 px-3 py-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={500}
              placeholder="Спросите про блюдо или доставку…"
              className="flex-1 rounded-full border border-cream-dark bg-cream px-4 py-2.5 text-sm outline-none focus:border-basil"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="rounded-full bg-terracotta px-4 py-2.5 text-sm font-semibold text-cream transition-opacity disabled:opacity-40"
            >
              →
            </button>
          </form>

          <p className="border-t border-cream-dark px-4 py-2 text-[11px] leading-snug text-ink-soft">
            Отвечает ИИ и может ошибаться. Бронь столика и точные данные об аллергенах —{" "}
            <a className="underline" href={`tel:${RESTAURANT.phoneHref}`}>
              {RESTAURANT.phone}
            </a>
          </p>
        </div>
      )}
    </>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft"
      style={{ animationDelay: delay }}
    />
  );
}

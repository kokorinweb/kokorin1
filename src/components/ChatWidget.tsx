"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartContext";
import { Chat, Close, Sparkle } from "./Icons";
import { RESTAURANT } from "@/lib/restaurant";
import type { AssistantAction } from "@/lib/ai";

type Message = { role: "user" | "assistant"; content: string };

const HINTS = [
  "Что взять на двоих на 3 000 ₽?",
  "Есть свободный стол в пятницу в 19:00?",
  "Что не острое и без рыбы?",
];

const GREETING: Message = {
  role: "assistant",
  content:
    "Здравствуйте! Я Кай, консультант НОРИ. Подберу блюда под вкус и бюджет, положу их в корзину и честно посмотрю, какие столы свободны. Спрашивайте.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const { add } = useCart();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /** Действия ассистента выполняет клиент: он владеет корзиной и навигацией. */
  function applyActions(actions: AssistantAction[]) {
    for (const action of actions) {
      if (action.type === "add_to_cart") add(action.itemId, action.quantity);
      if (action.type === "show_category") router.push(`/menu?category=${action.category}`);
      if (action.type === "open_booking") router.push("/booking");
    }
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setDraft("");
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Приветствие — наше, модели его отдавать незачем.
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessages([...next, { role: "assistant", content: data.error ?? "Что-то пошло не так." }]);
        return;
      }

      applyActions((data.actions ?? []) as AssistantAction[]);
      setMessages([
        ...next,
        { role: "assistant", content: data.text || "Готово! Что-нибудь ещё?" },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: `Связь пропала. Позвоните нам: ${RESTAURANT.phone}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Закрыть чат с консультантом" : "Открыть чат с консультантом"}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-shu text-ink shadow-[0_12px_40px_-8px_rgba(255,90,43,0.6)] transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        {open ? <Close className="h-6 w-6" /> : <Chat className="h-6 w-6" />}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Чат с ИИ-консультантом НОРИ"
          className="pop fixed inset-x-3 bottom-24 z-50 flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-line-strong bg-ink-2/97 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:w-[390px]"
        >
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-shu/15 text-shu">
              <Sparkle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-semibold text-text">Кай</p>
              <p className="text-xs text-text-faint">ИИ-консультант · знает меню и свободные столы</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed ${
                  message.role === "user"
                    ? "ml-auto bg-shu text-ink"
                    : "bg-white/6 text-text"
                }`}
              >
                {message.content}
              </div>
            ))}

            {busy ? (
              <div className="flex w-16 gap-1.5 rounded-2xl bg-white/6 px-4 py-4">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-faint"
                    style={{ animationDelay: `${index * 120}ms` }}
                  />
                ))}
              </div>
            ) : null}

            {messages.length === 1 && !busy ? (
              <ul className="space-y-2 pt-2">
                {HINTS.map((hint) => (
                  <li key={hint}>
                    <button
                      type="button"
                      onClick={() => send(hint)}
                      className="w-full cursor-pointer rounded-xl border border-line px-4 py-2.5 text-left text-sm text-text-dim transition-colors hover:border-shu hover:text-text"
                    >
                      {hint}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Спросите про блюда или столик…"
              aria-label="Сообщение консультанту"
              maxLength={500}
              className="h-11 flex-1 rounded-xl border border-line bg-ink-3 px-4 text-[0.9375rem] text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="h-11 cursor-pointer rounded-xl bg-shu px-5 font-semibold text-ink transition-colors hover:bg-shu-soft disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-text-faint"
            >
              Спросить
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

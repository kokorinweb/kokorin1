"use client";

import { useEffect, useRef, useState } from "react";
import {
  SCRIPT_STEPS,
  briefEntries,
  briefIsReady,
  briefToWhatsappUrl,
  type Brief,
} from "@/lib/brief";
import { CATEGORIES } from "@/lib/catalog";
import { COMPANY, PHONE_HREF } from "@/lib/company";
import { SparkIcon, WhatsappIcon } from "./Icons";

type Msg = { role: "user" | "assistant"; content: string };

const AI_GREETING =
  "Здравствуйте! Помогу собрать заявку. Задам несколько вопросов про мебель и помещение, а в конце соберу всё в одно сообщение для менеджера. Что вам нужно?";

const SCRIPT_GREETING = `Здравствуйте! ${SCRIPT_STEPS[0].question}`;

const DONE_MESSAGE =
  "Спасибо, этого достаточно. Заявка собрана — нажмите кнопку ниже, откроется WhatsApp с готовым текстом.";

/**
 * Помощник, который собирает бриф.
 *
 * С ключом Anthropic ведёт живой диалог и сам решает, что уточнить. Без ключа
 * тот же бриф собирается по заранее заданным вопросам из SCRIPT_STEPS — демо
 * должно работать и на ноутбуке без переменных окружения.
 */
export function BriefChat({ aiEnabled }: { aiEnabled: boolean }) {
  const [mode, setMode] = useState<"ai" | "script">(aiEnabled ? "ai" : "script");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: aiEnabled ? AI_GREETING : SCRIPT_GREETING },
  ]);
  const [brief, setBrief] = useState<Brief>({});
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, busy]);

  const collected = briefEntries(brief);
  const ready = briefIsReady(brief);

  /** Сценарий без ИИ: записываем ответ в текущее поле и задаём следующий вопрос. */
  function advanceScript(answer: string, history: Msg[], from: number) {
    const current = SCRIPT_STEPS[from];
    const nextBrief: Brief = current ? { ...brief, [current.field]: answer } : brief;
    const next = SCRIPT_STEPS[from + 1];

    setBrief(nextBrief);
    setStep(from + 1);
    setMessages([...history, { role: "assistant", content: next ? next.question : DONE_MESSAGE }]);
  }

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;

    const history: Msg[] = [...messages, { role: "user", content: value }];
    setMessages(history);
    setInput("");
    setError(null);

    if (mode === "script") {
      advanceScript(value, history, step);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, brief }),
      });

      // Ключа на сервере нет — молча переходим на сценарий, а не ломаемся.
      if (response.status === 503) {
        setMode("script");
        advanceScript(value, history, 0);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as { text: string; brief: Brief };
      setBrief(data.brief);
      setMessages([...history, { role: "assistant", content: data.text }]);
    } catch {
      setError(
        `Помощник сейчас не отвечает. Напишите напрямую в WhatsApp или позвоните: ${COMPANY.phone}.`,
      );
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMode(aiEnabled ? "ai" : "script");
    setMessages([{ role: "assistant", content: aiEnabled ? AI_GREETING : SCRIPT_GREETING }]);
    setBrief({});
    setStep(0);
    setInput("");
    setError(null);
    setConfirmingReset(false);
    inputRef.current?.focus();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex min-h-[22rem] flex-col overflow-hidden rounded-3xl border border-line bg-surface sm:min-h-[28rem]">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
          <SparkIcon className="h-5 w-5 shrink-0 text-walnut" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">Помощник по заказу</p>
          {collected.length > 0 && (
            // Сброс стирает уже собранное, поэтому спрашиваем подтверждение.
            <button
              type="button"
              onClick={() => (confirmingReset ? reset() : setConfirmingReset(true))}
              onBlur={() => setConfirmingReset(false)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                confirmingReset
                  ? "bg-walnut text-sand"
                  : "text-ink-soft hover:bg-sand hover:text-walnut"
              }`}
            >
              {confirmingReset ? "Точно стереть?" : "Начать заново"}
            </button>
          )}
        </div>

        <div
          ref={logRef}
          className="max-h-[15rem] flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:max-h-[26rem] sm:px-5 sm:py-5"
          style={{ overscrollBehavior: "contain" }}
        >
          <ol className="space-y-3" aria-live="polite" aria-label="История разговора">
            {messages.map((message, index) => (
              <li
                key={index}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <p
                  className={`max-w-[85%] break-words rounded-2xl px-4 py-2.5 leading-relaxed ${
                    message.role === "user"
                      ? "bg-walnut text-sand"
                      : "bg-sand text-ink"
                  }`}
                >
                  {message.content}
                </p>
              </li>
            ))}
          </ol>

          {busy && (
            <p className="text-sm text-ink-soft" aria-live="polite">
              Думаю…
            </p>
          )}

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => send(category.title)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-sm transition-colors duration-200 hover:border-walnut hover:text-walnut"
                  style={{ touchAction: "manipulation" }}
                >
                  {category.title}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-2xl bg-sand-deep px-4 py-3 text-sm text-walnut-deep">
              {error}{" "}
              <a href={PHONE_HREF} className="font-semibold underline underline-offset-4">
                Позвонить
              </a>
            </p>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 border-t border-line p-3"
        >
          <label htmlFor="brief-chat-input" className="sr-only">
            Сообщение помощнику
          </label>
          <input
            id="brief-chat-input"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Напишите ответ…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-line bg-sand px-4 py-3 transition-colors duration-200 placeholder:text-ink-soft/60 hover:border-walnut/40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-full bg-walnut px-5 py-3 text-sm font-semibold text-sand transition-colors duration-200 hover:bg-walnut-deep disabled:cursor-not-allowed disabled:opacity-45"
            style={{ touchAction: "manipulation" }}
          >
            {busy ? "Отправляю…" : "Отправить"}
          </button>
        </form>
      </div>

      <aside className="rounded-3xl border border-line bg-sand-deep p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-walnut">
          Что уже записано
        </h3>

        <div aria-live="polite">
          {collected.length === 0 ? (
            <p className="mt-4 leading-relaxed text-ink-soft text-pretty">
              Пока пусто. Ответьте на пару вопросов — заявка соберётся здесь сама, и её можно
              будет отправить одним сообщением.
            </p>
          ) : (
            <dl className="mt-4 space-y-3">
              {collected.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
                  <dd className="break-words leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {ready && (
          <a
            href={briefToWhatsappUrl(brief)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-walnut px-6 py-3.5 font-semibold text-sand transition-colors duration-200 hover:bg-walnut-deep"
            style={{ touchAction: "manipulation" }}
          >
            <WhatsappIcon className="h-5 w-5" />
            Отправить в WhatsApp
          </a>
        )}
      </aside>
    </div>
  );
}

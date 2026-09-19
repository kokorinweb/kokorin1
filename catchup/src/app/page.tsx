const BOT = process.env.CATCHUP_BOT_USERNAME ?? "catchup_bot";

const STEPS = [
  { n: "1", title: "Добавь в чат", text: "Туда, где много болтают и ты вечно не успеваешь читать." },
  { n: "2", title: "Напиши /svod", text: "Получишь пересказ дня: темы, договорённости, повисшие вопросы." },
  { n: "3", title: "Напиши /me", text: "В личку придёт то, что касается лично тебя." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20">
      <p className="text-sm uppercase tracking-widest text-[var(--muted)]">Telegram-бот</p>
      <h1 className="mt-3 text-5xl font-bold leading-tight">Догоняй</h1>
      <p className="mt-6 text-xl text-[var(--muted)]">
        Вернулся вечером, а в чате 600 сообщений. Бот расскажет, что там было — и отдельно
        то, что касается лично тебя.
      </p>

      <a
        href={`https://t.me/${BOT}`}
        className="mt-10 inline-block rounded-lg bg-[var(--accent)] px-6 py-3 font-semibold text-black"
      >
        Открыть в Telegram
      </a>

      <div className="mt-20 grid gap-8">
        {STEPS.map((step) => (
          <div key={step.n} className="flex gap-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--muted)] text-sm">
              {step.n}
            </div>
            <div>
              <h2 className="font-semibold">{step.title}</h2>
              <p className="mt-1 text-[var(--muted)]">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 rounded-xl border border-white/10 p-6">
        <h2 className="font-semibold">Что видит бот</h2>
        <p className="mt-2 text-[var(--muted)]">
          Только текстовые сообщения тех чатов, куда его добавили. Хранит их ограниченный срок и
          удаляет. Команда <code className="text-[var(--fg)]">/forget</code> стирает всё немедленно.
        </p>
        <a href="/privacy" className="mt-4 inline-block text-sm underline">
          Подробнее о данных
        </a>
      </div>

      <footer className="mt-20 text-sm text-[var(--muted)]">
        Общая сводка — раз в сутки бесплатно. Персональные — за Telegram Stars.
      </footer>
    </main>
  );
}

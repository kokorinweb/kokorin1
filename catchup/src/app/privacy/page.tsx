const RETENTION = process.env.CATCHUP_RETENTION_DAYS ?? "14";

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20">
      <h1 className="text-3xl font-bold">Данные</h1>

      <section className="mt-10 space-y-4 text-[var(--muted)]">
        <p>
          <b className="text-[var(--fg)]">Что собирается.</b> Текст сообщений групповых чатов, куда
          добавили бота, имя автора и время отправки. Медиа, файлы, голосовые и личная переписка —
          нет.
        </p>
        <p>
          <b className="text-[var(--fg)]">Зачем.</b> Только чтобы составить сводку по запросу
          участника чата.
        </p>
        <p>
          <b className="text-[var(--fg)]">Сколько хранится.</b> {RETENTION} дней, потом удаляется
          автоматически. Команда <code className="text-[var(--fg)]">/forget</code> в чате удаляет
          всю его историю немедленно; её может вызвать любой администратор чата.
        </p>
        <p>
          <b className="text-[var(--fg)]">Кому передаётся.</b> Текст сводимого окна уходит в
          Anthropic API для генерации пересказа. Больше никуда.
        </p>
        <p>
          <b className="text-[var(--fg)]">Как выключить.</b> Удалите бота из чата — запись
          прекращается сразу.
        </p>
      </section>

      <a href="/" className="mt-12 inline-block text-sm underline">
        ← На главную
      </a>
    </main>
  );
}

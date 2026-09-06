/**
 * Локальный запуск Telegram-бота через long polling: npm run bot
 *
 * В продакшене бот живёт вебхуком на /api/telegram — там же, где сайт,
 * и одного процесса не требует. Этот скрипт нужен только для разработки:
 * не надо публичного домена и туннеля.
 */
import { BOT_COMMANDS, botConfigured, createBot } from "../src/lib/telegram";
import { aiConfigured } from "../src/lib/ai";

async function main() {
  if (!botConfigured()) {
    console.error("TELEGRAM_BOT_TOKEN не задан. Скопируйте .env.example в .env.local.");
    process.exit(1);
  }

  if (!aiConfigured()) {
    console.warn("⚠ ANTHROPIC_API_KEY не задан — бот ответит только на команды, без ИИ.");
  }

  const bot = createBot();
  await bot.api.setMyCommands(BOT_COMMANDS);

  const me = await bot.api.getMe();
  console.log(`✅ Бот @${me.username} запущен (long polling). Ctrl+C — остановить.`);

  const stop = () => void bot.stop();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  await bot.start();
}

main().catch((error) => {
  console.error("Бот не запустился:", error);
  process.exit(1);
});

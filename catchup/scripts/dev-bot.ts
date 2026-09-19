/** Локальная разработка: long polling вместо вебхука. */
import { createBot } from "../src/bot/bot";

const bot = createBot();

void bot.start({
  onStart: (me) => console.log(`[bot] @${me.username} запущен в режиме long polling`),
});

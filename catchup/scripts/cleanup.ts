/** Ручной запуск удаления просроченных сообщений. */
import { purgeOldMessages } from "../src/lib/repo";
import { RETENTION_DAYS } from "../src/lib/env";

const removed = purgeOldMessages();
console.log(`Удалено сообщений старше ${RETENTION_DAYS} дней: ${removed}`);

/**
 * Оплата — Telegram Stars. Ни юрлица, ни эквайринга, ни банка: Телеграм сам
 * собирает деньги и отдаёт их владельцу бота.
 *
 * Продаём не подписку, а расходуемые единицы. В Телеграме «ещё десять штук»
 * покупают охотнее, чем «доступ на месяц»: решение принимается один раз и
 * прямо в момент, когда человеку нужно.
 */

export type Pack = {
  id: string;
  stars: number;
  credits: number;
  title: string;
};

export const PACKS: Pack[] = [
  { id: "pack10", stars: 60, credits: 10, title: "10 сводок" },
  { id: "pack30", stars: 150, credits: 30, title: "30 сводок" },
  { id: "pack100", stars: 400, credits: 100, title: "100 сводок" },
];

export function findPack(id: string): Pack | undefined {
  return PACKS.find((pack) => pack.id === id);
}

/** Сколько персональных сводок даём новому человеку, чтобы он понял ценность. */
export const WELCOME_CREDITS = 3;

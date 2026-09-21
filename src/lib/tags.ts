/**
 * Метки гостей. Словарь фиксированный: свободные теги в CRM на одного человека
 * превращаются в «постоянный», «пост.», «Постоянный» и «постоянные» — и перестают
 * что-либо фильтровать.
 */
export const CUSTOMER_TAGS = [
  {
    id: "vip",
    label: "VIP",
    hint: "узнавать по имени, лучший стол",
    pill: "bg-accent-tint text-accent-strong ring-accent/20",
  },
  {
    id: "regular",
    label: "Постоянный",
    hint: "ходит часто, знает меню",
    pill: "bg-blue-tint text-blue-ink ring-blue/20",
  },
  {
    id: "allergy",
    label: "Аллергия",
    hint: "смотреть заметки перед отдачей",
    pill: "bg-gold-tint text-gold-ink ring-gold/25",
  },
  {
    id: "prepay",
    label: "Только предоплата",
    hint: "были отказы от заказа на пороге",
    pill: "bg-warn-tint text-warn ring-warn/20",
  },
  {
    id: "careful",
    label: "Осторожно",
    hint: "конфликтный гость, звонить лично",
    pill: "bg-warn-tint text-warn ring-warn/20",
  },
] as const;

export type CustomerTagId = (typeof CUSTOMER_TAGS)[number]["id"];

export function isCustomerTag(value: string): value is CustomerTagId {
  return CUSTOMER_TAGS.some((tag) => tag.id === value);
}

export function tagMeta(id: string) {
  return CUSTOMER_TAGS.find((tag) => tag.id === id);
}

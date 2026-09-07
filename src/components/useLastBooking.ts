"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Последняя бронь гостя в localStorage.
 * Нужна, чтобы после бронирования предложить предзаказ, а в корзине —
 * подставить код брони вместо ручного ввода. Сервер этому значению не верит:
 * он всё равно ищет бронь по коду у себя.
 */
const KEY = "nori.booking.v1";

export type StoredBooking = {
  code: string;
  dateKey: string;
  slot: string;
  guests: number;
  tableId: number;
  zone: string;
};

function read(): StoredBooking | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBooking;
    return typeof parsed?.code === "string" && parsed.code ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLastBooking(booking: StoredBooking): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(booking));
    window.dispatchEvent(new Event("nori:booking"));
  } catch {
    // Приватный режим — просто не запомним бронь, код у гостя всё равно есть.
  }
}

export function clearLastBooking(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("nori:booking"));
  } catch {
    // см. выше
  }
}

export function useLastBooking(): { booking: StoredBooking | null; hydrated: boolean } {
  const [booking, setBooking] = useState<StoredBooking | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const sync = useCallback(() => setBooking(read()), []);

  useEffect(() => {
    sync();
    setHydrated(true);
    window.addEventListener("nori:booking", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nori:booking", sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  return { booking, hydrated };
}

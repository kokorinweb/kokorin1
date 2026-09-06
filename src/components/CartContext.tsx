"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMenuItem, type MenuItem } from "@/lib/menu";

const STORAGE_KEY = "bellini.cart.v1";

export type CartLine = { itemId: string; quantity: number };

export type CartEntry = { item: MenuItem; quantity: number; lineTotal: number };

type CartValue = {
  lines: CartLine[];
  entries: CartEntry[];
  count: number;
  subtotal: number;
  /** Готово ли состояние из localStorage — до этого не рендерим суммы, чтобы не было мигания. */
  hydrated: boolean;
  add: (itemId: string, quantity?: number) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  remove: (itemId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as CartLine).itemId === "string" &&
          Number.isFinite((line as CartLine).quantity),
      )
      // Блюдо могло исчезнуть из меню между визитами — молча выбрасываем.
      .filter((line) => Boolean(getMenuItem(line.itemId)))
      .map((line) => ({ itemId: line.itemId, quantity: clampQty(line.quantity) }));
  } catch {
    return [];
  }
}

function clampQty(value: number): number {
  return Math.max(1, Math.min(20, Math.round(value)));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Приватный режим или переполнение — корзина просто не переживёт перезагрузку.
    }
  }, [lines, hydrated]);

  const add = useCallback((itemId: string, quantity = 1) => {
    if (!getMenuItem(itemId)) return;
    setLines((current) => {
      const existing = current.find((line) => line.itemId === itemId);
      if (!existing) return [...current, { itemId, quantity: clampQty(quantity) }];
      return current.map((line) =>
        line.itemId === itemId ? { ...line, quantity: clampQty(line.quantity + quantity) } : line,
      );
    });
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.itemId !== itemId)
        : current.map((line) =>
            line.itemId === itemId ? { ...line, quantity: clampQty(quantity) } : line,
          ),
    );
  }, []);

  const remove = useCallback((itemId: string) => {
    setLines((current) => current.filter((line) => line.itemId !== itemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const entries: CartEntry[] = lines.flatMap((line) => {
      const item = getMenuItem(line.itemId);
      if (!item) return [];
      return [{ item, quantity: line.quantity, lineTotal: item.price * line.quantity }];
    });

    return {
      lines,
      entries,
      count: entries.reduce((sum, entry) => sum + entry.quantity, 0),
      subtotal: entries.reduce((sum, entry) => sum + entry.lineTotal, 0),
      hydrated,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, hydrated, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart вызван вне CartProvider");
  return context;
}

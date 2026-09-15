"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon } from "./icons";
import { formatPrice, type MenuItem } from "@/lib/menu";
import { useCart } from "./CartContext";

export function DishCard({ item }: { item: MenuItem }) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  /** Каждое нажатие — новая «плюс единица», иначе повторный клик не перезапускает анимацию. */
  const [pulse, setPulse] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function handleAdd() {
    add(item.id, 1);
    setJustAdded(true);
    setPulse((n) => n + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <motion.article
      className="relative flex h-full flex-col rounded-2xl border border-plaster-dark bg-shell p-5"
      whileHover={{ y: -5, boxShadow: "0 18px 40px -18px rgba(34,29,23,0.28)" }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      style={{ boxShadow: "0 1px 2px rgba(34,29,23,0.04)" }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="display text-xl leading-tight">{item.name}</h3>
          <p className="text-sm italic text-ink-soft">{item.nameIt}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="display text-lg text-terracotta">{formatPrice(item.price)}</div>
          <div className="text-xs text-ink-soft">{item.portion}</div>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{item.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
        {item.vegetarian && (
          <span className="rounded-full bg-basil/10 px-2 py-0.5 text-basil">вегетарианское</span>
        )}
        {item.spicy && (
          <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-terracotta">острое</span>
        )}
        {item.allergens.length > 0 && (
          <span className="rounded-full bg-plaster-dark px-2 py-0.5 text-ink-soft">
            аллергены: {item.allergens.join(", ")}
          </span>
        )}
      </div>

      <div className="relative mt-5">
        <AnimatePresence>
          {pulse > 0 && justAdded && (
            <motion.span
              key={pulse}
              aria-hidden
              className="pointer-events-none absolute right-3 top-0 text-sm font-bold text-basil"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0], y: -26 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              +1
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={handleAdd}
          whileTap={{ scale: 0.96 }}
          className={`w-full overflow-hidden rounded-full px-4 py-3 text-sm font-semibold transition-colors duration-300 ${
            justAdded ? "bg-basil text-on-basil" : "bg-plaster-dark text-ink hover:bg-basil hover:text-on-basil"
          }`}
        >
          {/* Метки меняются подменой элемента: текст не дёргается, а перелистывается. */}
          <span className="relative block h-5">
            <AnimatePresence initial={false}>
              <motion.span
                key={justAdded ? "added" : "idle"}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {justAdded ? (
                  <>
                    <CheckIcon className="mr-1.5 h-4 w-4" />
                    Добавлено
                  </>
                ) : (
                  "В корзину"
                )}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
      </div>
    </motion.article>
  );
}

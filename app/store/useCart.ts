"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  image?: string;
  qty: number;
  color?: string | null;
  size?: string | null;
  maxStock?: number;               // ⬅️ tope por variante (talle/color)
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (index: number) => void;
  setQty: (index: number, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const MAX_QTY = 10;
const keyOf = (i: Omit<CartItem, "qty">) => `${i.id}|${i.color ?? ""}|${i.size ?? ""}`;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const items = [...get().items];

        // límite efectivo = min(10, stock de la variante si viene)
        const limit = Math.min(MAX_QTY, item.maxStock ?? MAX_QTY);
        const addQty = Math.min(limit, Math.max(1, item.qty ?? 1));

        const idx = items.findIndex((it) => keyOf(it) === keyOf(item));
        if (idx >= 0) {
          const mergedMax = Math.min(items[idx].maxStock ?? MAX_QTY, item.maxStock ?? MAX_QTY);
          items[idx] = {
            ...items[idx],
            maxStock: mergedMax,
            qty: Math.min(mergedMax, items[idx].qty + addQty),
          };
        } else {
          items.push({ ...item, qty: addQty });
        }
        set({ items }); // no abrimos el modal automáticamente
      },

      removeItem: (index) => {
        const items = [...get().items];
        items.splice(index, 1);
        set({ items });
      },

      setQty: (index, qty) => {
        const items = [...get().items];
        const limit = Math.min(MAX_QTY, items[index].maxStock ?? MAX_QTY);
        items[index] = {
          ...items[index],
          qty: Math.min(limit, Math.max(1, Math.floor(qty))),
        };
        set({ items });
      },

      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    { name: "deal-cart", storage: createJSONStorage(() => localStorage) }
  )
);

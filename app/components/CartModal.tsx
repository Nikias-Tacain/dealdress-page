"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/app/store/useCart";

export default function CartModal() {
  const { items, isOpen, closeCart, setQty, removeItem, clear } = useCartStore();

  const count = items.reduce((a, b) => a + b.qty, 0);
  const subtotal = items.reduce((a, b) => a + b.price * b.qty, 0);

  // Evitar scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onOverlayClick = () => closeCart();
  const onPanelClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={onOverlayClick}
      onKeyDown={(e) => e.key === "Escape" && closeCart()}
      role="dialog"
      aria-modal="true"
      aria-label="Carrito de compras"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={onPanelClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">Tu carrito ({count})</h3>
          <button
            onClick={closeCart}
            className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
            aria-label="Cerrar carrito"
          >
            Cerrar
          </button>
        </div>

        {/* Items */}
        <div className="max-h-[60vh] overflow-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-600">No hay productos en el carrito.</p>
          ) : (
            items.map((it, i) => {
              const max = Math.min(10, it.maxStock ?? 10); // ⬅️ tope por variante
              return (
                <div key={`${it.id}-${i}`} className="flex gap-3">
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {it.image ? (
                      <Image src={it.image} alt={it.title} fill className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium leading-tight line-clamp-2">{it.title}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {it.color ? <>Color: <b>{it.color}</b> · </> : null}
                          {it.size ? <>Talle: <b>{it.size}</b></> : null}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(i)}
                        className="text-xs text-gray-500 hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border overflow-hidden">
                        <button
                          onClick={() => setQty(i, (items[i].qty || 1) - 1)}
                          className="px-3 py-1.5"
                          aria-label="Disminuir"
                          disabled={it.qty <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={max}
                          value={items[i].qty}
                          onChange={(e) => setQty(i, Number(e.target.value || 1))}
                          className="w-14 text-center outline-none py-1.5"
                        />
                        <button
                          onClick={() => setQty(i, (items[i].qty || 1) + 1)}
                          className="px-3 py-1.5"
                          aria-label="Aumentar"
                          disabled={it.qty >= max}
                          title={it.qty >= max ? "Alcanzaste el stock disponible" : ""}
                        >
                          +
                        </button>
                      </div>

                      <div className="font-medium">
                        ${new Intl.NumberFormat("es-AR").format(it.price * it.qty)}
                      </div>
                    </div>

                    <p className="mt-1 text-[11px] text-gray-500">
                      Stock disponible: {max}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Subtotal</span>
            <span className="text-lg font-semibold">
              ${new Intl.NumberFormat("es-AR").format(subtotal)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={clear}
              className="flex-1 rounded-full border border-gray-300 bg-white py-3 hover:bg-gray-50 disabled:opacity-60"
              disabled={items.length === 0}
            >
              Vaciar carrito
            </button>
            <Link
              href=""
              className={`flex-1 rounded-full text-center py-3 ${
                items.length === 0
                  ? "bg-gray-300 cursor-not-allowed text-white"
                  : "bg-black text-white hover:opacity-90"
              }`}
              aria-disabled={items.length === 0}
              onClick={(e) => items.length === 0 && e.preventDefault()}
            >
              Ir a pagar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

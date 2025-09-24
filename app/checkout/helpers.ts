"use client";

import { toARS } from "@/app/lib/format";

export type ShippingMethod = "pickup" | "andreani";

export type Buyer = {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
};

export type CartItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
  color?: string | null;
  size?: string | null;
  image?: string | null;
  maxStock?: number | null;
};

export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function validateBuyer(b: Buyer, shipping: ShippingMethod) {
  if (!b.name.trim() || !b.email.trim() || !b.phone.trim()) {
    return "Completá nombre, email y teléfono.";
  }
  if (!isValidEmail(b.email.trim())) {
    return "Ingresá un email válido.";
  }
  if (
    shipping === "andreani" &&
    (!b.address?.trim() || !b.city?.trim() || !b.postalCode?.trim())
  ) {
    return "Completá dirección, ciudad y código postal para el envío.";
  }
  return null;
}

export function calcTotals(items: CartItem[], discount = 0, shippingCost = 0) {
  const subtotal = items.reduce((a, b) => a + b.price * b.qty, 0);
  const total = Math.max(0, subtotal - discount + shippingCost);
  return { subtotal, total };
}

/**
 * Arma el mensaje para WhatsApp.
 * Si `orderNumber` viene undefined/null, NO muestra "Orden #...".
 */
export function buildWaMessage(
  orderNumber: number | undefined,
  items: CartItem[],
  shipping: { method: ShippingMethod; postalCode?: string; cost: number },
  totals: { subtotal: number; total: number },
  buyer: Buyer,
  discount?: number,
  couponCode?: string
) {
  const lines = items
    .map(
      (it) =>
        `• ${it.title}${it.size ? ` (Talle ${it.size})` : ""}${
          it.color ? ` - ${it.color}` : ""
        } x${it.qty} — ${toARS(it.price * it.qty)}`
    )
    .join("\n");

  const envio =
    shipping.method === "pickup"
      ? "Retiro en local (sin costo)"
      : `Envío Andreani (${shipping.postalCode || "CP s/d"}): ${toARS(
          shipping.cost
        )}`;

  const headerSuffix =
    typeof orderNumber === "number" ? ` (Orden #${orderNumber})` : "";

  return `Hola! Quiero comprar${headerSuffix}:\n
${lines}

Subtotal: ${toARS(totals.subtotal)}
${envio}
${discount ? `Cupón ${couponCode}: -${toARS(discount)}\n` : ""}Total: ${toARS(
    totals.total
  )}

Mis datos:
${buyer.name}
${buyer.email}
${buyer.phone}
${buyer.address || ""} ${buyer.city || ""}
${buyer.notes || ""}`;
}

/* ❌ Eliminado: NO se crean órdenes desde el cliente
   - reserveOrderNumber()
   - saveOrder()
*/

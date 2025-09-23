"use client";

import {
  addDoc, collection, doc, getDoc, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { toARS } from "@/app/lib/format";

export type ShippingMethod = "pickup" | "andreani";

export type Buyer = {
  name: string; email: string; phone: string;
  address?: string; city?: string; postalCode?: string; notes?: string;
};

export type CartItem = {
  id: string; title: string; price: number; qty: number;
  color?: string | null; size?: string | null; image?: string | null; maxStock?: number | null;
};

export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function validateBuyer(b: Buyer, shipping: ShippingMethod) {
  if (!b.name.trim() || !b.email.trim() || !b.phone.trim())
    return "Completá nombre, email y teléfono.";
  if (!isValidEmail(b.email.trim()))
    return "Ingresá un email válido.";
  if (shipping === "andreani" && (!b.address?.trim() || !b.city?.trim() || !b.postalCode?.trim()))
    return "Completá dirección, ciudad y código postal para el envío.";
  return null;
}

export function calcTotals(items: CartItem[], discount = 0, shippingCost = 0) {
  const subtotal = items.reduce((a, b) => a + b.price * b.qty, 0);
  const total = Math.max(0, subtotal - discount + shippingCost);
  return { subtotal, total };
}

export function buildWaMessage(
  orderNumber: number, items: CartItem[],
  shipping: { method: ShippingMethod; postalCode?: string; cost: number },
  totals: { subtotal: number; total: number },
  buyer: Buyer, discount?: number, couponCode?: string
) {
  const lines = items.map(
    it => `• ${it.title}${it.size ? ` (Talle ${it.size})` : ""}${it.color ? ` - ${it.color}` : ""} x${it.qty} — ${toARS(it.price * it.qty)}`
  ).join("\n");

  const envio = shipping.method === "pickup"
    ? "Retiro en local (sin costo)"
    : `Envío Andreani (${shipping.postalCode || "CP s/d"}): ${toARS(shipping.cost)}`;

  return `Hola! Quiero comprar (Orden #${orderNumber}):\n\n${lines}\n\nSubtotal: ${toARS(totals.subtotal)}
${envio}
${discount ? `Cupón ${couponCode}: -${toARS(discount)}\n` : ""}Total: ${toARS(totals.total)}

Mis datos:
${buyer.name}
${buyer.email}
${buyer.phone}
${buyer.address || ""} ${buyer.city || ""}
${buyer.notes || ""}`;
}

/** Genera y reserva nro único /orderNumbers/{num} */
export async function reserveOrderNumber(): Promise<number> {
  for (let i = 0; i < 10; i++) {
    const num = Math.floor(100000 + Math.random() * 900000);
    const ref = doc(db, "orderNumbers", String(num));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { createdAt: serverTimestamp() });
      return num;
    }
  }
  throw new Error("No se pudo generar un número de orden único.");
}

/** Guarda la orden en Firestore y retorna ids. */
export async function saveOrder(params: {
  items: CartItem[];
  buyer: Buyer;
  shipping: { method: ShippingMethod; cost: number };
  coupon?: { code: string; amount: number } | null;
  totals: { subtotal: number; total: number; discount: number };
  status: "pending" | "created" | "mp_error";
}) {
  const number = await reserveOrderNumber();
  const ref = await addDoc(collection(db, "orders"), {
    number,
    items: params.items,
    buyer: {
      ...params.buyer,
      address: params.buyer.address || null,
      city: params.buyer.city || null,
      postalCode: params.buyer.postalCode || null,
      notes: params.buyer.notes || null,
    },
    shipping: params.shipping,
    totals: {
      subtotal: params.totals.subtotal,
      discount: params.totals.discount,
      total: params.totals.total,
    },
    coupon: params.coupon || null,
    status: params.status,
    createdAt: serverTimestamp(),
  });
  return { orderId: ref.id, orderNumber: number };
}

// app/checkout/page.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useCartStore } from "../store/useCart";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

type ShippingMethod = "pickup" | "andreani";

export default function CheckoutPage() {
  const { items, setQty, removeItem, clear } = useCartStore();

  // Datos del comprador
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  // Envío
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("pickup");
  const [postalCode, setPostalCode] = useState("");
  const [shippingCost, setShippingCost] = useState<number>(0);

  // Cupón (demo)
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<null | {
    code: string;
    amount: number;
  }>(null);

  const [mpLoading, setMpLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Números
  const subtotal = useMemo(
    () => items.reduce((a, b) => a + b.price * b.qty, 0),
    [items]
  );
  const discount = couponApplied?.amount ?? 0;
  const envio =
    shippingMethod === "pickup"
      ? 0
      : Math.max(0, Number.isFinite(shippingCost) ? shippingCost : 0);
  const total = Math.max(0, subtotal - discount + envio);

  // ===== Helpers =====
  function tryApplyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (code === "DESCUENTO10") {
      setCouponApplied({ code, amount: 10000 });
      toast.success("Cupón aplicado: -$10.000");
    } else if (code === "ENVIOGRATIS") {
      setCouponApplied({ code, amount: envio });
      toast.success("Cupón aplicado: Envío bonificado");
    } else {
      setCouponApplied(null);
      toast.error("Cupón inválido");
    }
  }

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function validateForm(): boolean {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Completá nombre, email y teléfono.");
      return false;
    }
    if (!isValidEmail(email.trim())) {
      toast.error("Ingresá un email válido.");
      return false;
    }
    if (shippingMethod === "andreani") {
      if (!address.trim() || !city.trim() || !postalCode.trim()) {
        toast.error("Completá dirección, ciudad y código postal para el envío.");
        return false;
      }
    }
    if (items.length === 0) {
      toast.error("Tu carrito está vacío.");
      return false;
    }
    return true;
  }

  // Genera y reserva un número de orden único (6 dígitos) en /orderNumbers/{num}
  async function reserveUniqueOrderNumber(): Promise<number> {
    // Intentamos hasta 10 veces (collisión muy improbable)
    for (let i = 0; i < 10; i++) {
      const num = Math.floor(100000 + Math.random() * 900000);
      const ref = doc(db, "orderNumbers", String(num));
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        // Reservo el número para evitar duplicados
        await setDoc(ref, { createdAt: serverTimestamp() });
        return num;
      }
    }
    throw new Error("No se pudo generar un número de orden único.");
  }

  // Guardo orden en Firestore y devuelvo {orderId, orderNumber}
  async function saveOrder(status: "pending" | "mp_error" | "created") {
    setSaving(true);
    try {
      const orderNumber = await reserveUniqueOrderNumber();
      const order = {
        number: orderNumber,
        items: items.map((it) => ({
          id: it.id,
          title: it.title,
          price: it.price,
          qty: it.qty,
          color: it.color ?? null,
          size: it.size ?? null,
          image: it.image ?? null,
          maxStock: it.maxStock ?? null,
        })),
        buyer: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          postalCode: postalCode.trim() || null,
          notes: notes.trim() || null,
        },
        shipping: {
          method: shippingMethod,
          cost: envio,
        },
        totals: {
          subtotal,
          discount,
          total,
        },
        coupon: couponApplied,
        status, // pending | created | mp_error
        createdAt: serverTimestamp(),
        // Podés agregar userId si tenés auth
      };
      const ref = await addDoc(collection(db, "orders"), order);
      return { orderId: ref.id, orderNumber };
    } finally {
      setSaving(false);
    }
  }

  // ===== Acciones =====
  async function handleWhatsApp() {
    if (!validateForm()) return;

    try {
      const { orderNumber } = await saveOrder("created");
      toast.success(`Orden #${orderNumber} creada. Te derivamos a WhatsApp…`);

      const msg = `Hola! Quiero comprar (Orden #${orderNumber}):\n\n${items
        .map(
          (it) =>
            `• ${it.title}${it.size ? ` (Talle ${it.size})` : ""}${
              it.color ? ` - ${it.color}` : ""
            } x${it.qty} — $${new Intl.NumberFormat("es-AR").format(
              it.price * it.qty
            )}`
        )
        .join("\n")}\n\nSubtotal: $${new Intl.NumberFormat("es-AR").format(
        subtotal
      )}\n${
        shippingMethod === "pickup"
          ? "Retiro en local (sin costo)"
          : `Envío Andreani (${postalCode || "CP s/d"}): $${new Intl.NumberFormat(
              "es-AR"
            ).format(envio)}`
      }\n${
        couponApplied
          ? `Cupón ${couponApplied.code}: -$${new Intl.NumberFormat(
              "es-AR"
            ).format(discount)}\n`
          : ""
      }Total: $${new Intl.NumberFormat("es-AR").format(
        total
      )}\n\nMis datos:\n${name}\n${email}\n${phone}\n${address || ""} ${
        city || ""
      }\n${notes || ""}`;

      window.open(
        `https://api.whatsapp.com/send?phone=3415075439&text=${encodeURIComponent(
          msg
        )}`,
        "_blank"
      );
    } catch (e) {
      console.error(e);
      toast.error(
        "No pudimos generar tu orden en este momento. Intentá nuevamente."
      );
    }
  }

  async function handleMercadoPago() {
    if (!validateForm()) return;

    try {
      setMpLoading(true);

      // 1) guardo orden en Firestore (status pending)
      const { orderId, orderNumber } = await saveOrder("pending");

      // 2) creo preferencia en el backend
      const payload = {
        buyer: {
          name,
          email,
          phone,
          address: address || undefined,
          city: city || undefined,
          notes:
            [
              notes && `Notas: ${notes}`,
              `Envío: ${
                shippingMethod === "pickup"
                  ? "Retiro en local"
                  : `Andreani (${postalCode || "s/ CP"})`
              }`,
              `Costo envío: $${envio}`,
              couponApplied
                ? `Cupón ${couponApplied.code} (-$${couponApplied.amount})`
                : null,
            ]
              .filter(Boolean)
              .join(" | ") || undefined,
        },
        items: items.map((it) => ({
          id: `${it.id}${it.color ? `|${it.color}` : ""}${
            it.size ? `|${it.size}` : ""
          }`,
          title: `${it.title}${it.size ? ` - Talle ${it.size}` : ""}${
            it.color ? ` - ${it.color}` : ""
          }`,
          quantity: it.qty,
          unit_price: it.price,
          picture_url: it.image,
        })),
        metadata: {
          orderId,
          orderNumber,
          shippingMethod,
          postalCode,
          shippingCost: envio,
          discount,
          subtotal,
          total,
        },
      };

      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.init_point)
        throw new Error(data?.error || "No se pudo crear la preferencia");

      // 3) redirijo a MP
      window.location.href = data.init_point; // o sandbox_init_point
    } catch (err) {
      console.error(err);
      toast.error(
        "Hubo un problema con Mercado Pago. Probá de nuevo en unos segundos."
      );
      // opcional: podrías actualizar la orden a 'mp_error'
      try {
        await saveOrder("mp_error");
      } catch {}
    } finally {
      setMpLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#e9dede]">
      <section className="mx-auto max-w-5xl px-4 py-8 md:py-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl md:text-3xl font-bold">Finalizar compra</h1>
          <Link href="/tienda" className="text-sm underline hover:opacity-80">
            Seguir comprando
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: Carrito + Datos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carrito */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold">
                  Tu carrito ({items.length})
                </h2>
                {items.length > 0 && (
                  <button
                    onClick={clear}
                    className="text-sm rounded-full border px-3 py-1 hover:bg-gray-50"
                  >
                    Vaciar carrito
                  </button>
                )}
              </div>

              <div className="divide-y">
                {items.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-600">
                    No hay productos en el carrito.
                  </p>
                ) : (
                  items.map((it, i) => {
                    const max = Math.min(10, it.maxStock ?? 10);
                    return (
                      <div key={`${it.id}-${i}`} className="px-4 py-4 flex gap-3">
                        <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {it.image && (
                            <Image
                              src={it.image}
                              alt={it.title}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium leading-tight line-clamp-2">
                                {it.title}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {it.color ? (
                                  <>
                                    Color: <b>{it.color}</b> ·{" "}
                                  </>
                                ) : null}
                                {it.size ? (
                                  <>
                                    Talle: <b>{it.size}</b>
                                  </>
                                ) : null}
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
                                onClick={() => setQty(i, (it.qty || 1) - 1)}
                                className="px-3 py-1.5"
                                disabled={it.qty <= 1}
                                aria-label="Disminuir"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={max}
                                value={it.qty}
                                onChange={(e) =>
                                  setQty(i, Number(e.target.value || 1))
                                }
                                className="w-14 text-center outline-none py-1.5"
                              />
                              <button
                                onClick={() => setQty(i, (it.qty || 1) + 1)}
                                className="px-3 py-1.5"
                                disabled={it.qty >= max}
                                title={
                                  it.qty >= max
                                    ? "Alcanzaste el stock disponible"
                                    : ""
                                }
                                aria-label="Aumentar"
                              >
                                +
                              </button>
                            </div>

                            <div className="font-medium">
                              $
                              {new Intl.NumberFormat("es-AR").format(
                                it.price * it.qty
                              )}
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

              <div className="px-4 py-3 border-t flex items-center justify-end gap-6">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-lg font-semibold">
                  ${new Intl.NumberFormat("es-AR").format(subtotal)}
                </span>
              </div>
            </div>

            {/* Datos del comprador */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold">Tus datos</h2>
              </div>
              <div className="p-4 grid gap-3">
                <input
                  className="input"
                  placeholder="Nombre y apellido *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Email *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Teléfono *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Dirección (si envío)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input"
                    placeholder="Ciudad (si envío)"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Código Postal (si envío)"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
                <textarea
                  className="input min-h-[90px]"
                  placeholder="Notas (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {shippingMethod === "andreani" && (
                  <p className="text-xs text-rose-600">
                    * Dirección, ciudad y CP son obligatorios para envío.
                  </p>
                )}
              </div>
            </div>

            {/* Envío */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold">Envío</h2>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="shipping"
                    value="pickup"
                    checked={shippingMethod === "pickup"}
                    onChange={() => setShippingMethod("pickup")}
                  />
                  <span>Retiro en local (sin costo)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="shipping"
                    value="andreani"
                    checked={shippingMethod === "andreani"}
                    onChange={() => setShippingMethod("andreani")}
                  />
                  <span>Envío Andreani</span>
                </label>

                {shippingMethod === "andreani" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <input
                      className="input"
                      placeholder="CP / Zona (para cotizar)"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                    <input
                      className="input"
                      type="number"
                      min={0}
                      placeholder="Costo de envío ($)"
                      value={Number.isNaN(shippingCost) ? "" : shippingCost}
                      onChange={(e) =>
                        setShippingCost(Number(e.target.value || 0))
                      }
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  * El costo puede variar según el destino. Te confirmamos por
                  WhatsApp si hay diferencia.
                </p>
              </div>
            </div>
          </div>

          {/* Columna derecha: Resumen y acciones */}
          <aside className="lg:col-span-1">
            <div className="rounded-xl border bg-white overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold">Resumen</h2>
              </div>

              <div className="p-4 space-y-3 text-sm">
                <Row
                  label="Productos"
                  value={`$${new Intl.NumberFormat("es-AR").format(subtotal)}`}
                />
                <div className="flex items-center justify-between">
                  <span className="opacity-70">Cupón</span>
                  <div className="flex items-center gap-2">
                    {couponApplied ? (
                      <span className="text-emerald-700">
                        -
                        {new Intl.NumberFormat("es-AR").format(
                          couponApplied.amount
                        )}
                      </span>
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className="input"
                    placeholder="Ingresá tu cupón"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                  <button
                    className="rounded-lg border px-3 py-2 hover:bg-gray-50"
                    onClick={tryApplyCoupon}
                  >
                    Aplicar
                  </button>
                </div>

                <Row
                  label="Envío"
                  value={
                    shippingMethod === "pickup"
                      ? "Retiro (sin costo)"
                      : `$${new Intl.NumberFormat("es-AR").format(envio)}`
                  }
                />
                <hr />
                <Row
                  strong
                  label="Total"
                  value={`$${new Intl.NumberFormat("es-AR").format(total)}`}
                />
              </div>

              <div className="p-4 grid gap-3">
                {/* WhatsApp */}
                <button
                  onClick={handleWhatsApp}
                  disabled={saving || !items.length}
                  className={`rounded-full border px-4 py-3 text-center ${
                    saving || !items.length
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "hover:bg-gray-50"
                  }`}
                >
                  Finalizar por WhatsApp
                </button>

                {/* Mercado Pago */}
                <button
                  onClick={handleMercadoPago}
                  disabled={mpLoading || !items.length}
                  className={`rounded-full px-4 py-3 text-white text-center ${
                    mpLoading || !items.length
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#009EE3] hover:opacity-90"
                  }`}
                >
                  {mpLoading ? "Creando pago…" : "Pagar con Mercado Pago"}
                </button>

                <p className="text-[11px] text-center text-gray-500">
                  Al continuar aceptás nuestros términos y política de cambios.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* estilos inputs rápidos */}
      <style jsx global>{`
        .input {
          @apply w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/20;
        }
      `}</style>
    </main>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "opacity-70"}>{label}</span>
      <span className={strong ? "text-lg font-semibold" : ""}>{value}</span>
    </div>
  );
}

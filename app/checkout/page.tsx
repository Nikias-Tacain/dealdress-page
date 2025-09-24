"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useCartStore } from "../store/useCart";
import {
  Buyer,
  ShippingMethod,
  calcTotals,
  validateBuyer,
  buildWaMessage,
  // ❌ saveOrder no se usa en WhatsApp
  CartItem,
} from "./helpers";
import { toARS } from "@/app/lib/format";

export default function CheckoutPage() {
  const { items, setQty, removeItem, clear } = useCartStore();

  const [buyer, setBuyer] = useState<Buyer>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
  });

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("pickup");
  const [shippingCost, setShippingCost] = useState<number>(0);

  // Envío Andreani fijo $8.000
  useEffect(() => {
    setShippingCost(shippingMethod === "andreani" ? 8000 : 0);
  }, [shippingMethod]);

  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] =
    useState<null | { code: string; amount: number }>(null);

  const [mpLoading, setMpLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const discount = couponApplied?.amount ?? 0;
  const envio =
    shippingMethod === "pickup" ? 0 : Math.max(0, Number.isFinite(shippingCost) ? shippingCost : 0);

  const { subtotal, total } = useMemo(
    () => calcTotals(items as CartItem[], discount, envio),
    [items, discount, envio]
  );

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (code === "DESCUENTO10") {
      setCouponApplied({ code, amount: 10000 });
      toast.success("Cupón aplicado");
    } else if (code === "ENVIOGRATIS") {
      setCouponApplied({ code, amount: envio });
      toast.success("Cupón aplicado");
    } else {
      setCouponApplied(null);
      toast.error("Cupón inválido");
    }
  };

  // ================== WhatsApp (NO guarda y SIN número de orden) ==================
  async function goWhatsApp() {
    const err = validateBuyer(buyer, shippingMethod);
    if (err) return toast.error(err);
    if (!items.length) return toast.error("Tu carrito está vacío");

    try {
      setSaving(true);

      // Ítems mínimos para el mensaje (sin imagen)
      const leanItems = (items as CartItem[]).map((it) => ({
        id: it.id,
        title: it.title,
        price: it.price,
        qty: it.qty,
        size: it.size ?? "",
        color: it.color ?? "",
      }));

      // ⚠️ No generamos NI usamos número de orden acá
      const msg = buildWaMessage(
        undefined as unknown as number, // si tu helper soporta "falsy", no mostrará N° de orden
        leanItems,
        { method: shippingMethod, postalCode: buyer.postalCode, cost: envio },
        { subtotal, total },
        buyer,
        discount,
        couponApplied?.code
      );

      window.open(
        `https://api.whatsapp.com/send?phone=3415075439&text=${encodeURIComponent(msg)}`,
        "_blank"
      );
    } finally {
      setSaving(false);
    }
  }

  // ================== Mercado Pago (sin cambios) ==================
  async function goMercadoPago() {
    const err = validateBuyer(buyer, shippingMethod);
    if (err) return toast.error(err);
    if (!items.length) return toast.error("Tu carrito está vacío");

    try {
      setMpLoading(true);

      const leanItems = (items as CartItem[]).map((it) => ({
        id: it.id,
        title: it.title,
        price: it.price,
        qty: it.qty,
        size: it.size ?? "",
        color: it.color ?? "",
      }));

      const orderDraft = {
        items: leanItems,
        buyer,
        shipping: { method: shippingMethod, cost: envio, postalCode: buyer.postalCode },
        totals: { subtotal, total, discount },
        coupon: couponApplied ?? null,
      };

      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer,
          items: (items as CartItem[]).map((it) => ({
            id: `${it.id}${it.color ? `|${it.color}` : ""}${it.size ? `|${it.size}` : ""}`,
            title: `${it.title}${it.size ? ` - Talle ${it.size}` : ""}${it.color ? ` - ${it.color}` : ""}`,
            quantity: it.qty,
            unit_price: it.price,
          })),
          metadata: { orderDraft }, // el número de orden real se crea/reconcilia en el finalize
        }),
      });

      const data: { init_point?: string; error?: string } = await res.json();
      if (!res.ok || !data.init_point) throw new Error(data.error || "No se pudo crear la preferencia");

      window.location.href = data.init_point!;
    } catch (e) {
      console.error(e);
      toast.error("No pudimos iniciar el pago, probá de nuevo.");
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
          {/* Izquierda: carrito + datos + envío */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carrito */}
            <Card
              title={`Tu carrito (${items.length})`}
              right={
                items.length > 0 ? (
                  <button onClick={clear} className="text-sm rounded-full border px-3 py-1 hover:bg-gray-50 cursor-pointer">
                    Vaciar carrito
                  </button>
                ) : null
              }
            >
              {items.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-600">No hay productos en el carrito.</p>
              ) : (
                <div className="divide-y">
                  {items.map((it, i) => {
                    const max = Math.min(10, it.maxStock ?? 10);
                    return (
                      <div key={`${it.id}-${i}`} className="px-4 py-4 flex gap-3">
                        <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {it.image && <Image src={it.image} alt={it.title} fill className="object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium leading-tight line-clamp-2">{it.title}</div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {it.color ? <>Color: <b>{it.color}</b> · </> : null}
                                {it.size ? <>Talle: <b>{it.size}</b></> : null}
                              </div>
                            </div>
                            <button onClick={() => removeItem(i)} className="text-xs text-gray-500 hover:text-red-600 cursor-pointer">
                              Quitar
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border overflow-hidden">
                              <button
                                onClick={() => setQty(i, (it.qty || 1) - 1)}
                                className="px-3 py-1.5 cursor-pointer"
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
                                onChange={(e) => setQty(i, Number(e.target.value || 1))}
                                className="w-14 text-center outline-none py-1.5"
                              />
                              <button
                                onClick={() => setQty(i, (it.qty || 1) + 1)}
                                className="px-3 py-1.5 cursor-pointer"
                                disabled={it.qty >= max}
                                title={it.qty >= max ? "Alcanzaste el stock disponible" : ""}
                                aria-label="Aumentar"
                              >
                                +
                              </button>
                            </div>
                            <div className="font-medium">{toARS(it.price * it.qty)}</div>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">Stock disponible: {max}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="px-4 py-3 border-t flex items-center justify-end gap-6">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-lg font-semibold">{toARS(subtotal)}</span>
              </div>
            </Card>

            {/* Datos */}
            <Card title="Tus datos">
              <div className="p-4 grid gap-3">
                <Field label="Nombre y apellido *">
                  <Input
                    id="buyer-name"
                    placeholder="Nombre y apellido *"
                    value={buyer.name}
                    onChange={(e) => setBuyer((v) => ({ ...v, name: e.target.value }))}
                  />
                </Field>

                <Field label="Email *">
                  <Input
                    id="buyer-email"
                    placeholder="Email *"
                    value={buyer.email}
                    onChange={(e) => setBuyer((v) => ({ ...v, email: e.target.value }))}
                  />
                </Field>

                <Field label="Teléfono *">
                  <Input
                    id="buyer-phone"
                    placeholder="Teléfono *"
                    value={buyer.phone}
                    onChange={(e) => setBuyer((v) => ({ ...v, phone: e.target.value }))}
                  />
                </Field>

                <Field label="Dirección (si envío)">
                  <Input
                    id="buyer-address"
                    placeholder="Dirección (si envío)"
                    value={buyer.address || ""}
                    onChange={(e) => setBuyer((v) => ({ ...v, address: e.target.value }))}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ciudad (si envío)">
                    <Input
                      id="buyer-city"
                      placeholder="Ciudad (si envío)"
                      value={buyer.city || ""}
                      onChange={(e) => setBuyer((v) => ({ ...v, city: e.target.value }))}
                    />
                  </Field>

                  <Field label="Código Postal (si envío)">
                    <Input
                      id="buyer-cp"
                      placeholder="Código Postal (si envío)"
                      value={buyer.postalCode || ""}
                      onChange={(e) => setBuyer((v) => ({ ...v, postalCode: e.target.value }))}
                    />
                  </Field>
                </div>

                <Field label="Notas (opcional)">
                  <Textarea
                    id="buyer-notes"
                    placeholder="Notas (opcional)"
                    value={buyer.notes || ""}
                    onChange={(e) => setBuyer((v) => ({ ...v, notes: e.target.value }))}
                  />
                </Field>

                {shippingMethod === "andreani" && (
                  <p className="text-xs text-rose-600">* Dirección, ciudad y CP son obligatorios para envío.</p>
                )}
              </div>
            </Card>

            {/* Envío */}
            <Card title="Envío">
              <div className="p-4 space-y-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="shipping"
                    value="pickup"
                    checked={shippingMethod === "pickup"}
                    onChange={() => setShippingMethod("pickup")}
                  />
                  <span>Retiro en local (sin costo)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
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
                    <Field label="CP / Zona (para cotizar)">
                      <Input
                        id="ship-cp"
                        placeholder="CP / Zona (para cotizar)"
                        value={buyer.postalCode || ""}
                        onChange={(e) => setBuyer((v) => ({ ...v, postalCode: e.target.value }))}
                      />
                    </Field>

                    <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-700">Costo de envío (fijo)</span>
                      <div className="h-[38px] flex items-center rounded-lg border px-3">
                        {toARS(8000)}
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500">* Envío seguro. Transporte Andreani.</p>
              </div>
            </Card>
          </div>

          {/* Derecha: resumen */}
          <aside className="lg:col-span-1">
            <Card title="Resumen" sticky>
              <div className="p-4 space-y-3 text-sm">
                <Row label="Productos" value={toARS(subtotal)} />
                <div className="flex items-center justify-between">
                  <span className="opacity-70">Cupón</span>
                  <div>{couponApplied ? <span className="text-emerald-700">-{toARS(couponApplied.amount)}</span> : <span className="opacity-60">—</span>}</div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input placeholder="Ingresá tu cupón" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                  <button className="rounded-lg border px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={applyCoupon}>
                    Aplicar
                  </button>
                </div>
                <Row label="Envío" value={shippingMethod === "pickup" ? "Retiro (sin costo)" : toARS(envio)} />
                <hr />
                <Row strong label="Total" value={toARS(total)} />
              </div>

              <div className="p-4 grid gap-3">
                <button
                  onClick={goWhatsApp}
                  disabled={saving || !items.length}
                  className={`rounded-full cursor-pointer border px-4 py-3 text-center ${
                    saving || !items.length ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "hover:bg-gray-50"
                  }`}
                >
                  Finalizar por WhatsApp
                </button>

                <button
                  onClick={goMercadoPago}
                  disabled={mpLoading || !items.length}
                  className={`rounded-full cursor-pointer px-4 py-3 text-white text-center ${
                    mpLoading || !items.length ? "bg-gray-400 cursor-not-allowed" : "bg-[#009EE3] hover:opacity-90"
                  }`}
                >
                  {mpLoading ? "Creando pago…" : "Pagar con Mercado Pago"}
                </button>

                <p className="text-[11px] text-center text-gray-500">
                  Al continuar aceptás nuestros términos y política de cambios.
                </p>
              </div>
            </Card>
          </aside>
        </div>
      </section>

      <style jsx global>{`
        .input { @apply w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/20; }
      `}</style>
    </main>
  );
}

/* UI mini helpers */
function Card({ title, children, right, sticky }: { title: string; children: React.ReactNode; right?: React.ReactNode; sticky?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${sticky ? "sticky top-4" : ""}`}>
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "opacity-70"}>{label}</span>
      <span className={strong ? "text-lg font-semibold" : ""}>{value}</span>
    </div>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ""}`} />;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input min-h-[90px] ${props.className || ""}`} />;
}

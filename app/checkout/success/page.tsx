// app/checkout/success/page.tsx
"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/app/store/useCart";
import { toARS } from "@/app/lib/format";

export const dynamic = "force-dynamic";

type OrderResponse = {
  ok?: boolean;
  skipped?: boolean;
  already?: boolean;
  orderId?: string;
  orderNumber?: number | null;
  error?: string;
  order?: {
    number: number | null;
    items: Array<{ id: string; title: string; price: number; qty: number; size?: string; color?: string }>;
    buyer: { name: string; email: string; phone: string; address?: string; city?: string; postalCode?: string; notes?: string } | null;
    shipping: { method: string; cost: number; postalCode?: string } | null;
    totals: { subtotal: number; total: number } | null;
    coupon: { code: string; amount: number } | null;
    mp?: { paymentId?: string; status?: string; amount?: number } | null;
  };
};

function SuccessInner() {
  const params = useSearchParams();
  const clear = useCartStore((s) => s.clear);

  const [state, setState] = useState<{
    status: "idle" | "ok" | "skip" | "err";
    message?: string;
    orderNumber?: number | null;
    order?: OrderResponse["order"];
  }>({ status: "idle" });

  async function callFinalize() {
    const payment_id = params.get("payment_id");
    const status = params.get("status");
    const preference_id = params.get("preference_id");
    if (!payment_id || !preference_id) {
      setState({ status: "err", message: "Parámetros incompletos" });
      return;
    }

    try {
      setState({ status: "idle" });
      const url = `/api/mp/finalize?payment_id=${payment_id}&status=${status}&preference_id=${preference_id}`;
      const res = await fetch(url);
      const data: OrderResponse = await res.json();

      if (res.ok) {
        clear();
        setState({
          status: data.skipped ? "skip" : "ok",
          orderNumber: data.orderNumber ?? data.order?.number ?? null,
          order: data.order,
        });
      } else {
        setState({ status: "err", message: data?.error || "Fallo al registrar la orden" });
      }
    } catch (e) {
      setState({ status: "err", message: (e as Error).message });
    }
  }

  useEffect(() => {
    void callFinalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleText = useMemo(() => {
    if (state.status === "ok" || state.status === "skip") {
      const n = state.orderNumber;
      return n ? `¡Pago aprobado! Orden #${n}` : "¡Pago aprobado!";
    }
    return "¡Pago aprobado!";
  }, [state.status, state.orderNumber]);

  async function handleDownloadPDF() {
    if (!state.order) return;

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    const o = state.order;
    const line = (text: string, y: number, x = 14) => doc.text(text, x, y);

    let y = 18;

    // Header
    doc.setFontSize(18);
    line("Comprobante de compra", y);
    y += 8;

    doc.setFontSize(12);
    line(`Orden: ${o.number ?? "-"}`, y); y += 6;
    if (o.mp?.paymentId) { line(`Payment ID: ${o.mp.paymentId}`, y); y += 6; }
    if (o.mp?.status) { line(`Estado: ${o.mp.status}`, y); y += 6; }

    y += 4;
    line("Comprador", y); y += 6;
    line(`${o.buyer?.name ?? "-"}`, y); y += 6;
    line(`${o.buyer?.email ?? "-"}`, y); y += 6;
    line(`${o.buyer?.phone ?? "-"}`, y); y += 6;
    if (o.buyer?.address || o.buyer?.city) { line(`${o.buyer?.address ?? ""} ${o.buyer?.city ?? ""}`, y); y += 6; }
    if (o.buyer?.postalCode) { line(`CP: ${o.buyer?.postalCode}`, y); y += 6; }
    if (o.buyer?.notes) { line(`Notas: ${o.buyer?.notes}`, y); y += 6; }

    y += 4;
    line("Envío", y); y += 6;
    line(
      o.shipping?.method === "pickup"
        ? "Retiro en local (sin costo)"
        : `Andreani (${o.shipping?.postalCode || "s/d"}): ${toARS(o.shipping?.cost || 0)}`,
      y
    ); y += 8;

    line("Items", y); y += 6;
    o.items.forEach((it) => {
      const row = `• ${it.title}${it.size ? ` (Talle ${it.size})` : ""}${it.color ? ` - ${it.color}` : ""} x${it.qty} — ${toARS(it.price * it.qty)}`;
      line(row, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 18; }
    });

    y += 4;
    line(`Subtotal: ${toARS(o.totals?.subtotal || 0)}`, y); y += 6;
    if (o.coupon) { line(`Cupón ${o.coupon.code}: -${toARS(o.coupon.amount)}`, y); y += 6; }
    line(`Total: ${toARS(o.totals?.total || 0)}`, y); y += 10;

    line("¡Gracias por tu compra!", y);

    doc.save(`orden-${o.number ?? "comprobante"}.pdf`);
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold mb-2">{titleText}</h1>

      <p className="mb-6">
        {state.status === "idle" && "Estamos registrando tu orden…"}
        {state.status === "ok" && "Tu compra fue registrada correctamente."}
        {state.status === "skip" && "Pago aprobado (la orden ya estaba registrada)."}
        {state.status === "err" && (
          <span className="text-rose-600">
            No pudimos registrar la orden. {state.message ? `(${state.message}) ` : ""}
            Guardá el comprobante y escribinos.
          </span>
        )}
      </p>

      {(state.status === "ok" || state.status === "skip") && state.order && (
        <div className="mb-6 flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="rounded-full border px-4 py-2 hover:bg-gray-50 cursor-pointer"
          >
            Descargar comprobante (PDF)
          </button>
        </div>
      )}

      {state.status === "err" && (
        <button onClick={callFinalize} className="rounded-full border px-4 py-2 mr-4 hover:bg-gray-50 cursor-pointer">
          Reintentar
        </button>
      )}

      <Link href="/tienda" className="underline">
        Volver a la tienda
      </Link>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl p-6">Procesando…</main>}>
      <SuccessInner />
    </Suspense>
  );
}

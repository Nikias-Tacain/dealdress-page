// app/checkout/success/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/app/store/useCart";

export const dynamic = "force-dynamic";

function SuccessInner() {
  const params = useSearchParams();
  const clear = useCartStore((s) => s.clear);
  const [done, setDone] = useState<"ok" | "err" | "skip" | null>(null);

  useEffect(() => {
    const payment_id = params.get("payment_id");
    const status = params.get("status");
    const preference_id = params.get("preference_id");
    if (!payment_id || !preference_id) return;

    (async () => {
      try {
        const url = `/api/mp/finalize?payment_id=${payment_id}&status=${status}&preference_id=${preference_id}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) {
          // si realmente se creó (o ya existía) limpiamos carrito
          clear();
          setDone(data.skipped ? "skip" : "ok");
        } else {
          setDone("err");
        }
      } catch {
        setDone("err");
      }
    })();
  }, [params, clear]);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold mb-2">¡Pago aprobado!</h1>
      <p className="mb-6">Estamos registrando tu orden…</p>
      {done === "ok" && <p className="mb-6">Tu compra fue registrada correctamente.</p>}
      {done === "skip" && <p className="mb-6">Pago aprobado. (La orden ya estaba registrada)</p>}
      {done === "err"  && <p className="mb-6 text-rose-600">No pudimos registrar la orden. Guardá el comprobante y escribinos.</p>}
      <Link href="/tienda" className="underline">Volver a la tienda</Link>
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

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
  const [state, setState] = useState<{
    status: "idle" | "ok" | "skip" | "err";
    message?: string;
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
      const data = await res.json();
      if (res.ok) {
        clear();
        setState({ status: data.skipped ? "skip" : "ok" });
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

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold mb-2">¡Pago aprobado!</h1>
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

      {state.status === "err" && (
        <button onClick={callFinalize} className="rounded-full border px-4 py-2 mr-4 hover:bg-gray-50">
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

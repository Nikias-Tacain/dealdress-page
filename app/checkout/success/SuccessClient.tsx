// app/checkout/success/SuccessClient.tsx  — CLIENT
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/app/store/useCart";

export default function SuccessClient() {
  const params = useSearchParams();
  const order = params.get("order") ?? "";
  const clear = useCartStore((s) => s.clear);

  // limpiar carrito al entrar
  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <main className="min-h-dvh bg-[#e9dede]">
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">¡Pago aprobado!</h1>
        {order ? <p className="mb-2">Tu orden es <b>#{order}</b>.</p> : null}
        <p>Te enviamos un mail con el comprobante. ¡Gracias por tu compra!</p>
        <div className="mt-6">
          <Link href="/tienda" className="underline">Volver a la tienda</Link>
        </div>
      </section>
    </main>
  );
}

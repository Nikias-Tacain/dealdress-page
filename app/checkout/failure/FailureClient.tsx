"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function FailureClient() {
  const params = useSearchParams();
  const order = params.get("order") ?? "";
  return (
    <main className="min-h-dvh bg-[#ffe9e9]">
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Pago rechazado</h1>
        {order ? <p className="mb-2">Orden #{order}</p> : null}
        <p>Revisá los datos o intentá con otro medio de pago.</p>
        <div className="mt-6">
          <Link href="/checkout" className="underline">Volver al checkout</Link>
        </div>
      </section>
    </main>
  );
}

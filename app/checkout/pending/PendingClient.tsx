"use client";
import { useSearchParams } from "next/navigation";

export default function PendingClient() {
  const params = useSearchParams();
  const order = params.get("order") ?? "";
  return (
    <main className="min-h-dvh bg-[#e9dede]">
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Pago pendiente</h1>
        {order ? <p className="mb-2">Orden #{order}</p> : null}
        <p>Cuando se acredite te avisamos por email.</p>
      </section>
    </main>
  );
}

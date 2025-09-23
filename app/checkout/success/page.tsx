// app/checkout/success/page.tsx  — SERVER
import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0; // válido aquí porque es Server

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Cargando…</div>}>
      <SuccessClient />
    </Suspense>
  );
}

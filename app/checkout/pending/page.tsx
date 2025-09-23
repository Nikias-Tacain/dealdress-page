import { Suspense } from "react";
import PendingClient from "./PendingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Cargando…</div>}>
      <PendingClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import FailureClient from "./FailureClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Cargando…</div>}>
      <FailureClient />
    </Suspense>
  );
}

// app/api/mp/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { adminDb } from "@/app/api/_lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderDraft = {
  items: Array<{ id: string; title: string; price: number; qty: number; size?: string; color?: string }>;
  buyer: { name: string; email: string; phone: string; address?: string; city?: string; postalCode?: string; notes?: string };
  shipping: { method: string; cost: number; postalCode?: string };
  totals: { subtotal: number; total: number; discount: number };
  coupon: { code: string; amount: number } | null;
};

export async function GET(req: NextRequest) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "Falta MP_ACCESS_TOKEN" }, { status: 500 });
  }

  const paymentId = req.nextUrl.searchParams.get("payment_id") ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const preferenceId = req.nextUrl.searchParams.get("preference_id") ?? "";

  if (!paymentId || !preferenceId) {
    return NextResponse.json({ error: "Faltan parámetros payment_id/preference_id" }, { status: 400 });
  }

  try {
    // 1) Verificar pago en MP
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const p = await payment.get({ id: paymentId });

    if (p.status !== "approved" && status !== "approved") {
      // no registramos orden si MP no está approved
      return NextResponse.json({ ok: true, skipped: true, reason: "Pago no aprobado" });
    }

    // 2) Idempotencia: ya creamos esta orden antes?
    const existSnap = await adminDb
      .collection("orders")
      .where("mp.paymentId", "==", paymentId)
      .limit(1)
      .get();

    if (!existSnap.empty) {
      return NextResponse.json({ ok: true, already: true });
    }

    // 3) Leer metadata.orderDraft desde la preferencia
    const pref = new Preference(client);
    const prefRes = await pref.get({ preferenceId });

    const orderDraft = (prefRes as unknown as { metadata?: { orderDraft?: OrderDraft } }).metadata?.orderDraft;
    if (!orderDraft) {
      console.error("Finalize: metadata.orderDraft faltante", { preferenceId, prefRes });
      return NextResponse.json(
        { error: "No se encontró metadata.orderDraft en la preferencia" },
        { status: 400 }
      );
    }

    // 4) Crear orden definitiva en Firestore (Admin SDK ignora reglas)
    const doc = {
      ...orderDraft,
      status: "approved",
      createdAt: FieldValue.serverTimestamp(),
      mp: {
        paymentId,
        preferenceId,
        paymentMethod: p.payment_method?.type ?? null,
        paymentType: p.payment_type_id ?? null,
        status: p.status,
        statusDetail: p.status_detail,
        amount: p.transaction_amount,
      },
    };

    const ref = await adminDb.collection("orders").add(doc);
    return NextResponse.json({ ok: true, orderId: ref.id });
  } catch (e: unknown) {
    // Logs útiles para depurar en consola del servidor
    console.error("Finalize error:", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      paymentId,
      preferenceId,
    });
    return NextResponse.json({ error: "Error finalizando orden" }, { status: 500 });
  }
}

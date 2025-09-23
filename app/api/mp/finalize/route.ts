// app/api/mp/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { adminDb } from "@/app/api/_lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tipos mínimos (evitan any)
type PaymentGetResponse = {
  status?: string;
  payment_method?: { type?: string | null } | null;
  payment_type_id?: string | null;
  status_detail?: string | null;
  transaction_amount?: number | null;
};

type OrderDraft = {
  items?: unknown;
  buyer?: unknown;
  shipping?: unknown;
  totals?: unknown;
  coupon?: unknown;
};

type PreferenceGetResponse = {
  metadata?: { orderDraft?: OrderDraft };
};

export async function GET(req: NextRequest) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "Falta MP_ACCESS_TOKEN" }, { status: 500 });
    }

    const paymentId = req.nextUrl.searchParams.get("payment_id");
    const status = req.nextUrl.searchParams.get("status");
    const prefId = req.nextUrl.searchParams.get("preference_id");

    if (!paymentId || !prefId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const mp = new MercadoPagoConfig({ accessToken });

    // 1) Verificar pago
    const p = (await new Payment(mp).get({ id: paymentId })) as PaymentGetResponse;
    if (p.status !== "approved" && status !== "approved") {
      return NextResponse.json({ ok: true, skipped: true, reason: "Pago no aprobado" });
    }

    // 2) Idempotencia
    const already = await adminDb
      .collection("orders")
      .where("mp.paymentId", "==", paymentId)
      .limit(1)
      .get();
    if (!already.empty) {
      return NextResponse.json({ ok: true, already: true });
    }

    // 3) Leer metadata.orderDraft desde la preferencia
    const prefRes = (await new Preference(mp).get({ preferenceId: prefId })) as PreferenceGetResponse;
    const orderDraft = prefRes?.metadata?.orderDraft;
    if (!orderDraft) {
      return NextResponse.json({ error: "No se encontró metadata.orderDraft en la preferencia" }, { status: 400 });
    }

    // 4) Crear orden
    const doc = {
      ...orderDraft,
      status: "approved",
      createdAt: FieldValue.serverTimestamp(),
      mp: {
        paymentId,
        preferenceId: prefId,
        paymentMethod: p.payment_method?.type ?? null,
        paymentType: p.payment_type_id ?? null,
        status: p.status ?? null,
        statusDetail: p.status_detail ?? null,
        amount: p.transaction_amount ?? null,
      },
    };

    const ref = await adminDb.collection("orders").add(doc);
    return NextResponse.json({ ok: true, orderId: ref.id });
  } catch (e: unknown) {
    // Log al server y feedback útil al cliente en dev
    console.error("Finalize error:", e);
    const msg =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? `Finalize error: ${e.message}`
        : "Error finalizando orden";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

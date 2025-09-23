// app/api/mp/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { adminDb } from "@/app/api/_lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tipos mínimos para evitar `any` y satisfacer ESLint */
type PaymentGetResponse = {
  status?: string;
  payment_method?: { type?: string | null } | null;
  payment_type_id?: string | null;
  status_detail?: string | null;
  transaction_amount?: number | null;
};

type PreferenceGetResponse = {
  metadata?: {
    orderDraft?: OrderDraft | undefined;
  };
};

type OrderDraft = {
  // Estructura mínima necesaria; si querés podés tiparlo más estricto
  items?: unknown;
  buyer?: unknown;
  shipping?: unknown;
  totals?: unknown;
  coupon?: unknown;
  // Podés agregar más campos si los usás
};

export async function GET(req: NextRequest) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "Falta MP_ACCESS_TOKEN" }, { status: 500 });
    }

    // Parámetros de retorno de MP
    const paymentId = req.nextUrl.searchParams.get("payment_id");
    const status = req.nextUrl.searchParams.get("status");
    const prefId = req.nextUrl.searchParams.get("preference_id");

    if (!paymentId || !prefId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // SDK MP
    const client = new MercadoPagoConfig({ accessToken });

    // 1) Verificar pago
    const payment = new Payment(client);
    const p = (await payment.get({ id: paymentId })) as PaymentGetResponse;

    if (p.status !== "approved" && status !== "approved") {
      // No aprobada: no creamos orden
      return NextResponse.json({ ok: true, skipped: true, reason: "Pago no aprobado" });
    }

    // 2) Idempotencia: si ya creamos la orden para este paymentId, devolvemos ok
    const existSnap = await adminDb
      .collection("orders")
      .where("mp.paymentId", "==", paymentId)
      .limit(1)
      .get();

    if (!existSnap.empty) {
      return NextResponse.json({ ok: true, already: true });
    }

    // 3) Recuperar la metadata de la preferencia para obtener el orderDraft
    const pref = new Preference(client);
    const prefRes = (await pref.get({ preferenceId: prefId })) as PreferenceGetResponse;
    const orderDraft = prefRes?.metadata?.orderDraft;

    if (!orderDraft) {
      return NextResponse.json({ error: "No se encontró metadata.orderDraft" }, { status: 400 });
    }

    // 4) Crear orden definitiva en Firestore (con Admin SDK)
    const doc = {
      ...orderDraft, // items / buyer / shipping / totals / coupon
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
  } catch (e) {
    console.error("Finalize error:", e);
    return NextResponse.json({ error: "Error finalizando orden" }, { status: 500 });
  }
}

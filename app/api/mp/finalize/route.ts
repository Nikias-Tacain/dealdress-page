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

// Tipo mínimo para leer una orden existente desde Firestore
type FirestoreOrder = {
  number?: number | null;
  items?: OrderDraft["items"];
  buyer?: OrderDraft["buyer"] | null;
  shipping?: OrderDraft["shipping"] | null;
  totals?: OrderDraft["totals"] | null;
  coupon?: OrderDraft["coupon"] | null;
  mp?: {
    paymentId?: string;
    preferenceId?: string;
    paymentMethod?: string | null;
    paymentType?: string | null;
    status?: string;
    statusDetail?: string;
    amount?: number;
  } | null;
  status?: string;
};

function genOrderNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

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
      return NextResponse.json({ ok: true, skipped: true, reason: "Pago no aprobado" });
    }

    // 2) Idempotencia: ¿ya está en Firestore?
    const existSnap = await adminDb
      .collection("orders")
      .where("mp.paymentId", "==", paymentId)
      .limit(1)
      .get();

    if (!existSnap.empty) {
      const docSnap = existSnap.docs[0];
      const existing = docSnap.data() as FirestoreOrder; // ✅ sin `any`

      return NextResponse.json({
        ok: true,
        already: true,
        orderId: docSnap.id,
        orderNumber: existing?.number ?? null,
        order: {
          number: existing?.number ?? null,
          items: existing?.items ?? [],
          buyer: existing?.buyer ?? null,
          shipping: existing?.shipping ?? null,
          totals: existing?.totals ?? null,
          coupon: existing?.coupon ?? null,
          mp: existing?.mp ?? null,
        },
      });
    }

    // 3) Leer metadata.orderDraft desde la preferencia
    const pref = new Preference(client);
    const prefRes = await pref.get({ preferenceId });
    const orderDraft = (prefRes as unknown as { metadata?: { orderDraft?: OrderDraft } }).metadata?.orderDraft;

    if (!orderDraft) {
      console.error("Finalize: metadata.orderDraft faltante", { preferenceId, prefRes });
      return NextResponse.json({ error: "No se encontró metadata.orderDraft en la preferencia" }, { status: 400 });
    }

    // 4) Crear orden definitiva en Firestore
    const orderNumber = genOrderNumber();
    const doc = {
      number: orderNumber,
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

    return NextResponse.json({
      ok: true,
      orderId: ref.id,
      orderNumber,
      order: {
        number: orderNumber,
        items: orderDraft.items,
        buyer: orderDraft.buyer,
        shipping: orderDraft.shipping,
        totals: orderDraft.totals,
        coupon: orderDraft.coupon,
        mp: {
          paymentId,
          preferenceId,
          status: p.status,
          statusDetail: p.status_detail,
          amount: p.transaction_amount,
        },
      },
    });
  } catch (e: unknown) {
    console.error("Finalize error:", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      paymentId,
      preferenceId,
    });
    return NextResponse.json({ error: "Error finalizando orden" }, { status: 500 });
  }
}

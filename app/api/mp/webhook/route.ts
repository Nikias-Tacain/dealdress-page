// app/api/mp/webhook/route.ts (ejemplo simplificado)
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminFieldValue } from "../../_lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TODO: verificar evento con la API de MP y asegurarse que el pago fue APROBADO

    await adminDb.collection("orders").doc(body.orderId).set({
      ...body.orderData,
      createdAt: adminFieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook error", e);
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}

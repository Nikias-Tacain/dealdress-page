// app/api/mp/create-preference/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const runtime = "nodejs";

type Body = {
  buyer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    notes?: string;
  };
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    picture_url?: string;
  }>;
  metadata?: Record<string, unknown>;
};

function genOrderNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

function resolveBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    req.nextUrl.origin;

  return envUrl.replace(/\/$/, "");
}

// ✅ Tipo mínimo para la respuesta de MP que usamos
type PreferenceCreateResult = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
};

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Falta MP_ACCESS_TOKEN en variables de entorno." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Body;

    const baseUrl = resolveBaseUrl(req);
    const isHTTPS = baseUrl.startsWith("https://");

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const orderNumber = genOrderNumber();

    const mpRes = (await preference.create({
      body: {
        items: body.items.map((it) => ({
          id: it.id,
          title: it.title,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          currency_id: "ARS",
          picture_url: it.picture_url,
        })),
        payer: {
          name: body.buyer.name,
          email: body.buyer.email,
          phone: { number: body.buyer.phone },
          address: { street_name: body.buyer.address ?? "" },
        },
        metadata: {
          orderNumber,
          buyer: body.buyer,
          items: body.items,
          ...(body.metadata || {}),
        },
        external_reference: `DEAL-${orderNumber}`,
        back_urls: {
          success: `${baseUrl}/checkout/success?order=${orderNumber}`,
          pending: `${baseUrl}/checkout/pending?order=${orderNumber}`,
          failure: `${baseUrl}/checkout/failure?order=${orderNumber}`,
        },
        ...(isHTTPS ? { auto_return: "approved" as const } : {}),
        statement_descriptor: "DEALDRESS",
      },
    })) as PreferenceCreateResult;

    return NextResponse.json({
      id: mpRes.id,
      init_point: mpRes.init_point,
      sandbox_init_point: mpRes.sandbox_init_point,
      orderNumber,
    });
  } catch (e) {
    console.error("MP create-preference error:", e);
    return NextResponse.json(
      { error: "Error creando preferencia." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const runtime = "nodejs";

type PrefItem = { id: string; title: string; quantity: number; unit_price: number; picture_url?: string };
type PrefBuyer = { name: string; email: string; phone: string; address?: string; city?: string; notes?: string };

type Body = {
  buyer: PrefBuyer;
  items: PrefItem[];
  metadata?: Record<string, unknown>;
  orderNumber: number;
};

function resolveBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    req.nextUrl.origin;
  return envUrl.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ error: "Falta MP_ACCESS_TOKEN" }, { status: 500 });

    const body = (await req.json()) as Body;
    const baseUrl = resolveBaseUrl(req);
    const isHTTPS = baseUrl.startsWith("https://");

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const res = await preference.create({
      body: {
        items: body.items.map(i => ({
          id: i.id, title: i.title, quantity: i.quantity,
          unit_price: Number(i.unit_price), currency_id: "ARS", picture_url: i.picture_url,
        })),
        payer: {
          name: body.buyer.name,
          email: body.buyer.email,
          phone: { number: body.buyer.phone },
          address: { street_name: body.buyer.address ?? "" },
        },
        metadata: { ...body.metadata, orderNumber: body.orderNumber },
        external_reference: `DEAL-${body.orderNumber}`,
        back_urls: {
          success: `${baseUrl}/checkout/success?order=${body.orderNumber}`,
          pending: `${baseUrl}/checkout/pending?order=${body.orderNumber}`,
          failure: `${baseUrl}/checkout/failure?order=${body.orderNumber}`,
        },
        ...(isHTTPS ? { auto_return: "approved" as const } : {}),
        statement_descriptor: "DEALDRESS",
      },
    });

    return NextResponse.json({
      id: res.id,
      init_point: (res as unknown as { init_point?: string }).init_point,
      sandbox_init_point: (res as unknown as { sandbox_init_point?: string }).sandbox_init_point,
    });
  } catch (e) {
    console.error("MP create-preference error:", e);
    return NextResponse.json({ error: "Error creando preferencia." }, { status: 500 });
  }
}

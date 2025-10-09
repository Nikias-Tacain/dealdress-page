/* app/page.tsx */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "./lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

type Category = { id: string; title: string; image: string; href: string };
type Promo = {
  id: string;
  title: string;
  price: number;
  image?: string;
  slug?: string;
};

type ProductDoc = {
  title?: string;
  price?: number;
  image?: string;
  slug?: string;
  category?: string;
  createdAt?: unknown;
};

const categories: Category[] = [
  { id: "deportivo", title: "DEPORTIVO", image: "/categoria-deportivo.jpeg", href: "/tienda?categoria=deportivo" },
  { id: "calzado", title: "CALZADO", image: "/categoria-calzado.jpeg", href: "/tienda?categoria=calzado" },
  { id: "bolsos", title: "BOLSOS", image: "/categoria-bolsos.jpeg", href: "/tienda?categoria=bolsos" },
  { id: "botitasEverlast", title: "BOTITAS EVERLAST", image: "/categoria-everlast.jpeg", href: "/tienda?categoria=calzado&tipo=botitas_everlast" },
];

export default function Home() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingPromos(true);
      const col = collection(db, "products");
      const q = query(
        col,
        where("category", "==", "promos"),
        orderBy("createdAt", "desc"),
        limit(12)
      );
      const snap = await getDocs(q);
      const list: Promo[] = snap.docs.map((d) => {
        const data = d.data() as ProductDoc;
        return {
          id: d.id,
          title: data.title ?? "Producto",
          price: Number(data.price ?? 0),
          image: data.image ?? "/img/placeholder.png",
          slug: data.slug,
        };
      });
      setPromos(list);
      setLoadingPromos(false);
    })();
  }, []);

  return (
    <main className="min-h-dvh bg-[#e6d8d6] text-gray-900">
      {/* HERO */}
<section className="w-full">
  <div className="mx-auto max-w-[1100px]">
    <Image
      src="/hero.jpeg"
      alt="Banner"
      width={1800}
      height={480}
      className="w-full h-auto block"
      sizes="(max-width: 1100px) 100vw, 1100px"
      priority
    />
  </div>
</section>


      {/* CATEGORIES */}
      <section className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <h3 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-6">
          Secciones
        </h3>
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {categories.map((c) => (
            <a key={c.id} href={c.href} className="group relative overflow-hidden rounded-xl shadow-sm">
              <div className="relative aspect-square">
                <Image
                  src={c.image}
                  alt={c.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
              <span className="absolute inset-x-0 bottom-4 text-center text-white font-bold tracking-widest text-sm md:text-base">
                {c.title}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* PROMOS VIGENTES */}
      <section className="mx-auto max-w-6xl px-4 pb-10 md:pb-16">
        <h3 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-6">
          💥PROMOS VIGENTES💥
        </h3>

        {loadingPromos ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white p-3 md:p-4 shadow-sm">
                <div className="aspect-square rounded-lg bg-gray-200 animate-pulse" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : promos.length === 0 ? (
          <p className="text-center text-gray-600">No hay promos vigentes por ahora.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {promos.map((p) => {
              const href = `/producto/${p.slug ?? p.id}`;
              return (
                <Link
                  key={p.id}
                  href={href}
                  className="group rounded-xl bg-white p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={p.image || "/img/placeholder.png"}
                      alt={p.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="mt-3">
                    <h4 className="font-medium line-clamp-1">{p.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      ${new Intl.NumberFormat("es-AR").format(p.price)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/tienda?categoria=promos"
            className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-2 text-sm md:text-base hover:opacity-90 transition"
          >
            Ver todas las promos
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* FEATURE BAR */}
      <section className="w-full bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 sm:grid-cols-3 gap-4 place-items-center text-center">
          <Feature icon="🚚" title="Envíos a todo el país" text="Seguros y rastreables" />
          <Feature icon="🔒" title="Pago seguro" text="Con tarjetas y billeteras" />
          <Feature icon="📦" title="Cambios fáciles" text="Tenés 30 días" />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-2xl" aria-hidden>{icon}</div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-gray-600">{text}</div>
      </div>
    </div>
  );
}

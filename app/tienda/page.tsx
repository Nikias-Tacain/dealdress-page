"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { db } from "../lib/firebase";
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  orderBy,
  query,
  Query,
  QueryDocumentSnapshot,
  startAfter,
  where,
} from "firebase/firestore";
import ProductCard, { Product } from "../components/ProductCard";

type ProductDoc = {
  title?: string;
  price?: number;
  image?: string;
  slug?: string;
  createdAt?: unknown;
  category?: string;
  gender?: "hombre" | "mujer" | "unisex"; // 👈 agregado
};

const PAGE_SIZE = 12;

/** -------- PÁGINA (envuelve al componente que usa useSearchParams) -------- */
export default function TiendaPage() {
  return (
    <Suspense fallback={<TiendaSkeleton />}>
      <TiendaInner />
    </Suspense>
  );
}

/** -------- Componente que SÍ usa useSearchParams -------- */
function TiendaInner() {
  const sp = useSearchParams();
  const categoria = sp.get("categoria") || undefined;
  const genero = sp.get("genero") || undefined; // "hombre" | "mujer"

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [noMore, setNoMore] = useState(false);

  // ---------- Query base (primera página) ----------
  const baseQuery: Query<DocumentData> = useMemo(() => {
    const col = collection(db, "products");

    // sin categoría => sólo orden + limit
    if (!categoria) {
      return query(col, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    }

    // con categoría
    const parts = [where("category", "==", categoria as string), orderBy("createdAt", "desc")] as const;

    // si además es "deportivo" y vino genero => filtramos por gender
    if (categoria === "deportivo" && genero) {
      return query(col, parts[0], where("gender", "==", genero as string), parts[1], limit(PAGE_SIZE));
    }

    return query(col, parts[0], parts[1], limit(PAGE_SIZE));
  }, [categoria, genero]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setNoMore(false);
      setLastDoc(null);
      setItems([]);

      const snap = await getDocs(baseQuery);
      if (!mounted) return;

      const list: Product[] = snap.docs.map((d) => {
        const data = d.data() as ProductDoc;
        return {
          id: d.id,
          title: data.title ?? "Producto",
          price: Number(data.price ?? 0),
          image: data.image ?? "/img/placeholder.png",
          slug: data.slug,
        };
      });

      setItems(list);
      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
      setNoMore(snap.docs.length < PAGE_SIZE);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [baseQuery]);

  // ---------- Paginado (Ver más) ----------
  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);

    const col = collection(db, "products");
    let q2: Query<DocumentData>;

    if (!categoria) {
      q2 = query(col, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
    } else if (categoria === "deportivo" && genero) {
      q2 = query(
        col,
        where("category", "==", categoria),
        where("gender", "==", genero),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
    } else {
      q2 = query(
        col,
        where("category", "==", categoria),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
    }

    const snap = await getDocs(q2);

    const more: Product[] = snap.docs.map((d) => {
      const data = d.data() as ProductDoc;
      return {
        id: d.id,
        title: data.title ?? "Producto",
        price: Number(data.price ?? 0),
        image: data.image ?? "/img/placeholder.png",
        slug: data.slug,
      };
    });

    setItems((prev) => [...prev, ...more]);
    setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
    setNoMore(snap.docs.length < PAGE_SIZE);
    setLoadingMore(false);
  };

  return (
    <main className="min-h-dvh bg-[#e6d8d6] text-gray-900">
      {/* Hero simple de tienda */}
      <section className="w-full">
        <div className="mx-auto max-w-[1100px]">
          <Image
            src="/hero-tienda.png"
            alt="Tienda"
            width={1800}
            height={480}
            className="w-full h-auto block"
            sizes="(max-width: 1100px) 100vw, 1100px"
            priority
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Tienda</h1>

          {/* Filtro por categoría */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="opacity-70 shrink-0">Categoría:</span>
              <div className="flex flex-wrap gap-2 max-w-full">
                <Chip href="/tienda" active={!categoria} label="Todas" />
                <Chip href="/tienda?categoria=deportivo" active={categoria === "deportivo"} label="Deportivo" />
                <Chip href="/tienda?categoria=calzado" active={categoria === "calzado"} label="Calzado" />
                <Chip href="/tienda?categoria=bolsos" active={categoria === "bolsos"} label="Bolsos" />
                <Chip href="/tienda?categoria=mochilas" active={categoria === "mochilas"} label="Mochilas" />
                <Chip href="/tienda?categoria=promos" active={categoria === "promos"} label="Promos" />
              </div>
            </div>

            {/* Filtro por género: solo cuando categoria=deportivo */}
            {categoria === "deportivo" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="opacity-70 shrink-0">Género:</span>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    href="/tienda?categoria=deportivo"
                    active={!genero}
                    label="Todos"
                  />
                  <Chip
                    href="/tienda?categoria=deportivo&genero=hombre"
                    active={genero === "hombre"}
                    label="Hombre"
                  />
                  <Chip
                    href="/tienda?categoria=deportivo&genero=mujer"
                    active={genero === "mujer"}
                    label="Mujer"
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Grid */}
        {loading ? (
          <TiendaGridSkeleton />
        ) : (
          <>
            {items.length === 0 ? (
              <p className="text-center text-gray-600">No hay productos en esta selección.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {items.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            )}

            {!noMore && items.length > 0 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-2 text-sm md:text-base hover:opacity-90 disabled:opacity-60"
                  disabled={loadingMore}
                >
                  {loadingMore ? "Cargando..." : "Ver más"}
                  {!loadingMore && (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

/** -------- Fallbacks/Skeletons -------- */
function TiendaSkeleton() {
  return (
    <main className="min-h-dvh bg-[#e6d8d6] text-gray-900">
      <section className="relative w-full">
        <div className="w-full h-[240px] md:h-[320px] bg-gray-200 animate-pulse" />
      </section>
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="h-8 w-40 bg-gray-200 rounded mb-6 animate-pulse" />
        <TiendaGridSkeleton />
      </section>
    </main>
  );
}

function TiendaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-3 md:p-4 shadow-sm animate-pulse">
          <div className="aspect-square rounded-lg bg-gray-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** -------- UI pequeño -------- */
function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      scroll={false}
      href={href}
      className={`px-3 py-1.5 rounded-full border whitespace-nowrap cursor-pointer ${
        active ? "bg-black text-white" : "bg-white"
      }`}
    >
      {label}
    </Link>
  );
}

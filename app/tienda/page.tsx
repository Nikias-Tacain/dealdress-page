// app/tienda/page.tsx
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
  const categoria = sp.get("categoria");

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [noMore, setNoMore] = useState(false);

  const baseQuery: Query<DocumentData> = useMemo(() => {
    const col = collection(db, "products");
    return categoria
      ? query(col, where("category", "==", categoria), orderBy("createdAt", "desc"), limit(PAGE_SIZE))
      : query(col, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
  }, [categoria]);

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
    return () => {
      mounted = false;
    };
  }, [baseQuery]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);

    const col = collection(db, "products");
    const q2: Query<DocumentData> = categoria
      ? query(col, where("category", "==", categoria), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE))
      : query(col, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));

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
      <section className="relative w-full">
        <Image src="/hero-tienda.png" alt="Tienda" width={1920} height={480} className="w-full h-auto" priority />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Tienda</h1>

          {/* Filtro por categoría */}
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Categoría:</span>
            <div className="flex gap-2">
              <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${!categoria ? "bg-black text-white" : "bg-white"}`} href="/tienda">Todas</Link>
              <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="deportivo"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=deportivo">Deportivo</Link>
              <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="calzado"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=calzado">Calzado</Link>
              <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="bolsos"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=bolsos">Bolsos</Link>
              <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="mochilas"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=mochilas">Mochilas</Link>
              <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="promos"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=promos">Promos</Link>
            </div>
          </div>
        </header>

        {/* Grid */}
        {loading ? (
          <TiendaGridSkeleton />
        ) : (
          <>
            {items.length === 0 ? (
              <p className="text-center text-gray-600">No hay productos en esta categoría.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {items.map((p) => <ProductCard key={p.id} p={p} />)}
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
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
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

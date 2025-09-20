"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { db } from "../lib/firebase";
import {
  collection, query, where, orderBy, limit, getDocs, startAfter,
  DocumentData, QueryDocumentSnapshot
} from "firebase/firestore";
import ProductCard, { Product } from "../components/ProductCard";

const PAGE_SIZE = 12;

export default function TiendaPage() {
  const sp = useSearchParams();
  const categoria = sp.get("categoria"); // ej: ?categoria=deportivo

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [noMore, setNoMore] = useState(false);

  const baseQuery = useMemo(() => {
    const col = collection(db, "products");
    // Estructura esperada en Firestore: { title, price, image, category, slug }
    const clauses = [
      categoria ? where("category", "==", categoria) : null,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE),
    ].filter(Boolean) as any[];
    return query(col, ...clauses);
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
        const data = d.data() as any;
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
    const clauses = [
      categoria ? where("category", "==", categoria) : null,
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE),
    ].filter(Boolean) as any[];
    const snap = await getDocs(query(col, ...clauses));

    const more: Product[] = snap.docs.map((d) => {
      const data = d.data() as any;
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
      {/* Hero simple de tienda (opcional, podés borrar) */}
      <section className="w-full">
  <div className="mx-auto max-w-[1300px]">
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

          {/* Filtro por categoría vía querystring */}
        <div className="flex items-center gap-2 text-sm">
  <span className="opacity-70">Categoría:</span>
  <div className="flex gap-2">
    <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${!categoria ? "bg-black text-white" : "bg-white"}`} href="/tienda">Todas</Link>
    <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="deportivo"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=deportivo">Deportivo</Link>
    <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="calzado"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=calzado">Calzado</Link>
    <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="bolsos"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=bolsos">Bolsos</Link>
    <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="mochilas"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=mochilas">Mochilas</Link>
    <Link scroll={false} className={`px-3 py-1.5 rounded-full border ${categoria==="promos"?"bg-black text-white":"bg-white"}`} href="/tienda?categoria=promos">Promociones </Link>
  </div>
</div>

        </header>

        {/* Grid */}
        {loading ? (
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
        ) : (
          <>
            {items.length === 0 ? (
              <p className="text-center text-gray-600">No hay productos en esta categoría.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {items.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}

            {/* Ver más */}
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

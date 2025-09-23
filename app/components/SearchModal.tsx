// app/components/SearchModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "../lib/firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

type Result = {
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
};

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [qtext, setQtext] = useState("");
  const debounced = useDebounced(qtext, 300);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Foco al abrir + limpiar al cerrar
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQtext("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  // Búsqueda "contains" case-insensitive en cliente (sin titleLower)
  useEffect(() => {
    const run = async () => {
      if (!open) return;

      const term = debounced.trim().toLowerCase();

      // si no escribieron nada, limpio y salgo
      if (!term) {
        setResults([]);
        setError(null);
        return;
      }

      // para evitar consultas muy frecuentes con 1 letra
      if (term.length < 2) {
        setResults([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const col = collection(db, "products");

        // Traemos un “lote razonable” y filtramos en cliente por substring.
        // Subí el limit si tenés mucho catálogo.
        const snap = await getDocs(query(col, orderBy("title"), limit(200)));

        const all: Result[] = snap.docs.map((d) => {
          const data = d.data() as ProductDoc;
          return {
            id: d.id,
            title: data.title ?? "Producto",
            price: Number(data.price ?? 0),
            image: data.image ?? "/img/placeholder.png",
            slug: data.slug,
          };
        });

        const filtered = all
          .filter((p) => (p.title || "").toLowerCase().includes(term))
          .slice(0, 20);

        setResults(filtered);
      } catch (e) {
        console.error("Search error:", e);
        setError("No pudimos buscar ahora. Intentá de nuevo en un momento.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [debounced, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div className="absolute left-1/2 top-10 w-[92vw] max-w-2xl -translate-x-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {/* Icono lupa */}
          <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>

          <input
            ref={inputRef}
            value={qtext}
            onChange={(e) => setQtext(e.target.value)}
            placeholder="Buscar productos…"
            className="flex-1 outline-none py-1.5"
          />

          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm hover:bg-gray-100"
            aria-label="Cerrar"
          >
            Esc
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-auto p-2">
          {error ? (
            <div className="p-4 text-sm text-rose-600">{error}</div>
          ) : loading ? (
            <div className="p-4 text-sm text-gray-600">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">
              {qtext.length > 0 && qtext.trim().length < 2
                ? "Escribí al menos 2 letras."
                : qtext
                ? "Sin resultados."
                : "Empezá a escribir para buscar."}
            </div>
          ) : (
            <ul className="divide-y">
              {results.map((r) => {
                const href = `/producto/${r.slug ?? r.id}`;
                return (
                  <li key={r.id}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50"
                      onClick={onClose}
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-gray-100">
                        <Image
                          src={r.image || "/img/placeholder.png"}
                          alt={r.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.title}</div>
                        <div className="text-sm text-gray-600">
                          ${new Intl.NumberFormat("es-AR").format(r.price)}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

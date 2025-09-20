"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "../lib/firebase";
import {
  collection,
  endAt,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
} from "firebase/firestore";

type Result = {
  id: string;
  title: string;
  price: number;
  image?: string;
  slug?: string;
};

type ProductDoc = {
  title?: string;
  titleLower?: string;
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  // cierra con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // foco al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQtext("");
      setResults([]);
    }
  }, [open]);

  // consulta Firestore (case-insensitive usando titleLower)
  useEffect(() => {
    const run = async () => {
      const term = debounced.trim().toLowerCase();
      if (!open) return;
      if (!term) {
        setResults([]);
        return;
      }
      setLoading(true);
      const col = collection(db, "products");
      const snap = await getDocs(
        query(
          col,
          orderBy("titleLower"),
          startAt(term),
          endAt(term + "\uf8ff"),
          limit(20)
        )
      );
      const list: Result[] = snap.docs.map((d) => {
        const data = d.data() as ProductDoc;
        return {
          id: d.id,
          title: data.title ?? "Producto",
          price: Number(data.price ?? 0),
          image: data.image ?? "/img/placeholder.png",
          slug: data.slug,
        };
      });
      setResults(list);
      setLoading(false);
    };
    run();
  }, [debounced, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="absolute left-1/2 top-10 w-[92vw] max-w-2xl -translate-x-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
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

        <div className="max-h-[60vh] overflow-auto p-2">
          {loading ? (
            <div className="p-4 text-sm text-gray-600">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">
              {qtext ? "Sin resultados." : "Empezá a escribir para buscar."}
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

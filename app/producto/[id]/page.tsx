// app/producto/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { db } from "../../lib/firebase";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";

import { useCartStore } from "../../store/useCart";
import { toast } from "sonner";

type Product = {
  id: string;
  title: string;
  price: number;
  image?: string;
  images?: string[];
  description?: string;
  colors?: string[];
  sizes?: Record<string, number>;
  category?: string;
};

type ProductDoc = {
  title?: string;
  price?: number;
  image?: string;
  images?: string[];
  description?: string;
  colors?: string[];
  sizes?: Record<string, number>;
  category?: string;
  slug?: string;
};

type Related = { id: string; title: string; price: number; image?: string; slug?: string };

const LETTER_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
function compareSizes(a: string, b: string) {
  const ai = LETTER_ORDER.indexOf(a.toUpperCase());
  const bi = LETTER_ORDER.indexOf(b.toUpperCase());
  const aNum = Number(a),
    bNum = Number(b);
  const aIsNum = !Number.isNaN(aNum),
    bIsNum = !Number.isNaN(bNum);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (aIsNum && bIsNum) return aNum - bNum;
  if (ai !== -1 && bIsNum) return -1;
  if (aIsNum && bi !== -1) return 1;
  return a.localeCompare(b);
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // UI selección
  const [activeIdx, setActiveIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);

  // botón "estado visual"
  const [addState, setAddState] = useState<"idle" | "adding" | "added">("idle");

  // relacionados
  const [related, setRelated] = useState<Related[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // galería
  const gallery = useMemo(() => {
    const arr = [p?.image, ...(p?.images ?? [])].filter(Boolean) as string[];
    return Array.from(new Set(arr)).slice(0, 4);
  }, [p?.image, p?.images]);

  // stock según talle
  const stockForSelected = useMemo(() => {
    if (!p?.sizes || !size) return 10;
    return Math.max(0, Number(p.sizes[size] ?? 0));
  }, [p?.sizes, size]);

  const maxQty = Math.min(10, stockForSelected);

  // cargar producto y relacionados
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);

      // 1) por ID
      const ref = doc(db, "products", id);
      const snap = await getDoc(ref);

      let prod: Product | null = null;
      if (snap.exists()) {
        const data = snap.data() as ProductDoc;
        prod = {
          id: snap.id,
          title: data.title ?? "Producto",
          price: Number(data.price ?? 0),
          image: data.image,
          images: data.images,
          description: data.description ?? "",
          colors: data.colors ?? [],
          sizes: data.sizes ?? undefined,
          category: data.category,
        };
      } else {
        // 2) por slug
        const q = query(collection(db, "products"), where("slug", "==", id), limit(1));
        const qs = await getDocs(q);
        if (!qs.empty) {
          const d = qs.docs[0];
          const data = d.data() as ProductDoc;
          prod = {
            id: d.id,
            title: data.title ?? "Producto",
            price: Number(data.price ?? 0),
            image: data.image,
            images: data.images,
            description: data.description ?? "",
            colors: data.colors ?? [],
            sizes: data.sizes ?? undefined,
            category: data.category,
          };
        }
      }

      if (!mounted) return;
      setP(prod);
      setActiveIdx(0);
      if (prod?.colors?.length) setColor(prod.colors[0] as string);
      if (prod?.sizes) {
        const ordered = Object.keys(prod.sizes).sort(compareSizes).filter((s) => (prod!.sizes![s] ?? 0) > 0);
        if (ordered.length) setSize(ordered[0]);
      }
      setLoading(false);

      // relacionados
      if (prod?.category) {
        setLoadingRelated(true);
        try {
          const col = collection(db, "products");
          const rq = query(col, where("category", "==", prod.category), orderBy("createdAt", "desc"), limit(8));
          const rs = await getDocs(rq);
          const list: Related[] = rs.docs
            .map((d) => {
              const data = d.data() as ProductDoc;
              return {
                id: d.id,
                title: data.title ?? "Producto",
                price: Number(data.price ?? 0),
                image: data.image ?? "/img/placeholder.png",
                slug: data.slug,
              };
            })
            .filter((r) => r.id !== prod!.id);
          setRelated(list);
        } catch {
          setRelated([]);
        } finally {
          setLoadingRelated(false);
        }
      } else {
        setRelated([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // mantener qty acotada a (1..maxQty) ante cambios
  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(maxQty || 1, Math.floor(q))));
  }, [maxQty]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-[#e6d8d6]">
        <div className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl bg-white h-[480px] animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 bg-white animate-pulse rounded" />
            <div className="h-6 w-1/3 bg-white animate-pulse rounded" />
            <div className="h-32 bg-white animate-pulse rounded" />
          </div>
        </div>
      </main>
    );
  }

  if (!p) {
    return (
      <main className="min-h-dvh bg-[#e6d8d6]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-center text-gray-700">Producto no encontrado.</p>
        </div>
      </main>
    );
  }

  const sizeKeys = p.sizes ? Object.keys(p.sizes).sort(compareSizes) : [];
  const mainSrc = gallery[activeIdx] || "/img/placeholder.png";
  const sizeBlocked = p.sizes ? !size || stockForSelected === 0 : false;

  const baseBtn =
    "flex-1 rounded-full py-3 font-medium text-white transition-colors transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-black/20";
  const btnClass =
    addState === "added" ? `${baseBtn} bg-green-600 hover:bg-green-600` : `${baseBtn} bg-black hover:opacity-90`;

  return (
    <main className="min-h-dvh bg-[#e6d8d6]">
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Galería */}
          <div>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white">
              <Image src={mainSrc} alt={p.title} fill className="object-cover" priority />
            </div>

            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`relative aspect-square overflow-hidden rounded-lg border ${
                      i === activeIdx ? "border-black" : "border-gray-2 00"
                    }`}
                    aria-label={`Ver imagen ${i + 1}`}
                  >
                    <Image src={src} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{p.title}</h1>
            <p className="mt-2 text-xl text-gray-800">
              ${new Intl.NumberFormat("es-AR").format(p.price)}
            </p>

            {/* Colores */}
            {p.colors && p.colors.length > 0 && (
              <div className="mt-5">
                <div className="text-sm font-medium mb-2 ">Color</div>
                <div className="flex flex-wrap gap-2">
                  {p.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`px-3 cursor-pointer py-1.5 rounded-full border text-sm ${
                        color === c ? "bg-black text-white" : "bg-white"
                      }`}
                      aria-pressed={color === c}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Talles */}
            {p.sizes && sizeKeys.length > 0 && (
              <div className="mt-5">
                <div className="text-sm font-medium mb-2">Talle</div>
                <div className="flex flex-wrap gap-2">
                  {sizeKeys.map((s) => {
                    const stock = Number(p.sizes?.[s] ?? 0);
                    const selected = size === s;
                    const disabled = stock <= 0;
                    return (
                      <button
                        key={s}
                        onClick={() => !disabled && setSize(s)}
                        disabled={disabled}
                        className={[
                          "px-3 py-1.5 rounded-full border text-sm cursor-pointer",
                          selected ? "bg-black text-white" : "bg-white",
                          disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50",
                        ].join(" ")}
                        aria-pressed={selected}
                        title={disabled ? "Sin stock" : `Stock: ${stock}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {size && (
                  <p className="mt-1 text-xs text-gray-600">
                    Stock para <strong>{size}</strong>: {stockForSelected}
                  </p>
                )}
              </div>
            )}

            {/* Cantidad */}
            <div className="mt-5">
              <div className="text-sm font-medium mb-2">Cantidad</div>
              <div className="inline-flex items-center rounded-full border overflow-hidden ">
                <button onClick={() => setQty((q) => Math.max(1, Math.min((maxQty || 1), Math.floor(q - 1))))} className="px-3 py-2 cursor-pointer">−</button>
                <input
                  type="number"
                  min={1}
                  max={maxQty || 1}
                  value={qty}
onChange={(e) =>
  setQty(() => {
    const n = Number(e.target.value || 1);
    return Math.max(1, Math.min(maxQty || 1, Math.floor(n)));
  })
}

                  className="w-14 text-center outline-none py-2 "
                />
                <button onClick={() => setQty((q) => Math.max(1, Math.min((maxQty || 1), Math.floor(q + 1))))} className="px-3 py-2 cursor-pointer">+</button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Máximo {maxQty} {maxQty === 1 ? "unidad" : "unidades"}
                {p.sizes && !size ? " (elegí un talle)" : ""}
              </p>
            </div>

            {/* Botón agregar */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                className={btnClass}
                disabled={sizeBlocked || addState === "adding"}
                onClick={() => {
  if (sizeBlocked) {
    toast.error("Elegí un talle antes de agregar 🙏");
    return;
  }
  setAddState("adding");
  const img = mainSrc;

  addItem({
    id: p.id,
    title: p.title,
    price: p.price,
    image: img,
    qty,
    color,
    size,
    maxStock: stockForSelected,   // ⬅️ tope real del talle
  });

  setAddState("added");
  toast.success("Producto agregado al carrito", {
    action: { label: "Ver carrito", onClick: openCart },
  });
  setTimeout(() => setAddState("idle"), 1200);
}}

              >
                <span className="flex items-center justify-center gap-2 cursor-pointer">
                  {addState === "adding" && (
                    <span className="inline-block h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  {addState === "added" && (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  {addState === "adding" ? "Agregando…" : addState === "added" ? "¡Agregado!" : "Agregar al carrito"}
                </span>
              </button>
            </div>

            {/* Descripción */}
            {p.description && (
              <div className="mt-8">
                <h2 className="font-semibold mb-2">Descripción</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{p.description}</p>
              </div>
            )}

            {/* Tabla de talles */}
            {p.sizes && sizeKeys.length > 0 && (
              <div className="mt-8">
                <h2 className="font-semibold mb-3">Tabla de talles</h2>
                <div className="overflow-x-auto rounded-xl border bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Talle</th>
                        <th className="px-4 py-2 text-left">Stock</th>
                        <th className="px-4 py-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeKeys.map((s) => {
                        const stock = Number(p.sizes?.[s] ?? 0);
                        return (
                          <tr key={s} className="border-t">
                            <td className="px-4 py-2">{s}</td>
                            <td className="px-4 py-2">{stock}</td>
                            <td className="px-4 py-2">
                              {stock > 0 ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                                  Disponible
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                                  Sin stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  * Si tenés dudas con el talle, escribinos por WhatsApp 🙂
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Relacionados */}
        <div className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            {p.category ? `Más de ${p.category}` : "Productos relacionados"}
          </h2>

          {loadingRelated ? (
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
          ) : related.length === 0 ? (
            <p className="text-gray-600">No encontramos más productos en esta categoría.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {related.map((r) => {
                const href = `/producto/${r.slug ?? r.id}`;
                return (
                  <a
                    key={r.id}
                    href={href}
                    className="group rounded-xl bg-white p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={r.image || "/img/placeholder.png"}
                        alt={r.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="mt-3">
                      <h4 className="font-medium line-clamp-1">{r.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        ${new Intl.NumberFormat("es-AR").format(r.price)}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

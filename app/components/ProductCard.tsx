"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/app/store/useCart";

export type Product = {
  id: string;
  title: string;
  price: number;
  image?: string; // URL pública o ruta en /public
  slug?: string;  // opcional
};

export default function ProductCard({ p }: { p: Product }) {
  const addItem = useCartStore((s) => s.addItem);

  const href = p.slug ? `/producto/${p.slug}` : `/producto/${p.id}`;
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.image,
      qty: 1,
      color: null,
      size: null,
    });
  };

  return (
    <div className="group rounded-xl bg-white p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow">
      <Link href={href} className="block">
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

      {/* Botón fuera del <Link> para no navegar */}
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 w-full rounded-full border border-gray-200 py-2 text-sm hover:bg-gray-50"
      >
        Agregar al carrito
      </button>
    </div>
  );
}

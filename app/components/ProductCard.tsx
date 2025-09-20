"use client";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "../store/useCart";

export type Product = {
  id: string;
  title: string;
  price: number;
  image: string;   // URL pública o ruta en /public
  slug?: string;   // opcional
};

export default function ProductCard({ p }: { p: Product }) {
  const href = p.slug ? `/producto/${p.slug}` : `/producto/${p.id}`;
  const add = useCartStore((s) => s.addItem);
  return (
    <Link href={href} className="group rounded-xl bg-white p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square rounded-lg overflow-hidden">
        <Image
          src={p.image}
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

        {/* 👉 Evitamos que el Link navegue al hacer click en el botón */}


      </div>
    </Link>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import InfoMenu from "./InfoMenu";
import CartModal from "./CartModal";
import { useCartStore } from "../store/useCart";
import SearchModal from "./SearchModal"; // <— ya lo tenías importado
import { Toaster } from "sonner";


export default function Header() {
  const openCart = useCartStore((s) => s.openCart);
  const cartCount = useCartStore((s) => s.items.reduce((a, b) => a + b.qty, 0));
  const [searchOpen, setSearchOpen] = useState(false);

  // Atajo Ctrl/Cmd + K para abrir búsqueda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="w-full sticky top-0 z-50">
      {/* Announcement bar */}
      <div className="w-full bg-neutral-800 text-neutral-200 text-[11px] sm:text-xs tracking-wide text-center py-1">
        ENVIOS A TODO EL PAÍS CON ANDREANI 🇦🇷
      </div>

      {/* Navbar */}
      <div className="w-full bg-black text-white">
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          <nav className="flex items-center justify-between h-16">
            {/* Left: logo */}
            <div className="flex-1 flex justify-start">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-full p-1 shadow-sm ring-1 ring-black/10">
                  <Image
                    src="/favicon.ico"
                    alt="DealDress"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="md:inline text-sm font-semibold tracking-wide">
                  Deal Dress
                </span>
              </Link>
            </div>

            {/* Center: pills (desktop) */}
            <div className="flex-1 hidden md:flex items-center justify-center gap-4">
              <InfoMenu />
              <NavPill href="/tienda" label="TIENDA" />
              <NavPill
                href="https://api.whatsapp.com/send?phone=3415075439&text=¡Hola!%20Vengo%20de%20la%20pagina%2C%20deseo%20mas%20informacion."
                label="CONTACTO"
              />
            </div>

            {/* Right: search + cart (AQUÍ los cambios) */}
            <div className="flex-1 flex items-center justify-end gap-3">
              {/* Lupa */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-white/10 shadow-sm px-3 py-2 text-sm"
                aria-label="Buscar productos (Ctrl/Cmd + K)"
                title="Buscar productos (Ctrl/Cmd + K)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>

              {/* Carrito (igual que antes) */}
              <button
                type="button"
                onClick={openCart}
                className="flex items-center gap-2 text-sm hover:opacity-80"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-90">
                  <path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.6H9.4a2 2 0 0 1-2-1.6L6 6Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 6 5 3H3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <circle cx="9" cy="20" r="1.3" fill="currentColor" />
                  <circle cx="18" cy="20" r="1.3" fill="currentColor" />
                </svg>
                <span className="text-base">{cartCount}</span>
              </button>
            </div>
          </nav>

          {/* Center: pills (mobile) */}
          <div className="md:hidden pb-3">
            <div className="flex items-center justify-center gap-2">
              <InfoMenu compact />
              <NavPill href="/tienda" label="TIENDA" compact />
              <NavPill
                href="https://api.whatsapp.com/send?phone=3415075439&text=¡Hola!%20Vengo%20de%20la%20pagina%2C%20deseo%20mas%20informacion."
                label="CONTACTO"
                compact
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <CartModal />
      <Toaster position="top-center" richColors closeButton expand />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function NavPill({
  href,
  label,
  dropdown = false,
  compact = false,
}: {
  href: string;
  label: string;
  dropdown?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center rounded-lg",
        "bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
        "border border-white/10 shadow-sm",
        compact ? "px-3 py-1.5 text-[13px]" : "px-5 py-2 text-sm",
      ].join(" ")}
    >
      <span className="tracking-wide">{label}</span>
      {dropdown && <span className="ml-1.5 opacity-90">↓</span>}
    </Link>
  );
}

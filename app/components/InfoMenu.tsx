"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

export default function InfoMenu({ compact = false }: { compact?: boolean }) {
  const [openMenu, setOpenMenu] = useState(false);
  const [modal, setModal] = useState<null | "cambios" | "pagos">(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Cerrar al hacer click fuera
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    }
    if (openMenu) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  // Accesibilidad: cerrar con ESC cuando el menú está abierto
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(false);
    }
    if (openMenu) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [openMenu]);

  const pillBase =
    "inline-flex items-center justify-center rounded-lg border border-white/10 shadow-sm " +
    "bg-neutral-800 text-neutral-100 hover:bg-neutral-700";
  const pillSize = compact ? "px-3 py-1.5 text-[13px]" : "px-5 py-2 text-sm";

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={btnRef}
        className={`${pillBase} ${pillSize}`}
        onClick={() => setOpenMenu((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={openMenu}
      >
        <span className="tracking-wide">INFORMACIÓN</span>
        <span className="ml-1.5 opacity-90">↓</span>
      </button>

      {/* Dropdown: pega sobre el fondo negro */}
      {openMenu && (
        <div
          role="menu"
          className="
            absolute left-0 mt-2 min-w-[220px] z-50
            rounded-md border border-white/10
            bg-black text-white
            shadow-lg overflow-hidden
          "
        >
          <MenuItem
            label="Política de cambio"
            onClick={() => {
              setModal("cambios");
              setOpenMenu(false);
            }}
          />
          <MenuItem
            label="Métodos de pago"
            onClick={() => {
              setModal("pagos");
              setOpenMenu(false);
            }}
          />
        </div>
      )}

      {/* Modales */}
      <Modal
        open={modal === "cambios"}
        onClose={() => setModal(null)}
        title="Política de cambio"
      >
        <ul className="list-disc pl-5 space-y-2">
          <li>Tenés <strong>72 horas</strong> desde la recepción para cambios.</li>
          <li>El producto debe estar <strong>sin uso</strong>.</li>
          <li>Los cambios se coordinan por <strong>Andreani</strong> (ida y vuelta a cargo del cliente).</li>
          <li>Se cambia <strong>articulo por artículo</strong>.</li>
          <li>Escribinos a <strong><span className="font-mono">dealdress.ropa@gmail.com</span></strong> con número de orden.</li>
        </ul>
      </Modal>

      <Modal
        open={modal === "pagos"}
        onClose={() => setModal(null)}
        title="Métodos de pago"
      >
        <div className="space-y-2">
          <p>Aceptamos:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Tarjetas de crédito y débito (VISA, Mastercard, Amex)</li>
            <li>Mercado Pago (saldo/billetera, transferencia, efectivo)</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 focus:bg-white/10 focus:outline-none"
    >
      {label}
    </button>
  );
}

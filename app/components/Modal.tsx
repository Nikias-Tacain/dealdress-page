"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  // Cerrar con ESC
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center      /* ⬅️ SIEMPRE centrado */
        p-4                                   /* respiro en pantallas chicas */
      "
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div
        className="
          relative w-full max-w-lg              /* ancho máx desktop */
          bg-white text-gray-900 shadow-xl
          rounded-2xl                           /* SIEMPRE redondeado */
          max-h-[85vh] overflow-auto            /* scroll interno si se pasa */
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 id="modal-title" className="text-base sm:text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 hover:bg-gray-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-4 text-sm sm:text-base">{children}</div>
      </div>
    </div>
  );
}

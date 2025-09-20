// app/components/WhatsAppFab.tsx
import Link from "next/link";

const WA_URL =
  "https://api.whatsapp.com/send?phone=3415075439&text=%C2%A1Hola!%20Vengo%20de%20la%20pagina%2C%20deseo%20mas%20informacion.";

export default function WhatsAppFab() {
  return (
    <div
      className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-40"
      // empuja un pelín por safe area en iOS
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatear por WhatsApp"
        className="group relative block"
      >
        {/* halo animado */}
        <span
          className="absolute -inset-1 rounded-full bg-[#25D366]/30 opacity-70 blur-md transition
                     group-hover:opacity-90 group-hover:blur-lg"
          aria-hidden
        />
        {/* botón */}
        <span
          className="relative flex h-14 w-14 items-center justify-center rounded-full
                     bg-[#25D366] text-white shadow-lg ring-1 ring-black/10
                     transition-transform duration-200 group-active:scale-95 group-hover:shadow-xl"
        >
          {/* Ícono WhatsApp */}
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.52 3.48A11.77 11.77 0 0 0 12.01 0C5.39 0 .03 5.36.03 11.98c0 2.11.55 4.16 1.6 5.98L0 24l6.2-1.6a11.96 11.96 0 0 0 5.8 1.48h.01c6.62 0 11.98-5.36 11.98-11.98 0-3.2-1.25-6.2-3.45-8.42ZM12 21.3h-.01a9.3 9.3 0 0 1-4.75-1.3l-.34-.2-3.67.95.98-3.58-.22-.37A9.26 9.26 0 0 1 2.7 12C2.7 6.82 6.82 2.7 12 2.7c2.48 0 4.81.97 6.56 2.72A9.22 9.22 0 0 1 21.3 12c0 5.18-4.12 9.3-9.3 9.3Zm5.38-7.15c-.29-.15-1.69-.84-1.95-.94-.26-.1-.45-.15-.63.15-.18.3-.72.94-.88 1.14-.16.2-.33.22-.62.08-.29-.15-1.21-.45-2.3-1.43-.85-.76-1.42-1.68-1.58-1.97-.16-.29-.02-.45.12-.6.12-.12.29-.33.43-.49.14-.16.18-.27.27-.46.09-.2.04-.35-.02-.5-.06-.15-.63-1.53-.86-2.1-.23-.55-.46-.47-.63-.48-.16 0-.35-.01-.54-.01-.2 0-.5.07-.76.35s-1 1-1 2.44 1.02 2.83 1.17 3.02c.14.2 2 3.06 4.84 4.29.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.69-.69 1.93-1.36.24-.68.24-1.26.17-1.37-.07-.11-.26-.18-.55-.33Z" />
          </svg>
        </span>
        {/* etiqueta oculta accesible */}
        <span className="sr-only">Chatear por WhatsApp</span>
      </Link>
    </div>
  );
}

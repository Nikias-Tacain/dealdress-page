// app/components/Footer.tsx
"use client";

import { useState } from "react";
import { db } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = email.trim().toLowerCase();

    // validación simple
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      toast.error("Ingresá un correo válido");
      return;
    }

    try {
      setSending(true);
      await addDoc(collection(db, "newsletter"), {
        email: val,
        createdAt: serverTimestamp(),
      });
      setEmail("");
      toast.success("Correo enviado correctamente ✅");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo enviar. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <footer className="w-full bg-[#f5efef] border-t border-black">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-center">
          <div>
            <h5 className="font-semibold mb-2">Medios de pago</h5>
            <ul className="flex flex-wrap justify-center gap-2 opacity-80">
              <li className="rounded bg-white px-2 py-1 border">VISA</li>
              <li className="rounded bg-white px-2 py-1 border">Mastercard</li>
              <li className="rounded bg-white px-2 py-1 border">MercadoPago</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold mb-2">Contacto</h5>
            <p className="flex items-center justify-center gap-2">
              {/* icono mail */}
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <a className="hover:underline" href="mailto:dealdress.ropa@gmail.com">
                dealdress.ropa@gmail.com
              </a>
            </p>
            <p className="mt-1 flex items-center justify-center gap-2">
              {/* icono casa */}
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                <path d="M3 10.5L12 3l9 7.5V21H3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 21v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Donado 1500 - Rosario
            </p>
          </div>

          <div>
            <h5 className="font-semibold mb-2">Seguinos</h5>
            <ul className="flex justify-center gap-3">
              <li>
                <a
                  className="hover:underline"
                  href="https://www.instagram.com/dealdress.tiendaonline"
                  target="_blank"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  className="hover:underline"
                  href="https://www.tiktok.com/@dealdressropa"
                  target="_blank"
                >
                  TikTok
                </a>
              </li>
              <li>
                <a
                  className="hover:underline"
                  href="https://api.whatsapp.com/send?phone=3415075439&text=¡Hola!%20Vengo%20de%20la%20pagina%2C%20deseo%20mas%20informacion."
                  target="_blank"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-10">
          <h5 className="font-semibold mb-3 text-center">Suscribite al newsletter</h5>
          <form onSubmit={onSubscribe} className="flex justify-center">
            <div className="flex w-full max-w-md gap-2">
              <input
                type="email"
                placeholder="Tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                required
              />
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {sending ? "Enviando…" : "Suscribirme"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-10 text-xs text-gray-600 text-center">
          © {new Date().getFullYear()} DealDress. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

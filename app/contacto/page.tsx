// app/contacto/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-static";

const IMAGES: { src: string; alt?: string }[] = [
  // 👉 Cambiá estas rutas por las de tus imágenes reales
  { src: "/contacto-1.jpg", alt: "DealDress - Indumentaria deportiva" },
  { src: "/contacto-2.jpg", alt: "Entrenando con DealDress" },
  { src: "/contacto-3.jpg", alt: "Ropa urbana DealDress" },
];

export default function Page() {
  const [i, setI] = useState(0);
  const hasMany = IMAGES.length > 1;

  // Auto-rotación del carrusel (pausa si hay 1 sola imagen)
  useEffect(() => {
    if (!hasMany) return;
    const t = setInterval(() => setI((p) => (p + 1) % IMAGES.length), 4000);
    return () => clearInterval(t);
  }, [hasMany]);

  const go = (next: number) => {
    if (!hasMany) return;
    const n = (next + IMAGES.length) % IMAGES.length;
    setI(n);
  };

  return (
    <main className="min-h-dvh bg-[#e6d8d6] text-gray-900">
      {/* HERO con carrusel */}
      <section className="relative w-full">
        <div className="mx-auto max-w-[1100px]">
          <div className="relative w-full h-[38vh] sm:h-[44vh] md:h-[52vh] rounded-xl overflow-hidden">
            <Image
              key={IMAGES[i]?.src}
              src={IMAGES[i]?.src || "/hero-tienda.jpeg"}
              alt={IMAGES[i]?.alt || "DealDress"}
              fill
              priority
              className="object-contain bg-white" // no recorta la imagen
              sizes="(max-width: 1100px) 100vw, 1100px"
            />

            {/* degradado para título */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

            {/* título */}
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
              <h1 className="text-white text-2xl md:text-3xl font-bold drop-shadow">
                ¿Quiénes somos?
              </h1>
            </div>

            {/* Controles del carrusel */}
            {hasMany && (
              <>
                <button
                  aria-label="Anterior"
                  onClick={() => go(i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-2 hover:bg-black/70"
                >
                  ‹
                </button>
                <button
                  aria-label="Siguiente"
                  onClick={() => go(i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-2 hover:bg-black/70"
                >
                  ›
                </button>

                {/* indicadores */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {IMAGES.map((_, idx) => (
                    <button
                      key={idx}
                      aria-label={`Ir a imagen ${idx + 1}`}
                      onClick={() => setI(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === idx ? "w-6 bg-white" : "w-3 bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Contenido */}
      <section className="mx-auto max-w-3xl px-4 pt-6 pb-14 md:pt-8">
        <div className="prose prose-neutral max-w-none">
          <p>
            En <b>Dealdress</b> creemos que la ropa no solo viste, sino que también
            transmite actitud, energía y estilo. Somos una empresa familiar que
            nació en plena pandemia, hace ya 5 años, con el sueño de crear un
            espacio donde la moda deportiva y urbana se unieran para acompañar la
            vida activa de cada persona.
          </p>
          <p>
            Desde el inicio trabajamos con compromiso, pasión y dedicación,
            seleccionando prendas que combinan comodidad, calidad y diseño.
            Nuestra especialidad es la ropa deportiva, ideal para entrenar,
            competir o simplemente moverse con libertad; pero también ofrecemos
            una línea urbana, pensada para quienes buscan un look moderno y
            versátil para el día a día.
          </p>
          <p>
            Hoy seguimos creciendo, siempre con la misma esencia: cercanía con
            nuestros clientes, atención personalizada y el deseo de que cada
            prenda que elijas de Dealdress te inspire a sentirte bien y a vivir tu
            mejor versión.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
          <Link
            href="https://api.whatsapp.com/send?phone=3415075439"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-5 py-3 hover:opacity-90"
          >
            Escribinos por WhatsApp
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 12a10 10 0 1 1-18.29 6L2 22l4-1.71A10 10 0 1 1 22 12Z" />
              <path d="M14.5 13.5c-1 .5-2.5-1-3-1.5-.5-.5-2-2-1.5-3 .3-.6 1.5-1 1.5-1l.5.5c.5.5.5 1 .5 1.5 0 .2-.2.5-.3.7-.2.2-.2.4 0 .6.3.4 1.1 1.2 1.5 1.5.2.2.4.2.6 0 .2-.1.5-.3.7-.3.5 0 1 .0 1.5.5l.5.5s-.4 1.2-1 1.5Z" />
            </svg>
          </Link>

          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 rounded-full border px-5 py-3 hover:bg-gray-50"
          >
            Ver productos
          </Link>
        </div>
      </section>
    </main>
  );
}

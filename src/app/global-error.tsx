"use client";

import { ArrowRight, RotateCcw } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="de">
      <body>
        <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-6 py-12 text-white grain">
          <div className="absolute inset-0 grid-lines" aria-hidden />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/20 blur-[150px]" aria-hidden />
          <section className="relative max-w-xl text-center">
            <p className="eyebrow justify-center text-electric-soft">TarifWerk</p>
            <h1 className="mt-4 text-[clamp(2rem,5vw,3.6rem)] font-extrabold leading-[1.02]">
              Dieser Bereich konnte gerade nicht <span className="display-i font-normal text-champagne-soft">geladen werden.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-silver">
              Deine Eingaben wurden dadurch nicht automatisch erneut gesendet. Du kannst den Bereich neu laden oder zur Startseite wechseln.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={reset} className="inline-flex h-12 items-center gap-2 rounded-full bg-electric px-6 text-[14px] font-bold text-white hover:bg-electric-deep">
                <RotateCcw className="h-4 w-4" /> Erneut laden
              </button>
              <a href="/" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-[14px] font-bold text-white hover:bg-white/10">
                Zur Startseite <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

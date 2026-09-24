"use client";

import dynamic from "next/dynamic";
import { MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import type { AudienceMode } from "@/lib/audience";

const LoadedPublicAiChat = dynamic(
  () => import("@/components/site/PublicAiChat").then((module) => module.PublicAiChat),
  { ssr: false },
);

export function LazyPublicAiChat({ audience }: { audience: AudienceMode }) {
  const [activated, setActivated] = useState(false);

  if (activated) return <LoadedPublicAiChat audience={audience} initiallyOpen />;

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className="fixed bottom-[76px] right-3 z-[69] inline-flex h-12 items-center gap-2 rounded-full border border-electric/30 bg-ink-800 px-3.5 text-[11px] font-extrabold text-white shadow-[0_16px_44px_-16px_rgba(79,141,255,.7)] transition hover:-translate-y-0.5 hover:border-electric/60 md:bottom-24 md:right-6 md:h-13 md:px-4"
      aria-label="TarifWerk KI-Berater öffnen"
    >
      <span className="relative grid h-7 w-7 place-items-center rounded-full bg-electric text-white">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="hidden sm:inline">KI-Berater fragen</span>
      <MessageCircle className="h-4 w-4 sm:hidden" aria-hidden="true" />
    </button>
  );
}

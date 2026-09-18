"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AudienceMode = "b2c" | "b2b";

type AudienceContextValue = {
  audience: AudienceMode;
  setAudience: (mode: AudienceMode) => void;
  isBusiness: boolean;
};

const AudienceContext = createContext<AudienceContextValue | null>(null);

export function AudienceProvider({ initialAudience = "b2c", children }: { initialAudience?: AudienceMode; children: ReactNode }) {
  const [audience, setAudienceState] = useState<AudienceMode>(initialAudience);

  const setAudience = (mode: AudienceMode) => {
    setAudienceState(mode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (mode === "b2b") url.searchParams.set("audience", "b2b");
      else url.searchParams.delete("audience");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  };

  const value = useMemo(() => ({ audience, setAudience, isBusiness: audience === "b2b" }), [audience]);

  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

export function useAudience() {
  const context = useContext(AudienceContext);
  if (!context) throw new Error("useAudience must be used inside AudienceProvider");
  return context;
}

export function AudienceToggle({ className = "" }: { className?: string }) {
  const { audience, setAudience } = useAudience();
  return (
    <div className={`inline-flex rounded-full border border-white/12 bg-white/[0.06] p-1 backdrop-blur ${className}`} role="group" aria-label="Zielgruppe wählen">
      <button
        type="button"
        onClick={() => setAudience("b2c")}
        aria-pressed={audience === "b2c"}
        className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all duration-300 ${audience === "b2c" ? "bg-white text-ink shadow-sm" : "text-silver hover:text-white"}`}
      >
        Privatkunden
      </button>
      <button
        type="button"
        onClick={() => setAudience("b2b")}
        aria-pressed={audience === "b2b"}
        className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all duration-300 ${audience === "b2b" ? "bg-electric text-white shadow-glow" : "text-silver hover:text-white"}`}
      >
        Geschäftskunden
      </button>
    </div>
  );
}

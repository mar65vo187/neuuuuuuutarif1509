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
      document.cookie = "tarifwerk-audience=" + mode + "; Path=/; Max-Age=2592000; SameSite=Lax";
      const url = new URL(window.location.href);
      url.searchParams.set("audience", mode);
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
    <div className={`inline-flex rounded-full border border-white/10 bg-white/[0.045] p-1 ${className}`} role="group" aria-label="Zielgruppe wählen">
      <button type="button" onClick={() => setAudience("b2c")} aria-pressed={audience === "b2c"} className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors duration-200 ${audience === "b2c" ? "bg-white text-ink" : "text-silver hover:text-white"}`}>Privat</button>
      <button type="button" onClick={() => setAudience("b2b")} aria-pressed={audience === "b2b"} className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors duration-200 ${audience === "b2b" ? "bg-electric text-white" : "text-silver hover:text-white"}`}>Business</button>
    </div>
  );
}

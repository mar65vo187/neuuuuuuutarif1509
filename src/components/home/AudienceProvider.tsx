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

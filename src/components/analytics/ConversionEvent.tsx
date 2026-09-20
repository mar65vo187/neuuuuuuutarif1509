"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function ConversionEvent({ leadId, audience, type }: { leadId?: number | null; audience: "b2c" | "b2b"; type: string }) {
  useEffect(() => {
    const detail = {
      event: "tarifwerk_lead_submitted",
      leadId: leadId ?? undefined,
      audience,
      leadType: type,
      path: window.location.pathname,
    };
    window.dataLayer?.push(detail);
    window.dispatchEvent(new CustomEvent("tarifwerk:conversion", { detail }));
  }, [leadId, audience, type]);

  return null;
}

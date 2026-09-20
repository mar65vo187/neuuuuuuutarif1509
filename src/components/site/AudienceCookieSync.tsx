"use client";

import { useEffect } from "react";

export function AudienceCookieSync() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const audience = url.searchParams.get("audience");
    if (audience !== "b2b" && audience !== "b2c") return;
    document.cookie = "tarifwerk-audience=" + audience + "; Path=/; Max-Age=2592000; SameSite=Lax";
  }, []);
  return null;
}

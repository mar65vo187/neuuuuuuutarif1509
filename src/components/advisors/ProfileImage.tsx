"use client";

import { useState } from "react";

export function ProfileImage({ src, initials, alt = "" }: { src: string; initials: string; alt?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return initials;
  // Native image preserves the existing avatar bounds and serves our validated storage route directly.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={144} height={144} loading="lazy" onError={() => setFailed(src)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />;
}

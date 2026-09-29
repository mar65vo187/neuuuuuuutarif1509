import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TarifWerk – Beratung auf Augenhöhe",
    short_name: "TarifWerk",
    description: "Persönliche Beratung zu Telekommunikation, Energie, Versicherungen und weiteren Themen – deutschlandweit.",
    start_url: "/",
    display: "standalone",
    background_color: "#060b16",
    theme_color: "#060b16",
    lang: "de-DE",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "260x260",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

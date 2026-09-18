import { ImageResponse } from "next/og";

export const alt = "TarifWerk – Beratung auf Augenhöhe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#060b16",
          color: "#ffffff",
          padding: "64px 72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div style={{ width: "54px", height: "54px", borderRadius: "16px", background: "#4f8dff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 800 }}>TW</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "34px", fontWeight: 800 }}>TarifWerk</div>
            <div style={{ fontSize: "18px", color: "#aeb8c8" }}>Beratung auf Augenhöhe</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: "980px" }}>
          <div style={{ fontSize: "66px", lineHeight: 1.05, fontWeight: 800, letterSpacing: "-2px" }}>
            Ein Ansprechpartner. Viele Themen. Klare Entscheidungen.
          </div>
          <div style={{ marginTop: "28px", fontSize: "26px", lineHeight: 1.35, color: "#c8d0dd" }}>
            Internet · Mobilfunk · Energie · Solar · Wärmepumpe · Versicherungen · Immobilien · deutschlandweit
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", color: "#8f9bad" }}>
          <div>www.tarifwerk.eu</div>
          <div>Persönliche Beratung · Wiesbaden & deutschlandweit</div>
        </div>
      </div>
    ),
    size,
  );
}

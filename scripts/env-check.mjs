import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const errors = [];
try {
  const url = new URL(process.env.DATABASE_URL || "");
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2 || url.hash) {
    throw new Error("invalid");
  }
} catch {
  errors.push("DATABASE_URL muss eine vollständige PostgreSQL-Verbindung einschließlich Datenbankname sein.");
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.trim().length < 32) {
  errors.push("SESSION_SECRET benötigt mindestens 32 zufällige Zeichen.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((process.env.PORTAL_ADMIN_EMAIL || "").trim())) {
  errors.push("PORTAL_ADMIN_EMAIL fehlt oder ist ungültig.");
}
if (process.env.PORTAL_OWNER_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.PORTAL_OWNER_EMAIL.trim())) {
  errors.push("PORTAL_OWNER_EMAIL ist ungültig.");
}
// After initial setup the password may be removed; seed checks whether it is needed.
if (process.env.PORTAL_ADMIN_PASSWORD && (process.env.PORTAL_ADMIN_PASSWORD.length < 12 || process.env.PORTAL_ADMIN_PASSWORD.length > 200)) {
  errors.push("PORTAL_ADMIN_PASSWORD muss 12 bis 200 Zeichen enthalten.");
}
if (process.env.NODE_ENV === "production" && !(process.env.BUSINESS_ADDRESS || "").trim()) {
  errors.push("BUSINESS_ADDRESS muss in Produktion als vollständige Geschäftsanschrift gesetzt sein.");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Konfiguration gültig. Erreichbarkeit und Datenbankstand separat mit npm run db:check prüfen.");
}

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { advisors, employees } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

/** Explicit setup only. Never invoke seeding from a page, query, or login request. */
export async function seedDatabase(): Promise<void> {
  const email = (process.env.PORTAL_ADMIN_EMAIL || "m.egenolf@tarifwerk.eu").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("PORTAL_ADMIN_EMAIL is invalid");
  const password = process.env.PORTAL_ADMIN_PASSWORD;
  const resetPassword = process.env.PORTAL_ADMIN_RESET_PASSWORD === "true";
  await db.transaction(async (tx) => {
    // Serializes concurrent setup runs without touching existing profile content.
    await tx.execute(sql`select pg_advisory_xact_lock(7480321)`);
    const [existing] = await tx.select().from(employees).where(eq(sql`lower(${employees.email})`, email)).limit(1);
    if ((!existing || resetPassword) && (!password || password.length < 12 || password.length > 200)) {
      throw new Error("Set PORTAL_ADMIN_PASSWORD to a unique password of 12 to 200 characters");
    }
    if (existing && existing.role !== "admin") {
      throw new Error("PORTAL_ADMIN_EMAIL already belongs to a non-admin account");
    }
    await tx
      .insert(advisors)
      .values({
        slug: "marvin-egenolf",
        name: "Marvin Noel Egenolf",
        title: "Gründer von TarifWerk",
        city: "Wiesbaden",
        region: "Deutschlandweit",
        regions: ["Wiesbaden", "Mainz", "Frankfurt am Main", "Worms", "Deutschlandweit (digital)"],
        topics: ["Internet, Mobilfunk, TV", "Strom & Gas", "Versicherungen", "Sicherheitslösungen", "Klimaanlagen", "Solar (Photovoltaik) & Wärmepumpe", "Edelmetalle", "Immobilien"],
        bio: "Marvin hat TarifWerk gegründet, um mehrere Vertrags-, Versorgungs- und Entscheidungsthemen in einem persönlichen Beratungsprozess zusammenzuführen. Sein Anspruch: relevante Kriterien offen erklären, Empfehlungen nachvollziehbar begründen und danach erreichbar bleiben.",
        quote: "Ich will, dass du nach unserem Gespräch verstehst, welche Möglichkeiten du hast und warum ein nächster Schritt Sinn ergibt – oder eben nicht.",
        phone: "+4915782301076",
        whatsapp: "4915782301076",
        email: "m.egenolf@tarifwerk.eu",
        initials: "ME",
        isFounder: true,
        sortOrder: 1,
      })
      .onConflictDoNothing();

    const [founder] = await tx.select({ id: advisors.id }).from(advisors).where(eq(advisors.slug, "marvin-egenolf")).limit(1);
    if (!existing) {
      await tx.insert(employees).values({
        name: "Marvin Noel Egenolf", email, passwordHash: hashPassword(password!),
        role: "admin", advisorId: founder?.id ?? null,
      });
    } else if (resetPassword) {
      if (existing.role !== "admin") throw new Error("The specified account is not an administrator");
      await tx.update(employees).set({ passwordHash: hashPassword(password!), active: true }).where(eq(employees.id, existing.id));
    }
  });
}

import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { employeeTrainingCompletions, trainingModules } from "@/db/enterprise-schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

export async function GET(_request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const code = decodeURIComponent((await context.params).code).trim();
  if (!/^TW-[A-Z0-9-]{6,120}$/i.test(code)) return NextResponse.json({ ok: false, error: "Ungültiger Nachweiscode." }, { status: 400 });

  const [row] = await db.select({
    employeeId: employeeTrainingCompletions.employeeId,
    employeeName: employees.name,
    moduleTitle: trainingModules.title,
    moduleCategory: trainingModules.category,
    completedAt: employeeTrainingCompletions.completedAt,
    expiresAt: employeeTrainingCompletions.expiresAt,
    status: employeeTrainingCompletions.status,
    certificateCode: employeeTrainingCompletions.certificateCode,
  }).from(employeeTrainingCompletions)
    .innerJoin(employees, eq(employeeTrainingCompletions.employeeId, employees.id))
    .innerJoin(trainingModules, eq(employeeTrainingCompletions.moduleId, trainingModules.id))
    .where(and(eq(employeeTrainingCompletions.certificateCode, code), eq(employeeTrainingCompletions.status, "completed")))
    .limit(1);

  if (!row) return NextResponse.json({ ok: false, error: "Schulungsnachweis nicht gefunden." }, { status: 404 });
  if (user.role !== "admin" && user.id !== row.employeeId) return NextResponse.json({ ok: false, error: "Kein Zugriff." }, { status: 403 });

  const completed = row.completedAt.toLocaleDateString("de-DE");
  const expires = row.expiresAt ? row.expiresAt.toLocaleDateString("de-DE") : "unbefristet";
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TarifWerk Schulungsnachweis</title><style>body{font-family:Arial,sans-serif;background:#f5f7fa;color:#0b1220;margin:0;padding:40px}.card{max-width:820px;margin:0 auto;background:white;border:1px solid #dbe2ea;border-radius:24px;padding:48px}.brand{font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#366ee8}.title{font-size:34px;margin:18px 0 8px}.muted{color:#5f6b7a}.name{font-size:26px;font-weight:800;margin:32px 0 8px}.box{margin-top:30px;background:#f5f7fa;border-radius:16px;padding:20px;line-height:1.7}.code{font-family:monospace;font-size:14px;margin-top:30px}.print{margin-top:30px}@media print{body{background:white;padding:0}.card{border:0}.print{display:none}}</style></head><body><div class="card"><div class="brand">TarifWerk · Learning Center</div><h1 class="title">Schulungsnachweis</h1><p class="muted">Dieser interne Nachweis bestätigt den dokumentierten Abschluss einer TarifWerk-Schulung.</p><div class="name">${esc(row.employeeName)}</div><div class="box"><strong>${esc(row.moduleTitle)}</strong><br>Kategorie: ${esc(row.moduleCategory)}<br>Abgeschlossen am: ${completed}<br>Gültig bis: ${expires}</div><p class="code">Nachweiscode: ${esc(row.certificateCode ?? code)}</p><button class="print" onclick="window.print()">Drucken / als PDF speichern</button></div></body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="TarifWerk-Schulungsnachweis-${encodeURIComponent(row.moduleTitle)}.html"`,
    },
  });
}

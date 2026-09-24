import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pool } from "@/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Eingangsbeleg · TarifWerk", robots: { index: false, follow: false, noarchive: true } };

export default async function ContractNoticeReceipt({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const result = await pool.query<{
    notice_type: string; customer_name: string; email: string; contract_label: string; cancellation_type: string | null;
    reason: string | null; requested_end: string | null; status: string; received_at: Date;
  }>(
    "select notice_type,customer_name,email,contract_label,cancellation_type,reason,requested_end,status,received_at from optimization_contract_notices where receipt_token=$1 limit 1",
    [token],
  );
  const notice = result.rows[0];
  if (!notice) notFound();
  const cancellation = notice.notice_type === "cancellation";
  return <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100"><article className="mx-auto max-w-2xl rounded-[28px] border border-white/10 bg-white/[0.05] p-6 sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300">TarifWerk Eingangsbeleg</p><h1 className="mt-3 text-3xl font-extrabold">{cancellation ? "Kündigung eingegangen" : "Widerruf eingegangen"}</h1><dl className="mt-7 grid gap-3 text-sm"><div><dt className="text-slate-400">Vertrag</dt><dd className="font-semibold">{notice.contract_label}</dd></div><div><dt className="text-slate-400">Name</dt><dd>{notice.customer_name}</dd></div><div><dt className="text-slate-400">E-Mail</dt><dd>{notice.email}</dd></div><div><dt className="text-slate-400">Eingang</dt><dd>{notice.received_at.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} Uhr</dd></div>{cancellation && <div><dt className="text-slate-400">Beendigungswunsch</dt><dd>{notice.requested_end === "earliest" ? "Zum frühestmöglichen Zeitpunkt" : notice.requested_end || "Zum frühestmöglichen Zeitpunkt"}</dd></div>}{notice.reason && <div><dt className="text-slate-400">Hinweis / Grund</dt><dd className="whitespace-pre-wrap">{notice.reason}</dd></div>}</dl><div className="mt-8 rounded-xl border border-white/10 bg-black/15 p-4 text-xs leading-5 text-slate-300">Speichere diese Seite als PDF oder drucke sie für deine Unterlagen. Der Datensatz wird zusätzlich serverseitig mit Eingangszeitpunkt geführt.</div></article></main>;
}

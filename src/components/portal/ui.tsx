import { LEAD_STATUS_LABELS, LEAD_TYPE_LABELS } from "@/lib/content";

export const STATUS_STYLES: Record<string, string> = {
  neu: "bg-electric/12 text-electric-deep border-electric/30",
  kontaktiert: "bg-amber-100 text-amber-800 border-amber-200",
  termin_bestaetigt: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_beratung: "bg-violet-100 text-violet-800 border-violet-200",
  abgeschlossen: "bg-ink text-white border-ink",
  verloren: "bg-paper-2 text-steel border-line",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`chip ${STATUS_STYLES[status] ?? "border-line text-steel"}`}>{LEAD_STATUS_LABELS[status] ?? status}</span>;
}

export function TypeBadge({ type }: { type: string }) {
  return <span className="chip border-line bg-white text-ink-700">{LEAD_TYPE_LABELS[type] ?? type}</span>;
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "–";
  const date = new Date(d);
  if (!Number.isFinite(date.getTime())) return "–";
  return date.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`portal-card rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,27,49,0.96),rgba(8,18,34,0.94))] p-5 text-slate-100 shadow-[0_24px_64px_-34px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/[0.035] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

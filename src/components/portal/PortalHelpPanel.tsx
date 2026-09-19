"use client";

import { CheckCircle2, Lightbulb, Sparkles, X } from "lucide-react";
import type { PortalHelpTopic } from "@/lib/portal-help";

export function PortalHelpPanel({
  topic,
  open,
  onClose,
}: {
  topic: PortalHelpTopic;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Hilfe schließen"
        className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-help-title"
        className="absolute inset-y-0 right-0 w-full max-w-[460px] overflow-y-auto border-l border-white/10 bg-ink text-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-ink/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-champagne/15 text-champagne-soft">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-electric-soft">Info-Lampe</p>
              <h2 id="portal-help-title" className="text-[17px] font-extrabold">{topic.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl text-silver transition hover:bg-white/10 hover:text-white"
            aria-label="Hilfe schließen"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <section className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
            <div className="flex items-center gap-2 text-electric-soft">
              <Sparkles className="h-4 w-4" />
              <p className="text-[12px] font-bold uppercase tracking-[0.12em]">Wofür ist das?</p>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-silver">{topic.purpose}</p>
          </section>

          <section>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-platinum">Was können Sie hier machen?</p>
            <div className="mt-3 space-y-2.5">
              {topic.actions.map((action) => (
                <div key={action} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-electric-soft" />
                  <p className="text-[13px] leading-relaxed text-platinum">{action}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-champagne/20 bg-champagne/[0.06] p-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-champagne-soft">Praxis-Tipp</p>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-silver">
              {topic.tips.map((tip) => <li key={tip}>• {tip}</li>)}
            </ul>
          </section>

          <p className="text-[11.5px] leading-relaxed text-silver/80">
            Die Info-Lampe erklärt den Zweck und den vorgesehenen Ablauf. Berechtigungen und serverseitige Regeln bleiben davon unverändert.
          </p>
        </div>
      </aside>
    </div>
  );
}

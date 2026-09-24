import type { Metadata } from "next";
import { ContractActionForm } from "@/components/site/ContractActionForm";

export const metadata: Metadata = {
  title: "Verträge hier kündigen",
  robots: { index: true, follow: true },
};

export default function CancellationPage() {
  return <section className="min-h-[80vh] bg-ink pb-20 pt-32 text-white"><div className="container-x grid gap-10 lg:grid-cols-[.8fr_1fr]"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-electric-soft">Optimierung+</p><h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Verträge hier kündigen</h1><p className="mt-5 text-base leading-7 text-silver">Hier kannst du deine Kündigung direkt elektronisch erklären. Nach dem Absenden wird der Eingang mit Datum und Uhrzeit dokumentiert und du erhältst einen Beleg.</p><p className="mt-4 text-sm leading-6 text-slate-400">Für eine außerordentliche Kündigung kannst du den Grund im Formular angeben. Wenn kein anderer Beendigungszeitpunkt angegeben wird, wird die Erklärung als Kündigung zum frühestmöglichen Zeitpunkt erfasst.</p></div><ContractActionForm action="cancellation" /></div></section>;
}

import type { Metadata } from "next";
import { ContractActionForm } from "@/components/site/ContractActionForm";

export const metadata: Metadata = {
  title: "Vertrag widerrufen",
  robots: { index: true, follow: true },
};

export default function WithdrawalPage() {
  return <section className="min-h-[80vh] bg-ink pb-20 pt-32 text-white"><div className="container-x grid gap-10 lg:grid-cols-[.8fr_1fr]"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-electric-soft">Online-Widerruf</p><h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Vertrag widerrufen</h1><p className="mt-5 text-base leading-7 text-silver">Mit diesem Formular kannst du eine eindeutige Widerrufserklärung zu deinem online abgeschlossenen Optimierung+-Vertrag übermitteln. Eine Begründung ist nicht erforderlich.</p><p className="mt-4 text-sm leading-6 text-slate-400">Der Eingang wird mit Datum und Uhrzeit dokumentiert. Ob und in welchem Umfang ein gesetzliches Widerrufsrecht besteht, richtet sich nach den für deinen Vertrag geltenden Voraussetzungen.</p></div><ContractActionForm action="withdrawal" /></div></section>;
}

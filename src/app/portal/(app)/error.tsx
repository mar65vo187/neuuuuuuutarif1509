"use client";

import { ArrowRight } from "lucide-react";
import { Card } from "@/components/portal/ui";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-electric-deep">Portal</p>
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Daten gerade nicht erreichbar</h1>
      </header>
      <Card>
        <p className="text-[14.5px] text-steel">Dieser Bereich konnte gerade nicht geladen werden. Bitte versuchen Sie es erneut.</p>
      </Card>
      <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-white hover:bg-electric">
        Erneut laden <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

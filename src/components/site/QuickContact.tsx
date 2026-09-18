import Link from "next/link";
import { MessageCircle, Phone, Send } from "lucide-react";
import { SITE, whatsappLink } from "@/lib/content";

export function QuickContact() {
  return (
    <>
      <a href={whatsappLink("Hallo TarifWerk, ich hätte gern eine kurze Einschätzung.")} target="_blank" rel="noopener noreferrer" className="hero-enter fixed bottom-6 right-6 z-40 hidden items-center gap-3 rounded-full bg-[#25D366] py-3 pl-4 pr-5 text-[14.5px] font-semibold text-ink-900 shadow-[0_18px_40px_-12px_rgba(37,211,102,0.65)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] md:inline-flex [--hero-delay:900ms]" aria-label="Per WhatsApp schreiben"><span className="relative grid h-6 w-6 place-items-center"><span className="absolute inset-0 rounded-full bg-white/40 animate-pulse-dot" /><MessageCircle className="relative h-5 w-5" /></span>WhatsApp</a>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/90 backdrop-blur-lg md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}><div className="grid grid-cols-3 gap-1 p-2"><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-white active:bg-white/10"><MessageCircle className="h-5 w-5 text-[#25D366]" /> WhatsApp</a><Link href="/anfrage" className="flex flex-col items-center gap-1 rounded-xl bg-electric py-2 text-[11px] font-semibold text-white"><Send className="h-5 w-5" /> Beratung starten</Link><a href={SITE.phoneHref} className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-white active:bg-white/10"><Phone className="h-5 w-5 text-electric-soft" /> Anrufen</a></div></div>
    </>
  );
}

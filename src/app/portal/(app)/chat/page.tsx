import { redirect } from "next/navigation";
import { ChatPanel } from "@/components/portal/ChatPanel";
import { getCurrentUser, isPortalOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fchat");

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-electric-deep">Intern · Kommunikation</p>
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Nachrichten</h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-steel">
          Team-Nachrichten, Admin-Kanal und private Direktnachrichten an einzelne Berater. Direktnachrichten sind nur für Sender und Empfänger sichtbar; ausschließlich der konfigurierte Owner kann die globale Direktnachrichten-Übersicht öffnen.
        </p>
      </header>
      <ChatPanel isAdmin={user.role === "admin"} isOwner={isPortalOwner(user)} />
    </div>
  );
}

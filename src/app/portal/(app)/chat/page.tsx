import { redirect } from "next/navigation";
import { ChatPanel } from "@/components/portal/ChatPanel";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fchat");

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-electric-deep">Intern</p>
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Team-Chat</h1>
        <p className="text-[14px] text-steel">
          Im Team-Chat lesen und schreiben alle Mitarbeiter. Der Admin-Chat ist ausschließlich für Administratoren sichtbar.
        </p>
      </header>
      <ChatPanel isAdmin={user.role === "admin"} />
    </div>
  );
}

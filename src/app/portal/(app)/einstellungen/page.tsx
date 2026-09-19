import { PasswordSettings } from "@/components/portal/PasswordSettings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Einstellungen", robots: { index: false, follow: false } };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-electric-deep">Konto</p>
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Einstellungen</h1>
        <p className="text-[14px] text-steel">Persönliche Zugangsdaten des eigenen Portal-Kontos verwalten.</p>
      </header>
      <PasswordSettings />
    </div>
  );
}

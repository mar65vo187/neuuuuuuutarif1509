"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CHANNELS, LOCATION_OPTIONS, SERVICES, SITE, SITUATIONS, TIME_SLOTS, whatsappLink, normalizeTopic } from "@/lib/content";
import { withAudience, type AudienceMode } from "@/lib/audience";
import { readJourneyContext } from "@/components/site/JourneyContext";

type Props = {
  type?: "beratung" | "termin" | "tarifcheck" | "kontakt";
  advisorSlug?: string;
  referralCode?: string;
  advisorName?: string;
  defaultTopic?: string;
  defaultSituation?: string;
  defaultRegion?: string;
  source?: string;
  tone?: "light" | "dark";
  title?: string;
  audience?: AudienceMode;
};

export function LeadForm({ type = "termin", advisorSlug, referralCode, advisorName, defaultTopic = "", defaultSituation = "", defaultRegion = "", source, tone = "light", title, audience = "b2c" }: Props) {
  const router = useRouter();
  const business = audience === "b2b";
  const dark = tone === "dark";
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const sending = useRef(false);
  const [referralConsent, setReferralConsent] = useState(false);
  const [form, setForm] = useState({
    topic: normalizeTopic(defaultTopic),
    situation: SITUATIONS.some((item) => item.value === defaultSituation) ? defaultSituation : "",
    region: defaultRegion.slice(0, 80),
    companyName: "",
    companySize: "",
    name: "",
    email: "",
    phone: "",
    preferredChannel: "whatsapp",
    preferredTime: "",
    message: "",
    consent: false,
    website: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const field = dark ? "field-dark" : "field";
  const label = dark ? "mb-1.5 block text-[13px] font-semibold text-platinum" : "label";
  const muted = dark ? "text-silver" : "text-steel";
  const chip = (on: boolean) =>
    `chip h-10 px-4 text-[13.5px] transition-all ${
      on
        ? "border-electric bg-electric text-white"
        : dark
          ? "border-white/12 text-silver hover:border-white/30 hover:text-white"
          : "border-line bg-white text-ink-700 hover:border-electric/50"
    }`;

  const canNext = step === 0 ? Boolean(form.topic && form.situation) : true;

  const goNext = () => {
    setError(null);
    setErrorField(null);
    if (!form.topic) {
      setError(business ? "Bitte wählen Sie zuerst ein Thema." : "Bitte wähle zuerst ein Thema.");
      setErrorField("topic");
      return;
    }
    if (!form.situation) {
      setError(business ? "Bitte wählen Sie Ihre aktuelle Situation." : "Bitte wähle deine aktuelle Situation.");
      setErrorField("situation");
      return;
    }
    setStep(1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending.current) return;
    setError(null);
    setErrorField(null);
    if (step === 0) {
      goNext();
      return;
    }
    if (!form.topic || !form.situation) {
      setStep(0);
      setError(business ? "Bitte wählen Sie Ihr Thema und Ihre Situation." : "Bitte wähle dein Thema und deine Situation.");
      setErrorField("topic");
      return;
    }
    if (business && !form.companyName.trim()) {
      setError("Bitte geben Sie Ihr Unternehmen oder Ihre Selbstständigkeit an.");
      setErrorField("companyName");
      return;
    }
    if (!form.name.trim()) {
      setError(business ? "Bitte geben Sie Ihren Namen an." : "Bitte gib deinen Namen an.");
      setErrorField("name");
      return;
    }
    if (!form.email.trim()) {
      setError(business ? "Bitte geben Sie Ihre E-Mail-Adresse an." : "Bitte gib deine E-Mail-Adresse an.");
      setErrorField("email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError(business ? "Bitte geben Sie eine gültige E-Mail-Adresse an." : "Bitte gib eine gültige E-Mail-Adresse an.");
      setErrorField("email");
      return;
    }
    if (!form.consent) {
      setError(business ? "Bitte stimmen Sie der Datenverarbeitung zu." : "Bitte stimme der Datenverarbeitung zu.");
      setErrorField("consent");
      return;
    }
    if (["telefon", "whatsapp"].includes(form.preferredChannel) && !form.phone.trim()) {
      setError(business ? "Bitte geben Sie für Telefon oder WhatsApp eine Telefonnummer an oder wählen Sie E-Mail." : "Bitte gib für Telefon oder WhatsApp eine Telefonnummer an oder wähle E-Mail.");
      setErrorField("phone");
      return;
    }
    sending.current = true;
    setLoading(true);
    try {
      const journey = readJourneyContext();
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          type,
          advisorSlug,
          ...(referralCode && referralConsent ? { referralCode, referralConsent: true } : {}),
          source: source ?? (advisorSlug ? `berater:${advisorSlug}` : business ? "anfrage:b2b" : "anfrage"),
          meta: {
            audience,
            ...(business ? { companyName: form.companyName.trim(), companySize: form.companySize } : {}),
            ...journey,
          },
        }),
        signal: AbortSignal.timeout(20000),
      });
      const json = (await res.json()) as { ok: boolean; id?: number; error?: string; field?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? (business ? "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut." : "Etwas ist schiefgelaufen. Bitte versuche es erneut."));
        setErrorField(json.field ?? null);
        return;
      }
      const leadId = json.id ?? 0;
      setDone(leadId);
      const params = new URLSearchParams({ audience, type });
      if (leadId > 0) params.set("ref", String(leadId));
      router.push(`/anfrage/danke?${params.toString()}`);
      return;
    } catch {
      setError(business ? "Verbindung fehlgeschlagen. Bitte versuchen Sie es erneut oder kontaktieren Sie uns telefonisch." : "Verbindung fehlgeschlagen. Bitte versuche es erneut oder ruf uns direkt an.");
    } finally {
      sending.current = false;
      setLoading(false);
    }
  };

  if (done !== null) {
    return (
      <div className="hero-enter text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-electric text-white shadow-glow">
          <Check className="h-7 w-7" />
        </span>
        <h2 className={`mt-6 text-[26px] font-extrabold ${dark ? "text-white" : "text-ink"}`}>{business ? "Vielen Dank." : `Danke, ${form.name.split(" ")[0]}.`}</h2>
        <p className={`mx-auto mt-3 max-w-md text-[15.5px] leading-relaxed ${muted}`}>
          {business
            ? <>Ihre Anfrage ist angekommen{advisorName ? ` und liegt bei ${advisorName.split(" ")[0]}` : ""}. Sie erhalten eine persönliche Rückmeldung – in der Regel innerhalb eines Tages. Terminwünsche bestätigen wir ausdrücklich.</>
            : <>Deine Anfrage ist angekommen{advisorName ? ` und liegt bei ${advisorName.split(" ")[0]}` : ""}. Du bekommst eine persönliche Rückmeldung – in der Regel innerhalb eines Tages. Terminwünsche bestätigen wir dir ausdrücklich.</>}
        </p>
        {done > 0 && <p className={`mt-2 text-[12.5px] ${muted}`}>Vorgangsnummer #{done}</p>}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button href={whatsappLink(`Hallo TarifWerk, ich habe gerade Anfrage #${done} gestellt.`)} target="_blank" variant="whatsapp" icon={<MessageCircle />}>
            Direkt per WhatsApp
          </Button>
          <Button href={withAudience("/", audience)} variant={dark ? "secondary" : "dark"} magnetic={false}>
            Zur Startseite
          </Button>
        </div>
      </div>
    );
  }

  const steps = business ? ["Ihr Thema", "Ihr Kontakt"] : ["Dein Thema", "Dein Kontakt"];

  return (
    <form onSubmit={submit} noValidate aria-describedby={error ? "lead-form-error" : undefined}>
      {title && <h2 className={`text-[22px] font-extrabold ${dark ? "text-white" : "text-ink"}`}>{title}</h2>}

      {/* Fortschritt */}
      <ol className={`${title ? "mt-5" : ""} flex items-center gap-3 text-[12.5px] font-semibold`}>
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3" aria-current={i === step ? "step" : undefined}>
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                i <= step ? "bg-electric text-white" : dark ? "bg-white/10 text-silver" : "bg-paper-2 text-steel"
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={i <= step ? (dark ? "text-white" : "text-ink") : muted}>{s}</span>
            {i < steps.length - 1 && <span className={`h-px w-8 ${dark ? "bg-white/15" : "bg-line"}`} />}
          </li>
        ))}
      </ol>

      <div className="relative mt-7 min-h-[320px]">
        {step === 0 ? (
            <div key="s0" className="hero-enter">
              <fieldset>
                <legend className={label}>Worum geht es?</legend>
              <div className="flex flex-wrap gap-2">
                {SERVICES.map((s) => (
                  <button key={s.key} type="button" onClick={() => set("topic", s.name)} aria-pressed={form.topic === s.name} className={chip(form.topic === s.name)}>
                    {s.name}
                  </button>
                ))}
              </div>
              </fieldset>

              <fieldset className="mt-7">
                <legend className={label}>{business ? "Wo stehen Sie gerade?" : "Wo stehst du gerade?"}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {SITUATIONS.map((s) => {
                  const on = form.situation === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set("situation", s.value)}
                      aria-pressed={on}
                      className={`rounded-xl border px-4 py-3 text-left text-[14px] font-medium transition-all ${
                        on
                          ? "border-electric bg-electric/10 text-ink ring-2 ring-electric/30 " + (dark ? "!text-white" : "")
                          : dark
                            ? "border-white/12 text-silver hover:border-white/30"
                            : "border-line bg-white text-ink-700 hover:border-electric/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              </fieldset>

              <label htmlFor="lf-region" className={`${label} mt-7`}>{business ? "Unternehmensstandort / Region (optional)" : "Region (optional)"}</label>
              <input id="lf-region" type="search" value={form.region} onChange={(e) => set("region", e.target.value)} list="anfrage-standorte" className={`${field} appearance-none`} aria-label={business ? "Unternehmensstandort oder Region wählen" : "Region wählen"} placeholder={business ? "Standort oder Region suchen" : "Stadt oder Region suchen"} autoComplete="address-level2" maxLength={80} />
              <datalist id="anfrage-standorte">
                {LOCATION_OPTIONS.map((r) => <option key={r} value={r} />)}
              </datalist>
            </div>
          ) : (
            <div key="s1" className="hero-enter">
              <div className={`mb-5 rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/[0.04]" : "border-line bg-paper"}`}>
                <p className={`text-[10.5px] font-extrabold uppercase tracking-[0.14em] ${muted}`}>{business ? "Ihre Auswahl" : "Deine Auswahl"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={chip(true)}>{form.topic}</span>
                  <span className={`chip h-9 px-3 text-[12px] ${dark ? "border-white/12 text-silver" : "border-line bg-white text-ink-700"}`}>{SITUATIONS.find((item) => item.value === form.situation)?.label ?? form.situation}</span>
                  {form.region && <span className={`chip h-9 px-3 text-[12px] ${dark ? "border-white/12 text-silver" : "border-line bg-white text-ink-700"}`}>{form.region}</span>}
                </div>
                <button type="button" onClick={() => setStep(0)} className={`mt-3 text-[11.5px] font-bold underline underline-offset-2 ${dark ? "text-electric-soft" : "text-electric-deep"}`}>Auswahl ändern</button>
              </div>

              {business && (
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="lf-company" className={label}>Unternehmen / Selbstständigkeit *</label>
                    <input id="lf-company" name="companyName" className={field} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} autoComplete="organization" required aria-invalid={errorField === "companyName"} placeholder="Unternehmensname oder Selbstständigkeit" maxLength={180} />
                  </div>
                  <div>
                    <label htmlFor="lf-company-size" className={label}>Unternehmensgröße (optional)</label>
                    <select id="lf-company-size" name="companySize" value={form.companySize} onChange={(e) => set("companySize", e.target.value)} className={`${field} appearance-none`}>
                      <option value="">Bitte wählen</option>
                      <option value="solo">Selbstständig / 1 Person</option>
                      <option value="2-10">2–10 Mitarbeitende</option>
                      <option value="11-50">11–50 Mitarbeitende</option>
                      <option value="51-250">51–250 Mitarbeitende</option>
                      <option value="250+">Mehr als 250 Mitarbeitende</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lf-name" className={label}>Name *</label>
                  <input id="lf-name" name="name" className={field} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required aria-invalid={errorField === "name"} placeholder="Vor- und Nachname" maxLength={120} />
                </div>
                <div>
                  <label htmlFor="lf-email" className={label}>E-Mail *</label>
                  <input id="lf-email" name="email" type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required aria-invalid={errorField === "email"} placeholder={business ? "name@unternehmen.de" : "name@beispiel.de"} maxLength={200} />
                </div>
                <div>
                  <label htmlFor="lf-phone" className={label}>Telefon (für Rückruf / WhatsApp)</label>
                  <input id="lf-phone" name="phone" type="tel" className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" aria-invalid={errorField === "phone"} placeholder="+49 …" maxLength={40} />
                </div>
                <div>
                  <label htmlFor="lf-time" className={label}>{business ? "Wann passt es Ihnen?" : "Wann passt es dir?"}</label>
                  <select id="lf-time" value={form.preferredTime} onChange={(e) => set("preferredTime", e.target.value)} className={`${field} appearance-none`}>
                    <option value="" className="text-ink">{business ? "Bitte wählen" : "Bitte wählen"}</option>
                    {TIME_SLOTS.map((t) => (
                      <option key={t.value} value={t.label} className="text-ink">{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset className="mt-5">
                <legend className={label}>{business ? "Wie möchten Sie sprechen?" : "Wie möchtest du sprechen?"}</legend>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button key={c.value} type="button" onClick={() => set("preferredChannel", c.value)} aria-pressed={form.preferredChannel === c.value} className={chip(form.preferredChannel === c.value)}>
                    {c.label}
                  </button>
                ))}
              </div>
              </fieldset>

              {referralCode && (
                <label className={`mt-5 flex items-start gap-3 text-[13.5px] leading-snug ${muted}`}>
                  <input type="checkbox" checked={referralConsent} onChange={(e) => setReferralConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ink/20 accent-electric" />
                  <span>Optional: Meine Anfrage dieser Empfehlung zuordnen. Die empfehlende Person sieht nur zusammengefasste Zahlen zum Bearbeitungsstand, keine Kontaktdaten oder Vertragsdetails.</span>
                </label>
              )}

              <div className="mt-5">
                <label htmlFor="lf-msg" className={label}>{business ? "Was sollten wir vorab wissen? (optional)" : "Was sollten wir vorab über deine Situation wissen? (optional)"}</label>
                <textarea id="lf-msg" rows={3} className={field} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder={business ? "Kurze Eckdaten zu Ihrem Bedarf." : "Kurze Angaben zu deiner Situation – das reicht völlig."} maxLength={2000} />
              </div>

              {/* Honeypot */}
              <div className="hidden" aria-hidden>
                <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} /></label>
              </div>

              <label className={`mt-5 flex items-start gap-3 text-[13.5px] leading-snug ${muted}`}>
                <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={errorField === "consent"} className="mt-0.5 h-4 w-4 rounded border-ink/20 accent-electric" />
                <span>
                  Ich bin einverstanden, dass TarifWerk meine Angaben zur Bearbeitung meiner Anfrage verarbeitet.{" "}
                  <Link href={withAudience("/datenschutz", audience)} className="underline underline-offset-2 hover:text-electric">Datenschutz</Link>
                </span>
              </label>
            </div>
          )}
      </div>

      {error && (
        <p id="lead-form-error" role="alert" className="hero-enter mt-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-[14px] text-red-500">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`inline-flex items-center gap-2 text-[12.5px] ${muted}`}>
          <ShieldCheck className="h-4 w-4 text-electric" /> Kostenlos · unverbindlich · kein Datenverkauf
        </p>
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant={dark ? "secondary" : "dark"} magnetic={false} onClick={() => setStep(0)} icon={<ArrowLeft />} disabled={loading}>
              Zurück
            </Button>
          )}
          {step === 0 ? (
            <Button type="button" onClick={goNext} iconRight={<ArrowRight />}>
              {business ? "Weiter" : "Weiter"}
            </Button>
          ) : (
            <Button type="submit" disabled={loading} iconRight={loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}>
              {loading ? "Wird gesendet…" : type === "termin" ? "Termin anfragen" : business ? "Business-Anfrage senden" : "Anfrage senden"}
            </Button>
          )}
        </div>
      </div>
      <p className={`mt-4 text-[12.5px] ${muted}`}>
        Lieber direkt sprechen? <a className="font-semibold underline underline-offset-2" href={SITE.phoneHref}>Anrufen</a> oder über WhatsApp schreiben – täglich 08–22 Uhr.
      </p>
    </form>
  );
}

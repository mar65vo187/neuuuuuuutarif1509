"use client";

import { Check, Copy, ExternalLink, Megaphone, Search, Smartphone, Video } from "lucide-react";
import { useMemo, useState } from "react";

type Campaign = {
  slug: string;
  audience: "b2c" | "b2b";
  eyebrow: string;
  title: string;
  emphasis: string;
  text: string;
  cta: string;
  reassurance: string;
  seoTitle: string;
  seoDescription: string;
};

const CHANNELS = [
  { key: "google", label: "Google Search", medium: "cpc", Icon: Search },
  { key: "meta", label: "Meta Ads", medium: "paid_social", Icon: Smartphone },
  { key: "instagram", label: "Instagram", medium: "paid_social", Icon: Smartphone },
  { key: "tiktok", label: "TikTok", medium: "paid_social", Icon: Video },
  { key: "youtube", label: "YouTube", medium: "video", Icon: Video },
] as const;

function campaignUrl(origin: string, campaign: Campaign, source: string, medium: string) {
  const url = new URL("/kampagne/" + campaign.slug, origin);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", "tarifwerk_" + campaign.slug);
  url.searchParams.set("utm_content", campaign.audience + "_landing");
  return url.href;
}

export function CampaignCockpit({ campaigns }: { campaigns: Campaign[] }) {
  const [copied, setCopied] = useState("");
  const origin = typeof window === "undefined" ? "https://www.tarifwerk.eu" : window.location.origin;

  const rows = useMemo(() => campaigns.map((campaign) => ({
    campaign,
    headline: (campaign.title + " " + campaign.emphasis).replace(/\s+/g, " ").trim(),
    description: campaign.seoDescription,
  })), [campaigns]);

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => current === key ? "" : current), 1800);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-electric/20 bg-[radial-gradient(circle_at_top_right,rgba(79,141,255,.18),transparent_38%),linear-gradient(145deg,rgba(13,28,52,.96),rgba(7,17,32,.96))] p-5 text-white sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric/12 text-electric-soft"><Megaphone className="h-5 w-5" /></span>
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-electric-soft">Kampagnen-Cockpit</p>
            <h2 className="mt-1 text-[20px] font-extrabold">Paid-Traffic sauber bis zum CRM-Abschluss messen.</h2>
            <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-silver">Jeder Link enthält standardisierte UTM-Parameter. Die Landingpages bleiben bewusst noindex, während Quelle und Kampagne bei einer echten Anfrage first-party ins CRM übernommen werden.</p>
          </div>
        </div>
      </div>

      {rows.map(({ campaign, headline, description }) => (
        <section key={campaign.slug} className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-electric/15 bg-electric/[0.06] px-2.5 py-1 text-[10.5px] font-extrabold text-electric-deep">{campaign.audience === "b2b" ? "Business" : "Privat"}</span>
                <span className="text-[10.5px] font-bold text-steel">/kampagne/{campaign.slug}</span>
              </div>
              <h3 className="mt-3 text-[18px] font-extrabold">{headline}</h3>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-steel">{campaign.text}</p>
            </div>
            <a href={"/kampagne/" + campaign.slug} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[11.5px] font-bold hover:border-electric/30 hover:text-electric-deep">Landingpage öffnen <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-line bg-paper/60 p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Kanal-Links</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {CHANNELS.map(({ key, label, medium, Icon }) => {
                  const url = campaignUrl(origin, campaign, key, medium);
                  const copyKey = campaign.slug + ":" + key;
                  return (
                    <button key={key} type="button" onClick={() => void copy(copyKey, url)} className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:border-electric/30">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-electric/[0.07] text-electric-deep"><Icon className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-[11.5px] font-extrabold">{label}</span><span className="block truncate text-[9.5px] text-steel">utm_source={key}</span></span>
                      {copied === copyKey ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <Copy className="h-4 w-4 shrink-0 text-steel" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-paper/60 p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Anzeigen-Grundlage</p>
              <div className="mt-3 space-y-3">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-steel">Headline</p><p className="mt-1 text-[12.5px] font-extrabold">{headline}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-steel">Beschreibung</p><p className="mt-1 text-[11.5px] leading-relaxed text-steel">{description}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-steel">CTA</p><p className="mt-1 text-[11.5px] font-bold">{campaign.cta}</p></div>
                <button type="button" onClick={() => void copy(campaign.slug + ":copy", headline + "\n\n" + description + "\n\nCTA: " + campaign.cta + "\n" + campaign.reassurance)} className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-3.5 text-[11px] font-bold text-white hover:bg-electric">
                  {copied === campaign.slug + ":copy" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Anzeigen-Text kopieren
                </button>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

"use client";

import { useEffect } from "react";

const STORAGE_KEY = "tarifwerk-journey-v1";
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

type JourneyState = {
  landingPath: string;
  lastPath: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
};

function safePath() {
  return (window.location.pathname + window.location.search).slice(0, 500);
}

function externalReferrerHost() {
  if (!document.referrer) return "";
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return "";
    return referrer.hostname.slice(0, 160);
  } catch {
    return "";
  }
}

export function JourneyContext() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const previous = stored ? JSON.parse(stored) as Partial<JourneyState> : {};
      const currentPath = safePath();
      const next: JourneyState = {
        landingPath: typeof previous.landingPath === "string" && previous.landingPath ? previous.landingPath.slice(0, 500) : currentPath,
        lastPath: currentPath,
        referrerHost: typeof previous.referrerHost === "string" && previous.referrerHost ? previous.referrerHost.slice(0, 160) : externalReferrerHost(),
        utmSource: typeof previous.utmSource === "string" && previous.utmSource ? previous.utmSource.slice(0, 120) : (params.get(CAMPAIGN_KEYS[0]) ?? "").slice(0, 120),
        utmMedium: typeof previous.utmMedium === "string" && previous.utmMedium ? previous.utmMedium.slice(0, 120) : (params.get(CAMPAIGN_KEYS[1]) ?? "").slice(0, 120),
        utmCampaign: typeof previous.utmCampaign === "string" && previous.utmCampaign ? previous.utmCampaign.slice(0, 160) : (params.get(CAMPAIGN_KEYS[2]) ?? "").slice(0, 160),
        utmContent: typeof previous.utmContent === "string" && previous.utmContent ? previous.utmContent.slice(0, 160) : (params.get(CAMPAIGN_KEYS[3]) ?? "").slice(0, 160),
        utmTerm: typeof previous.utmTerm === "string" && previous.utmTerm ? previous.utmTerm.slice(0, 160) : (params.get(CAMPAIGN_KEYS[4]) ?? "").slice(0, 160),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Journey context is optional and must never block the site.
    }
  }, []);

  return null;
}

export function readJourneyContext() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<JourneyState> : {};
    return {
      landingPath: typeof parsed.landingPath === "string" ? parsed.landingPath.slice(0, 500) : "",
      requestPath: safePath(),
      referrerHost: typeof parsed.referrerHost === "string" ? parsed.referrerHost.slice(0, 160) : "",
      utmSource: typeof parsed.utmSource === "string" ? parsed.utmSource.slice(0, 120) : "",
      utmMedium: typeof parsed.utmMedium === "string" ? parsed.utmMedium.slice(0, 120) : "",
      utmCampaign: typeof parsed.utmCampaign === "string" ? parsed.utmCampaign.slice(0, 160) : "",
      utmContent: typeof parsed.utmContent === "string" ? parsed.utmContent.slice(0, 160) : "",
      utmTerm: typeof parsed.utmTerm === "string" ? parsed.utmTerm.slice(0, 160) : "",
    };
  } catch {
    return {
      landingPath: "",
      requestPath: "",
      referrerHost: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmContent: "",
      utmTerm: "",
    };
  }
}

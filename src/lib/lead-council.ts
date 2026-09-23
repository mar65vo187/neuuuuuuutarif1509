type JsonRecord = Record<string, unknown>;

export type LeadCouncilInput = {
  leadId: number;
  source: string | null;
  topic: string | null;
  region: string | null;
  situation: string | null;
  message: string | null;
  preferredChannel: string | null;
  tags: string[];
  meta: JsonRecord;
  products: Array<{ name: string; category: string; provider: string; relation: string }>;
  calls: Array<{ reachedPerson: string; reaction: string }>;
};

export type LeadCouncilResult = {
  status: "QUALIFIED" | "REVIEW_REQUIRED" | "DISQUALIFIED";
  score: number;
  decisionMaker: { confirmed: boolean; evidence: string[] };
  need: { confirmed: boolean; area: string; evidence: string[] };
  contactBasis: { confirmed: boolean; evidence: string[] };
  summary: string;
  reasons: string[];
  missingQuestions: string[];
  recommendedApproach: string;
  objections: Array<{ objection: string; response: string }>;
  models: { qualifier: string; challenger: string; revision: string };
};

const XKIRO_URL = "https://api.xkiro.com/v1/chat/completions";
const QUALIFIER_MODEL = process.env.TARIFWERK_LEAD_AI_QUALIFIER_MODEL || "qwen/qwen3.8-omni-flash:free";
const CHALLENGER_MODEL = process.env.TARIFWERK_LEAD_AI_CHALLENGER_MODEL || "mistralai/mistral-large-2512";
const REVISION_MODEL = process.env.TARIFWERK_LEAD_AI_REVISION_MODEL || QUALIFIER_MODEL;

const DECISION_ROLES = [
  "geschäftsführer", "geschaeftsfuehrer", "inhaber", "owner", "ceo", "geschäftsleitung",
  "geschaeftsleitung", "prokurist", "vorstand", "leiter", "leitung", "head of",
  "bereichsleiter", "einkaufsleiter", "it-leiter", "facility manager", "entscheidung",
];
const GATEKEEPER_ROLES = [
  "sekretariat", "sekretär", "sekretaer", "empfang", "rezeption", "assistenz",
  "assistant", "office manager", "telefonzentrale", "gatekeeper",
];
const PRODUCT_WORDS: Array<[string, string[]]> = [
  ["Internet / Glasfaser", ["internet", "glasfaser", "dsl", "kabel", "breitband", "telefonie"]],
  ["Mobilfunk / TV", ["mobilfunk", "sim", "handy", "tv", "fernsehen"]],
  ["Strom / Gas", ["strom", "gas", "energie", "tarif", "kwh"]],
  ["Solar / Photovoltaik", ["solar", "photovoltaik", "pv", "speicher", "dach"]],
  ["Wärmepumpe", ["wärmepumpe", "waermepumpe", "heizung", "wärme", "waerme"]],
  ["Versicherungen", ["versicherung", "absicherung", "police"]],
  ["Immobilien", ["immobilie", "haus", "wohnung", "verkauf", "kauf"]],
  ["Edelmetalle", ["edelmetall", "gold", "silber"]],
  ["Klima / Sicherheit", ["klima", "klimaanlage", "sicherheit", "alarm", "kamera"]],
];

function cleanText(value: unknown, max = 1800) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[E-Mail entfernt]")
    .replace(/(?:\+?\d[\d\s()\/-]{6,}\d)/g, "[Telefon entfernt]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function roleText(input: LeadCouncilInput) {
  const candidates = [
    input.meta.job, input.meta.role, input.meta.contactRole, input.meta.decisionRole,
    input.meta.position, input.meta.function, input.meta.title,
  ].map((value) => cleanText(value, 180)).filter(Boolean);
  return candidates.join(" · ").toLocaleLowerCase("de-DE");
}

function hardDecisionMaker(input: LeadCouncilInput) {
  const explicit = input.meta.decisionMaker === true || input.meta.isDecisionMaker === true || input.meta.contractHolder === true;
  const role = roleText(input);
  const gatekeeper = GATEKEEPER_ROLES.some((word) => role.includes(word));
  const roleMatch = DECISION_ROLES.some((word) => role.includes(word));
  if (gatekeeper) return { confirmed: false, evidence: ["Rolle weist auf Sekretariat/Empfang/Assistenz hin."] };
  if (explicit) return { confirmed: true, evidence: ["Entscheiderstatus wurde im CRM ausdrücklich bestätigt."] };
  if (roleMatch) return { confirmed: true, evidence: [`Entscheidungsnahe Rolle im CRM: ${role.slice(0, 180)}`] };
  return { confirmed: false, evidence: [] };
}

function hardNeed(input: LeadCouncilInput) {
  const evidence: string[] = [];
  const haystack = [
    cleanText(input.topic, 500),
    cleanText(input.situation, 300),
    cleanText(input.message, 1200),
    ...input.products.map((p) => `${p.category} ${p.name} ${p.relation}`),
  ].join(" ").toLocaleLowerCase("de-DE");
  const match = PRODUCT_WORDS.find(([, words]) => words.some((word) => haystack.includes(word)));
  if (input.products.some((p) => ["interest", "sold", "existing"].includes(p.relation))) {
    evidence.push("Produktbezug ist im CRM dokumentiert.");
  }
  if (cleanText(input.topic, 500).length >= 3) evidence.push(`Thema: ${cleanText(input.topic, 160)}`);
  if (match) evidence.push(`Bedarfsbereich aus konkreten Angaben: ${match[0]}`);
  return {
    confirmed: Boolean(match && (cleanText(input.topic, 500) || input.products.length || cleanText(input.message, 1200))),
    area: match?.[0] ?? "Noch offen",
    evidence,
  };
}

function hardContactBasis(input: LeadCouncilInput) {
  const consent = input.meta.consentGranted === true || input.meta.contactConsent === true || input.meta.leadConsent === true;
  const legalBasis = cleanText(input.meta.contactLegalBasis, 120);
  const proof = cleanText(input.meta.consentRecordedAt, 120);
  if (consent) {
    return {
      confirmed: true,
      evidence: [proof ? `Einwilligung dokumentiert (${proof}).` : "Einwilligung im CRM dokumentiert."],
    };
  }
  if (legalBasis) return { confirmed: true, evidence: [`Dokumentierte Kontaktgrundlage: ${legalBasis}`] };
  return { confirmed: false, evidence: [] };
}

function minimizedContext(input: LeadCouncilInput) {
  const safeMetaKeys = [
    "audience", "job", "role", "contactRole", "decisionRole", "position", "function",
    "companyName", "companySize", "landingPath", "requestPath", "referrerHost",
    "utmSource", "utmMedium", "utmCampaign", "decisionMaker", "isDecisionMaker",
    "contractHolder", "consentGranted", "contactConsent", "leadConsent", "contactLegalBasis",
  ];
  const meta = Object.fromEntries(safeMetaKeys
    .filter((key) => Object.prototype.hasOwnProperty.call(input.meta, key))
    .map((key) => [key, typeof input.meta[key] === "string" ? cleanText(input.meta[key], 300) : input.meta[key]]));
  return {
    source: cleanText(input.source, 120),
    topic: cleanText(input.topic, 500),
    region: cleanText(input.region, 100),
    situation: cleanText(input.situation, 250),
    message: cleanText(input.message, 1200),
    preferredChannel: cleanText(input.preferredChannel, 80),
    tags: input.tags.slice(0, 12).map((x) => cleanText(x, 60)),
    meta,
    products: input.products.slice(0, 20),
    calls: input.calls.slice(0, 8),
  };
}

async function callJson(model: string, system: string, user: unknown) {
  const key = process.env.XKIRO_API_KEY?.trim();
  if (!key) throw new Error("XKIRO_API_KEY ist serverseitig noch nicht gesetzt.");
  const response = await fetch(XKIRO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`xKiro ${model} antwortet mit ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const raw = payload.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) throw new Error(`xKiro ${model} lieferte keine Antwort.`);
  const cleaned = text.replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`$/i, "").trim();
  try { return JSON.parse(cleaned) as JsonRecord; }
  catch { throw new Error(`xKiro ${model} lieferte kein gültiges JSON.`); }
}

const QUALIFIER_SYSTEM = `
Du bist Agent Q: Lead-Qualifier für TarifWerk. Arbeite ausschließlich mit den übergebenen, minimierten Daten.
Ziel ist NICHT möglichst viele Leads freizugeben, sondern nur belastbar qualifizierte Leads.
Sekretariat, Empfang und Assistenz sind keine Entscheider. Vermute keine Rolle, kein Einkommen, Alter, Geschlecht,
Gesundheit, Herkunft oder andere sensible Merkmale. Öffentlich auffindbar bedeutet nicht automatisch nutzbar.
Erfinde keine Fakten. Antworte als JSON mit:
{"decisionMakerAssessment":"...","needAssessment":"...","fitScore":0-100,"needArea":"...",
"reasons":["..."],"missingQuestions":["..."],"recommendedApproach":"...",
"objections":[{"objection":"...","response":"..."}]}
Nutze nur nachweisbare Signale. Bei Unsicherheit niedriger bewerten.
`.trim();

const CHALLENGER_SYSTEM = `
Du bist Agent M: unabhängiger Challenger und Compliance-Kritiker. Deine Aufgabe ist, die Qualifizierung von Agent Q
anzugreifen. Suche unbewiesene Annahmen, Scheinkorrelationen, fehlenden Entscheiderstatus, fehlenden konkreten Bedarf,
fehlende Kontaktgrundlage und übertriebene Verkaufsargumente. Keine sensiblen/proxybasierten Inferenzen.
Antworte als JSON:
{"accept":true|false,"risk":"low|medium|high","criticisms":["..."],"scoreAdjustment":-40..0,
"requiredQuestions":["..."],"safeApproach":"..."}
Akzeptiere nur, was durch den Datensatz belegt ist.
`.trim();

const REVISION_SYSTEM = `
Du bist wieder Agent Q. Du erhältst Datensatz, deine erste Analyse und die Kritik von Agent M.
Korrigiere dich konservativ. Du darfst keine fehlenden Beweise erfinden und keine Compliance-Lücke überstimmen.
Antworte als JSON:
{"fitScore":0-100,"needArea":"...","reasons":["..."],"missingQuestions":["..."],
"recommendedApproach":"...","objections":[{"objection":"...","response":"..."}]}
`.trim();

function strings(value: unknown, max = 8) {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string").map((x) => cleanText(x, 300)).filter(Boolean).slice(0, max) : [];
}

function objections(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const row = x as JsonRecord;
    const objection = cleanText(row.objection, 220);
    const response = cleanText(row.response, 500);
    return objection && response ? [{ objection, response }] : [];
  }).slice(0, 3);
}

export function leadCouncilProviderStatus() {
  return {
    configured: Boolean(process.env.XKIRO_API_KEY?.trim()),
    qualifier: QUALIFIER_MODEL,
    challenger: CHALLENGER_MODEL,
    revision: REVISION_MODEL,
  };
}

export async function runLeadCouncil(input: LeadCouncilInput): Promise<LeadCouncilResult> {
  const decisionMaker = hardDecisionMaker(input);
  const need = hardNeed(input);
  const contactBasis = hardContactBasis(input);
  const context = minimizedContext(input);

  const first = await callJson(QUALIFIER_MODEL, QUALIFIER_SYSTEM, {
    hardEvidence: { decisionMaker, need, contactBasis },
    lead: context,
  });
  const challenge = await callJson(CHALLENGER_MODEL, CHALLENGER_SYSTEM, {
    hardEvidence: { decisionMaker, need, contactBasis },
    lead: context,
    qualifier: first,
  });
  const revised = await callJson(REVISION_MODEL, REVISION_SYSTEM, {
    hardEvidence: { decisionMaker, need, contactBasis },
    lead: context,
    qualifier: first,
    challenger: challenge,
  });

  const qScore = Number(revised.fitScore ?? first.fitScore ?? 0);
  const adjustment = Number(challenge.scoreAdjustment ?? 0);
  const score = Math.max(0, Math.min(100, Math.round((Number.isFinite(qScore) ? qScore : 0) + (Number.isFinite(adjustment) ? Math.min(0, adjustment) : 0))));
  const challengerAccepts = challenge.accept === true;
  const hardQualified = decisionMaker.confirmed && need.confirmed && contactBasis.confirmed;

  let status: LeadCouncilResult["status"] = "REVIEW_REQUIRED";
  if (hardQualified && challengerAccepts && score >= 70) status = "QUALIFIED";
  if (
    (!decisionMaker.confirmed && roleText(input) && GATEKEEPER_ROLES.some((word) => roleText(input).includes(word))) ||
    input.calls.some((call) => call.reaction === "do_not_contact" || call.reachedPerson === "wrong_number")
  ) status = "DISQUALIFIED";

  const missing = new Set<string>([
    ...strings(first.missingQuestions, 6),
    ...strings(challenge.requiredQuestions, 6),
    ...strings(revised.missingQuestions, 6),
  ]);
  if (!decisionMaker.confirmed) missing.add("Sind Sie selbst entscheidungsbefugt bzw. Vertragsinhaber/in für dieses Thema?");
  if (!need.confirmed) missing.add("Welches konkrete Problem oder welcher Wechselbedarf besteht aktuell?");
  if (!contactBasis.confirmed) missing.add("Welche dokumentierte Einwilligung oder sonstige zulässige Kontaktgrundlage liegt vor?");

  const reasons = [
    ...decisionMaker.evidence,
    ...need.evidence,
    ...contactBasis.evidence,
    ...strings(revised.reasons, 6),
    ...strings(challenge.criticisms, 4).map((x) => `Kritik: ${x}`),
  ].slice(0, 12);

  return {
    status,
    score,
    decisionMaker,
    need: { ...need, area: cleanText(revised.needArea, 120) || need.area },
    contactBasis,
    summary: status === "QUALIFIED"
      ? "Entscheider, konkreter Bedarf und Kontaktgrundlage sind belegt; beide Modelle haben die Qualifizierung geprüft."
      : status === "DISQUALIFIED"
        ? "Der Lead erfüllt eine harte Ausschlussbedingung und wird nicht als qualifizierter Lead freigegeben."
        : "Mindestens ein harter Nachweis fehlt oder der Challenger hat die Freigabe nicht bestätigt.",
    reasons,
    missingQuestions: [...missing].slice(0, 8),
    recommendedApproach: cleanText(revised.recommendedApproach, 900) || cleanText(challenge.safeApproach, 900),
    objections: objections(revised.objections ?? first.objections),
    models: { qualifier: QUALIFIER_MODEL, challenger: CHALLENGER_MODEL, revision: REVISION_MODEL },
  };
}

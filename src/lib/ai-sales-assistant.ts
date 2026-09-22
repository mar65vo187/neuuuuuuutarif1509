import { pool } from "@/db";
import { SERVICES, SITE } from "@/lib/content";

export type AiAssistantMode = "coach" | "objection" | "message" | "product" | "pitch";

export type AiAssistantAnswer = {
  text: string;
  provider: "xkiro" | "gemini" | "openrouter";
  model: string;
  sources: string[];
  redactions: number;
};

type KnowledgeRow = {
  product_name: string;
  category: string;
  provider_name: string;
  description: string;
  sales_arguments: string[];
  objections: Array<{ objection: string; answer: string }>;
  short_pitch: string;
  phone_pitch: string;
  d2d_pitch: string;
  b2b_pitch: string;
  checklist: string[];
  required_documents: string[];
  highlight: string | null;
};

type TrainingRow = {
  title: string;
  category: string;
  description: string;
  content: string;
};

const MODE_GUIDANCE: Record<AiAssistantMode, string> = {
  coach: "Hilf dem Mitarbeiter bei Gesprächsstruktur, Bedarfsermittlung, Positionierung und dem nächsten sinnvollen Schritt.",
  objection: "Beantworte den Einwand ruhig, konkret und respektvoll. Nicht drängen. Erst verstehen, dann sachlich einordnen.",
  message: "Formuliere eine sendefertige, menschliche Nachricht. Kein künstlicher Druck, keine erfundene Dringlichkeit und keine unbelegten Versprechen.",
  product: "Erkläre das passende Produkt- und Partnerwissen aus der bereitgestellten Wissensbasis. Unbekannte Details klar als unbekannt kennzeichnen.",
  pitch: "Erstelle einen kurzen, natürlichen Gesprächseinstieg. TarifWerk positiv positionieren, aber keine Superlative oder nicht belegte Marktführerschaft behaupten.",
};

const SYSTEM_CORE = [
  "Du bist der interne TarifWerk KI-Vertriebsassistent für Mitarbeiter.",
  "TarifWerk steht für Beratung auf Augenhöhe, verständliche Einordnung, persönliche Ansprechpartner und deutschlandweite Beratung.",
  "Positioniere TarifWerk selbstbewusst und positiv, aber ausschließlich mit Fakten aus der bereitgestellten Wissensbasis.",
  "Erfinde niemals Marktführerschaft, Ersparnisse, Preise, Rabatte, Bewertungen, Auszeichnungen, Exklusivität, Verfügbarkeiten, Provisionen oder rechtliche Zusagen.",
  "Behaupte nicht, TarifWerk vergleiche den gesamten Markt. TarifWerk arbeitet mit mehreren Marktteilnehmern und ordnet verfügbare Optionen anbieterübergreifend ein.",
  "Sprich Wettbewerber nicht schlecht. Erkläre stattdessen, was TarifWerk konkret anders oder hilfreich macht.",
  "Wenn ein Fakt nicht in der Wissensbasis steht, sage kurz, dass er intern geprüft werden muss.",
  "Keine Rechts-, Steuer-, Anlage- oder medizinische Beratung als verbindliche Fachberatung ausgeben.",
  "Keine personenbezogenen Kundendaten anfordern. Namen, E-Mail-Adressen und Telefonnummern gehören nicht in den KI-Prompt.",
  "Antworten sollen praktisch, menschlich, verkaufsstark und ohne manipulative Druckmethoden sein.",
].join("\n");

function normalize(value: string) {
  return value.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/[^a-z0-9äöüß\s-]/g, " ");
}

function queryTokens(question: string) {
  return [...new Set(normalize(question).split(/\s+/).filter((token) => token.length >= 3))].slice(0, 30);
}

function scoreText(text: string, tokens: string[]) {
  const source = normalize(text);
  return tokens.reduce((score, token) => score + (source.includes(token) ? 1 : 0), 0);
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 20) : [];
}

function safeObjections(value: unknown): Array<{ objection: string; answer: string }> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { objection: string; answer: string } =>
    Boolean(item && typeof item === "object" && typeof (item as { objection?: unknown }).objection === "string" && typeof (item as { answer?: unknown }).answer === "string"),
  ).slice(0, 12);
}

export function redactPrompt(input: string) {
  let redactions = 0;
  let text = input;
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, () => {
    redactions += 1;
    return "[E-Mail entfernt]";
  });
  text = text.replace(/(?:\+?\d[\d\s()\/-]{6,}\d)/g, () => {
    redactions += 1;
    return "[Telefon entfernt]";
  });
  return { text: text.trim().slice(0, 5000), redactions };
}

async function productKnowledge(question: string) {
  const result = await pool.query<KnowledgeRow>(`
    SELECT
      p.name AS product_name,
      p.category,
      pr.name AS provider_name,
      coalesce(pcp.description, '') AS description,
      coalesce(pcp.sales_arguments, '[]'::jsonb) AS sales_arguments,
      coalesce(pcp.objections, '[]'::jsonb) AS objections,
      coalesce(pcp.short_pitch, '') AS short_pitch,
      coalesce(pcp.phone_pitch, '') AS phone_pitch,
      coalesce(pcp.d2d_pitch, '') AS d2d_pitch,
      coalesce(pcp.b2b_pitch, '') AS b2b_pitch,
      coalesce(pcp.checklist, '[]'::jsonb) AS checklist,
      coalesce(pcp.required_documents, '[]'::jsonb) AS required_documents,
      pcp.highlight
    FROM products p
    INNER JOIN providers pr ON pr.id = p.provider_id
    LEFT JOIN product_catalog_profiles pcp ON pcp.product_id = p.id
    WHERE p.active = true
      AND pr.active = true
      AND coalesce(pcp.lifecycle_status, 'active') = 'active'
    ORDER BY p.category, pr.name, p.name
    LIMIT 150
  `);

  const tokens = queryTokens(question);
  return result.rows.map((row) => {
    const salesArguments = safeArray(row.sales_arguments);
    const objections = safeObjections(row.objections);
    const checklist = safeArray(row.checklist);
    const requiredDocuments = safeArray(row.required_documents);
    const combined = [
      row.product_name, row.category, row.provider_name, row.description, row.short_pitch,
      row.phone_pitch, row.d2d_pitch, row.b2b_pitch, row.highlight ?? "",
      ...salesArguments,
      ...objections.flatMap((item) => [item.objection, item.answer]),
      ...checklist,
      ...requiredDocuments,
    ].join(" ");
    return { ...row, salesArguments, objections, checklist, requiredDocuments, score: scoreText(combined, tokens) };
  }).sort((a, b) => b.score - a.score || a.product_name.localeCompare(b.product_name, "de")).slice(0, 12);
}

async function trainingKnowledge(question: string) {
  if (process.env.TARIFWERK_AI_INCLUDE_TRAINING !== "true") return [] as TrainingRow[];
  const result = await pool.query<TrainingRow>(`
    SELECT title, category, description, content
    FROM training_modules
    WHERE active = true
    ORDER BY required DESC, updated_at DESC
    LIMIT 80
  `);
  const tokens = queryTokens(question);
  return result.rows
    .map((row) => ({ ...row, score: scoreText([row.title, row.category, row.description, row.content].join(" "), tokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score: _score, ...row }) => row);
}

function staticKnowledge() {
  const services = SERVICES.map((service) => ({
    name: service.name,
    intro: service.intro,
    checks: service.checks.slice(0, 5),
  }));
  return {
    company: {
      name: SITE.name,
      claim: SITE.claim,
      hq: SITE.hq,
      website: SITE.url,
      contact: SITE.email,
      hours: SITE.hours,
    },
    principles: [
      "Beratung auf Augenhöhe",
      "Bedarf zuerst, Produkt danach",
      "Persönlicher Ansprechpartner",
      "Deutschlandweite Beratung",
      "TarifWerk arbeitet mit mehreren Marktteilnehmern, aber nicht mit jedem Anbieter",
      "Erstorientierung und Tarifcheck sind kostenfrei; mögliche Vermittlungen können provisionsvergütet sein",
      "Keine pauschalen Spar-, Rendite- oder Verfügbarkeitsversprechen",
    ],
    services,
  };
}

export async function buildAiKnowledge(question: string) {
  const [products, training] = await Promise.all([productKnowledge(question), trainingKnowledge(question)]);
  const sources = [
    "TarifWerk Unternehmensgrundsätze",
    ...products.map((row) => row.provider_name + " · " + row.product_name),
    ...training.map((row) => "Schulung · " + row.title),
  ].slice(0, 20);

  const productContext = products.map((row) => ({
    product: row.product_name,
    category: row.category,
    provider: row.provider_name,
    description: row.description,
    highlight: row.highlight,
    salesArguments: row.salesArguments,
    objections: row.objections,
    shortPitch: row.short_pitch,
    phonePitch: row.phone_pitch,
    d2dPitch: row.d2d_pitch,
    b2bPitch: row.b2b_pitch,
    checklist: row.checklist,
    requiredDocuments: row.requiredDocuments,
  }));

  return {
    sources,
    text: JSON.stringify({
      ...staticKnowledge(),
      products: productContext,
      training: training.map((row) => ({
        title: row.title,
        category: row.category,
        description: row.description,
        content: row.content.slice(0, 6000),
      })),
    }).slice(0, 70_000),
  };
}

function extractGeminiText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as {
    output_text?: unknown;
    steps?: Array<{ type?: unknown; content?: Array<{ type?: unknown; text?: unknown }> }>;
    outputs?: Array<{ type?: unknown; text?: unknown }>;
  };
  if (typeof record.output_text === "string") return record.output_text.trim();
  const steps = Array.isArray(record.steps) ? record.steps : [];
  const text = steps.flatMap((step) =>
    step?.type === "model_output" && Array.isArray(step.content)
      ? step.content.filter((item) => item?.type === "text" && typeof item.text === "string").map((item) => String(item.text))
      : [],
  ).join("\n").trim();
  if (text) return text;
  return (Array.isArray(record.outputs) ? record.outputs : [])
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => String(item.text))
    .join("\n")
    .trim();
}

async function callXkiro(system: string, input: string) {
  const key = process.env.XKIRO_API_KEY?.trim();
  if (!key) throw new Error("XKIRO_API_KEY fehlt.");
  const model = process.env.TARIFWERK_AI_XKIRO_MODEL?.trim() || "qwen/qwen3.8-omni-flash:free";
  const response = await fetch("https://api.xkiro.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
      max_tokens: 1400,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const json = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: unknown } }> } | null;
  if (!response.ok) throw new Error("Xkiro-Anfrage fehlgeschlagen (" + response.status + ").");
  const text = typeof json?.choices?.[0]?.message?.content === "string" ? json.choices[0].message.content.trim() : "";
  if (!text) throw new Error("Xkiro hat keine Textantwort geliefert.");
  return { text, provider: "xkiro" as const, model };
}

async function callGemini(system: string, input: string) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY fehlt.");
  const model = process.env.TARIFWERK_AI_GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      model,
      store: false,
      system_instruction: system,
      input,
      generation_config: {
        max_output_tokens: 1400,
        thinking_level: "low",
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Gemini-Anfrage fehlgeschlagen (" + response.status + ").");
  const text = extractGeminiText(json);
  if (!text) throw new Error("Gemini hat keine Textantwort geliefert.");
  return { text, provider: "gemini" as const, model };
}

async function callOpenRouter(system: string, input: string) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY fehlt.");
  const model = process.env.TARIFWERK_AI_OPENROUTER_MODEL?.trim() || "openrouter/free";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json",
      "HTTP-Referer": SITE.url,
      "X-Title": "TarifWerk Mitarbeiterportal",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
      max_tokens: 1400,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: unknown } }> } | null;
  if (!response.ok) throw new Error("OpenRouter-Anfrage fehlgeschlagen (" + response.status + ").");
  const text = typeof json?.choices?.[0]?.message?.content === "string" ? json.choices[0].message.content.trim() : "";
  if (!text) throw new Error("OpenRouter hat keine Textantwort geliefert.");
  return { text, provider: "openrouter" as const, model };
}

export function aiProviderStatus() {
  return {
    xkiro: Boolean(process.env.XKIRO_API_KEY?.trim()),
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    preferred: process.env.TARIFWERK_AI_PROVIDER?.trim() || "auto",
    dailyLimit: Math.max(1, Math.min(200, Number(process.env.TARIFWERK_AI_DAILY_LIMIT ?? 30) || 30)),
    trainingIncluded: process.env.TARIFWERK_AI_INCLUDE_TRAINING === "true",
  };
}

export async function askTarifWerkAi(input: {
  question: string;
  mode: AiAssistantMode;
  audience: "b2c" | "b2b";
}) {
  const redacted = redactPrompt(input.question);
  if (redacted.text.length < 3) throw new Error("Bitte eine konkrete Frage eingeben.");

  const knowledge = await buildAiKnowledge(redacted.text);
  const system = [
    SYSTEM_CORE,
    "Aktueller Arbeitsmodus: " + MODE_GUIDANCE[input.mode],
    "Zielgruppe: " + (input.audience === "b2b" ? "Geschäftskunden / Unternehmen (Sie-Ansprache)" : "Privatkunden (Du-Ansprache)"),
    "Antworte auf Deutsch.",
    "Nutze bevorzugt die bereitgestellten Fakten. Wenn du auf eine konkrete Produktinformation zurückgreifst, nenne den Produkt- oder Partnernamen nur, wenn er in der Wissensbasis steht.",
  ].join("\n");

  const userInput = [
    "FRAGE DES MITARBEITERS:",
    redacted.text,
    "",
    "FREIGEGEBENE TARIFWERK-WISSENSBASIS:",
    knowledge.text,
  ].join("\n");

  const preferred = (process.env.TARIFWERK_AI_PROVIDER?.trim() || "auto").toLowerCase();
  const errors: string[] = [];
  const tryXkiro = preferred === "auto" || preferred === "xkiro";
  const tryGemini = preferred === "auto" || preferred === "gemini";
  const tryOpenRouter = preferred === "auto" || preferred === "openrouter";

  if (tryXkiro && process.env.XKIRO_API_KEY?.trim()) {
    try {
      const result = await callXkiro(system, userInput);
      return { ...result, sources: knowledge.sources, redactions: redacted.redactions };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Xkiro fehlgeschlagen.");
    }
  }

  if (tryGemini && process.env.GEMINI_API_KEY?.trim()) {
    try {
      const result = await callGemini(system, userInput);
      return { ...result, sources: knowledge.sources, redactions: redacted.redactions };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Gemini fehlgeschlagen.");
    }
  }

  if (tryOpenRouter && process.env.OPENROUTER_API_KEY?.trim()) {
    try {
      const result = await callOpenRouter(system, userInput);
      return { ...result, sources: knowledge.sources, redactions: redacted.redactions };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "OpenRouter fehlgeschlagen.");
    }
  }

  if (!process.env.XKIRO_API_KEY?.trim() && !process.env.GEMINI_API_KEY?.trim() && !process.env.OPENROUTER_API_KEY?.trim()) {
    throw new Error("KI ist noch nicht aktiviert. XKIRO_API_KEY, GEMINI_API_KEY oder OPENROUTER_API_KEY fehlt.");
  }
  throw new Error(errors[0] ?? "Kein KI-Provider war erreichbar.");
}

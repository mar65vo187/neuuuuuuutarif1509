/* Legacy production fallback for the currently running Railway image.
 * The current source code already has native Groq support. Keep this file only
 * so the live bridge can be reproduced safely until a full source/image rollout
 * has replaced the legacy snapshot.
 */
const originalFetch = globalThis.fetch.bind(globalThis);

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const XKIRO_URL = "https://api.xkiro.com/v1/chat/completions";
const PUBLIC_MARKERS = [
  "Du bist der digitale TarifWerk KI-Berater für Besucher auf www.tarifwerk.eu.",
  "Du bist TarifWerks KI, der digitale KI-Assistent für Besucher auf www.tarifwerk.eu.",
];
const KNOWLEDGE_MARKER = "ÖFFENTLICHE TARIFWERK-WISSENSBASIS:";

globalThis.fetch = async function tarifwerkPublicAiBridge(input, init = {}) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input?.url || "";

  if (
    url === XKIRO_URL &&
    process.env.TARIFWERK_PUBLIC_AI_RUNTIME_BRIDGE === "1" &&
    process.env.GROQ_API_KEY
  ) {
    try {
      const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
      const system =
        body?.messages?.[0]?.role === "system"
          ? String(body.messages[0].content || "")
          : "";
      const isPublicTarifWerkChat =
        PUBLIC_MARKERS.some((marker) => system.includes(marker)) &&
        system.includes(KNOWLEDGE_MARKER);

      if (isPublicTarifWerkChat) {
        const groqBody = {
          ...body,
          model:
            process.env.TARIFWERK_PUBLIC_AI_GROQ_MODEL ||
            "qwen/qwen3.8-27b",
          max_completion_tokens: Math.min(
            520,
            Number(body.max_tokens || body.max_completion_tokens || 500),
          ),
          reasoning_effort: "none",
          include_reasoning: false,
          stream: false,
        };
        delete groqBody.max_tokens;

        const headers = new Headers(init.headers || {});
        headers.set("Authorization", "Bearer " + process.env.GROQ_API_KEY);
        headers.set("Content-Type", "application/json");
        headers.set("Accept", "application/json");

        const response = await originalFetch(GROQ_URL, {
          ...init,
          headers,
          body: JSON.stringify(groqBody),
        });

        if (response.ok) {
          console.log("[public-ai-bridge] groq qwen response ok");
          return response;
        }

        console.error(
          "[public-ai-bridge] groq failed HTTP " +
            response.status +
            "; falling back to xkiro",
        );
      }
    } catch (error) {
      console.error(
        "[public-ai-bridge] groq bridge error; falling back to xkiro",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }

  return originalFetch(input, init);
};

console.log("[public-ai-bridge] runtime bridge enabled");

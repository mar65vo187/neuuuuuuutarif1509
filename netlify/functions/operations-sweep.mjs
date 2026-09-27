// Netlify Scheduled Function: ruft den internen, passwortgeschützten
// Operations-Sweep der Anwendung auf (Route /api/internal/operations-sweep).
// Zeitplan in netlify.toml (standardmäßig täglich 04:00 UTC).
const operationsSweep = async () => {
  const secret = process.env.CRON_SECRET;
  const siteUrl = process.env.SITE_URL;
  if (!secret || !siteUrl) {
    return new Response(JSON.stringify({ ok: false, error: "CRON_SECRET oder SITE_URL fehlt." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/internal/operations-sweep`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: "Operations-Wächter nicht erreichbar.", detail: String(error?.message ?? error) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
};

export default operationsSweep;

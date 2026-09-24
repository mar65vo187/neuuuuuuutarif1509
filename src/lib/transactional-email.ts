function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export function transactionalEmailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.TARIFWERK_TRANSACTIONAL_FROM);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  tag?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TARIFWERK_TRANSACTIONAL_FROM;
  if (!apiKey || !from) return { ok: false as const, error: "email_not_configured" };

  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#101828">
    <div style="font-size:20px;font-weight:800;margin-bottom:20px">TarifWerk</div>
    <div style="white-space:pre-wrap;line-height:1.65">${escapeHtml(input.text)}</div>
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#667085">
      TarifWerk · Beratung auf Augenhöhe
    </div>
  </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html,
        ...(input.tag ? { tags: [{ name: "category", value: input.tag.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) }] } : {}),
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok || !payload.id) return { ok: false as const, error: payload.message || "email_send_failed" };
    return { ok: true as const, id: payload.id };
  } catch {
    return { ok: false as const, error: "email_unavailable" };
  }
}

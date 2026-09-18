"use client";

import { Check, Loader2, WalletCards, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function ReferralAdminActions({
  id,
  status,
  maxVoucherAmountCents,
  voucherAmountCents,
  payoutChoice,
}: {
  id: number;
  status: string;
  maxVoucherAmountCents: number;
  voucherAmountCents: number | null;
  payoutChoice: string | null;
}) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [amount, setAmount] = useState(String((voucherAmountCents ?? maxVoucherAmountCents) / 100));
  const [choice, setChoice] = useState<"voucher" | "cash">(payoutChoice === "cash" ? "cash" : "voucher");
  const [error, setError] = useState<string | null>(null);

  async function patch(key: string, body: Record<string, unknown>) {
    if (saving.current) return;
    saving.current = true;
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(`/api/portal/admin/referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Speichern fehlgeschlagen.");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  const numericAmount = Number(amount.replace(",", "."));
  const max = maxVoucherAmountCents / 100;

  return <div className="space-y-3">
    {status === "completed" && <>
      <label className="label">Bestätigter Gutscheinwert (€)
        <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label className="label">Bevorzugte Ausgabe
        <select className="field" value={choice} onChange={(e) => setChoice(e.target.value as "voucher" | "cash")}>
          <option value="voucher">Wunschgutschein</option>
          <option value="cash">Geld-Auszahlung (50 %)</option>
        </select>
      </label>
      <p className="text-[12px] text-steel">Maximal erlaubt: {max.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</p>
      <button type="button" disabled={busy !== null || !Number.isFinite(numericAmount) || numericAmount < 0 || numericAmount > max}
        onClick={() => patch("approve", { status: "approved", voucherAmount: numericAmount, payoutChoice: choice })}
        className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white disabled:opacity-50">
        {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Freigeben
      </button>
    </>}

    {status === "approved" && <button type="button" disabled={busy !== null}
      onClick={() => patch("paid", { status: "paid", payoutChoice: choice })}
      className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white disabled:opacity-50">
      {busy === "paid" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WalletCards className="h-3.5 w-3.5" />} Als ausgezahlt markieren
    </button>}

    {!["paid", "cancelled", "chargeback"].includes(status) && <button type="button" disabled={busy !== null}
      onClick={() => patch("cancel", { status: "cancelled", note: "Nicht freigegeben / Rückabwicklung" })}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-red-700 disabled:opacity-50">
      {busy === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Nicht freigeben
    </button>}

    {error && <p role="alert" className="text-[12px] text-red-700">{error}</p>}
  </div>;
}

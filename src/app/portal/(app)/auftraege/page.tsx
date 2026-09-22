import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Download, FileWarning, PackageCheck, Plus, Search, ShieldAlert } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { OrderBulkList } from "@/components/portal/OrderBulkList";
import { SavedViewsBar } from "@/components/portal/SavedViewsBar";
import { getCurrentUser } from "@/lib/auth";
import { listOrders, listOrderWorkqueueProviders } from "@/lib/enterprise";
import { ORDER_STATUSES } from "@/lib/enterprise-validation";
import { isCompensationOwner } from "@/lib/compensation";
import { listSavedViews } from "@/lib/portal-productivity";
import { listOrderAssignableEmployees, permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

const LABELS: Record<string, string> = {
  draft: "Entwurf",
  documents_missing: "Unterlagen fehlen",
  ready_to_submit: "Einreichbereit",
  submitted: "Eingereicht",
  provider_review: "Provider-Prüfung",
  accepted: "Angenommen",
  activation_pending: "Aktivierung offen",
  active: "Aktiv",
  rejected: "Abgelehnt",
  cancelled: "Storniert",
  storno: "Storno",
};

const FOCUS_LABELS = {
  attention: "Aufmerksamkeit",
  provider_warning: "Provider prüfen",
  documents: "Unterlagen",
  activation: "Aktivierung",
  unassigned: "Unzugewiesen",
} as const;

type Focus = keyof typeof FOCUS_LABELS;
type SearchParams = {
  status?: string;
  q?: string;
  page?: string;
  provider?: string;
  advisor?: string;
  focus?: string;
};

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fauftraege");

  const capabilities = await permissionSnapshot(user, [
    PORTAL_PERMISSION.ORDER_READ,
    PORTAL_PERMISSION.ORDER_EDIT,
    PORTAL_PERMISSION.ORDER_CREATE,
    PORTAL_PERMISSION.ORDER_CANCEL,
  ] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.ORDER_EDIT];
  const canRead = capabilities[PORTAL_PERMISSION.ORDER_READ] || canEdit;
  if (!canRead) redirect("/portal");

  const canCreate = capabilities[PORTAL_PERMISSION.ORDER_CREATE];
  const canCancel = capabilities[PORTAL_PERMISSION.ORDER_CANCEL];
  const canReassign = user.role === "admin" && canEdit;
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 200) || undefined;
  const validStatus = params.status && ORDER_STATUSES.includes(params.status as typeof ORDER_STATUSES[number]) ? params.status : undefined;
  const rawFocus = params.focus as Focus | undefined;
  const focus = rawFocus && Object.prototype.hasOwnProperty.call(FOCUS_LABELS, rawFocus) && (rawFocus !== "unassigned" || user.role === "admin") ? rawFocus : undefined;
  const providerNumber = params.provider ? Number(params.provider) : NaN;
  const providerId = Number.isSafeInteger(providerNumber) && providerNumber > 0 ? providerNumber : undefined;
  const advisorNumber = params.advisor ? Number(params.advisor) : NaN;
  const advisorEmployeeId = canReassign && Number.isSafeInteger(advisorNumber) && advisorNumber > 0 ? advisorNumber : undefined;
  const parsedPage = params.page ? Number(params.page) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1;
  const pageSize = 50;

  const [queriedRows, savedViews, providerOptions, assignees] = await Promise.all([
    listOrders(user, {
      status: validStatus,
      search: q,
      page,
      lookahead: true,
      providerId,
      advisorEmployeeId,
      focus,
    }, pageSize),
    listSavedViews(user, "orders"),
    listOrderWorkqueueProviders(user),
    canReassign ? listOrderAssignableEmployees() : Promise.resolve([]),
  ]);

  const rows = queriedRows.slice(0, pageSize);
  const hasNextPage = queriedRows.length > pageSize;
  const hasPreviousPage = page > 1;
  const rangeStart = rows.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = rows.length ? rangeStart + rows.length - 1 : 0;
  const owner = isCompensationOwner(user);

  const current: Record<string, string | undefined> = {
    status: validStatus,
    q,
    provider: providerId ? String(providerId) : undefined,
    advisor: advisorEmployeeId ? String(advisorEmployeeId) : undefined,
    focus,
  };

  const href = (changes: Record<string, string | undefined> = {}) => {
    const merged = { ...current, ...changes };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) query.set(key, value);
    }
    const value = query.toString();
    return `/portal/auftraege${value ? `?${value}` : ""}`;
  };

  const savedFilters = Object.fromEntries(
    Object.entries(current).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  const focusOptions = [
    { value: undefined, label: "Alle", Icon: PackageCheck },
    { value: "attention" as const, label: "Aufmerksamkeit", Icon: AlertTriangle },
    { value: "provider_warning" as const, label: "Provider prüfen", Icon: ShieldAlert },
    { value: "documents" as const, label: "Unterlagen", Icon: FileWarning },
    { value: "activation" as const, label: "Aktivierung", Icon: PackageCheck },
    ...(user.role === "admin" ? [{ value: "unassigned" as const, label: "Unzugewiesen", Icon: AlertTriangle }] : []),
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Auftragssteuerung · Operations</p>
          <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Aufträge & Verträge</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-steel">
            {rows.length ? `Vorgänge ${rangeStart}–${rangeEnd}` : "Keine Vorgänge in dieser Ansicht"} · Providerstatus, Zuständigkeit und operative Blockaden in einer Queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/portal/enterprise/export?type=orders" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Download className="h-4 w-4" /> CSV</a>
          {canCreate && <Link href="/portal/auftraege/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Auftrag anlegen</Link>}
        </div>
      </header>

      <nav className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Auftragsfokus">
        {focusOptions.map(({ value, label, Icon }) => {
          const active = focus === value || (!focus && value === undefined);
          return (
            <Link
              key={label}
              href={href({ focus: value, page: undefined })}
              className={"inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-bold transition " + (active ? "border-ink bg-ink text-white" : "border-line bg-white text-steel hover:border-electric/30 hover:text-electric-deep")}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </Link>
          );
        })}
      </nav>

      <form className={"grid gap-2 rounded-[18px] border border-line bg-white p-3 " + (canReassign ? "lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,0.75fr))_auto]" : "lg:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,0.8fr))_auto]")} method="get">
        {focus && <input type="hidden" name="focus" value={focus} />}
        <label className="relative">
          <span className="sr-only">Aufträge durchsuchen</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
          <input name="q" defaultValue={q ?? ""} maxLength={200} className="field h-11 pl-10" placeholder="Auftrag, Kunde, Provider, Produkt, externe ID …" />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={validStatus ?? ""} className="field h-11">
            <option value="">Alle Status</option>
            {ORDER_STATUSES.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Provider</span>
          <select name="provider" defaultValue={providerId ? String(providerId) : ""} className="field h-11">
            <option value="">Alle Provider</option>
            {providerOptions.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
        </label>
        {canReassign && (
          <label>
            <span className="sr-only">Zuständiger Mitarbeiter</span>
            <select name="advisor" defaultValue={advisorEmployeeId ? String(advisorEmployeeId) : ""} className="field h-11">
              <option value="">Alle Zuständigen</option>
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <button className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-ink px-4 text-[12px] font-bold text-white hover:bg-electric lg:flex-none">Filtern</button>
          <Link href={focus ? `/portal/auftraege?focus=${focus}` : "/portal/auftraege"} className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-3 text-[12px] font-bold text-steel hover:border-electric/30 hover:text-electric-deep">Reset</Link>
        </div>
      </form>

      <SavedViewsBar area="orders" basePath="/portal/auftraege" views={savedViews} currentFilters={savedFilters} />

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-[14.5px] text-steel">Keine Aufträge in dieser Operations-Ansicht.</p>
        ) : (
          <OrderBulkList
            canEdit={canEdit}
            canCancel={canCancel}
            showCommission={owner}
            assignees={canReassign ? assignees : []}
            rows={rows.map((row) => ({
              id: row.order.id,
              orderNumber: row.order.orderNumber,
              customerName: row.customer.companyName || [row.customer.firstName, row.customer.lastName].filter(Boolean).join(" "),
              providerName: row.providerName,
              productName: row.productName,
              advisorName: row.advisorName,
              updatedAt: row.order.updatedAt.toISOString(),
              status: row.order.status,
              expectedCommission: owner ? row.order.expectedCommission : null,
              operationalAttention: row.operationalAttention,
              providerWarning: row.providerWarning,
            }))}
          />
        )}
      </Card>

      {(hasPreviousPage || hasNextPage || rows.length > 0) && (
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_30px_-28px_rgba(6,11,22,0.45)]" aria-label="Auftrags-Seiten">
          <p className="text-[11.5px] font-semibold text-steel">{rows.length ? `Vorgänge ${rangeStart}–${rangeEnd}` : "Keine Vorgänge auf dieser Seite"}</p>
          <div className="flex items-center gap-2">
            {hasPreviousPage ? <Link href={href({ page: String(page - 1) })} className="inline-flex h-9 items-center rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-electric/30">Zurück</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Zurück</span>}
            <span className="min-w-20 text-center text-[11.5px] font-extrabold text-ink">Seite {page}</span>
            {hasNextPage ? <Link href={href({ page: String(page + 1) })} className="inline-flex h-9 items-center rounded-xl bg-electric px-3 text-[11.5px] font-extrabold text-white hover:bg-electric-deep">Weiter</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Weiter</span>}
          </div>
        </nav>
      )}
    </div>
  );
}

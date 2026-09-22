import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";
import * as zod from "zod";
import { loadTs } from "./helpers/load-ts.mjs";

const Link = ({ children, ...props }) => {
  delete props.scroll;
  return createElement("a", props, children);
};
const content = loadTs("src/lib/content.ts");
const ui = loadTs("src/components/portal/ui.tsx", { "@/lib/content": content });
const { LeadPipelineBoard } = loadTs("src/components/portal/LeadPipelineBoard.tsx", {
  "next/link": { default: Link }, "next/navigation": { useRouter: () => ({}) },
  "lucide-react": icons, "@/components/portal/ui": ui, "@/lib/content": content,
});
const row = {
  id: 42, name: "Testlead", status: "neu", priority: "normal", contactOutcome: "open",
  nextActionAt: null, nextActionOverdue: false, confirmedSlot: null, phone: "+49123456",
  email: "test@example.test", audience: "b2c", createdByName: "Ersteller", assignedName: "Berater",
  existingProductNames: [], interestProductNames: [], soldProductNames: [],
  intelligence: { label: "Nächster Schritt", detail: "Kontakt aufnehmen", tone: "normal" },
};
const board = canEdit => renderToStaticMarkup(createElement(LeadPipelineBoard, {
  rows: [row, { ...row, id: 43, status: "termin_bestaetigt" }], canEdit, activeStatus: "",
  stageLinks: [{ key: "", label: "Alle Stufen", href: "/portal/leads/pipeline" }],
}));

// Pagination and callback invariants run against executable query/route modules
// in lead-query-filters.test.mjs and lead-mutation.test.mjs.
test("pipeline requires explicit call entry and preserves telephone and email actions", () => {
  const html = board(true);
  assert.match(html, /href="\/portal\/leads\/42#bearbeiten"[^>]*>.*?Anruf erfassen/);
  assert.match(html, /href="tel:\+49123456"/);
  assert.match(html, /href="mailto:test@example.test"/);
  assert.match(html, /<button[^>]*>.*?Beratung starten/);
  assert.doesNotMatch(html, /<button[^>]*>[^<]*Angerufen<\/button>/);
  const { leadUpdateSchema } = loadTs("src/lib/validation.ts", { zod });
  assert.equal(leadUpdateSchema.safeParse({ contactOutcome: "attempted" }).success, true);
  assert.equal(leadUpdateSchema.safeParse({ contactOutcome: "invented" }).success, false);
});

test("read-only pipeline keeps lead access but omits call and consultation mutations", () => {
  const html = board(false);
  assert.match(html, /Nur Lesezugriff/);
  assert.match(html, /href="\/portal\/leads\/42"/);
  assert.doesNotMatch(html, /Anruf erfassen|Beratung starten|Abschluss prüfen/);
});

test("mobile navigation renders labelled accessible destinations according to permissions", () => {
  const { PortalShell } = loadTs("src/components/portal/PortalShell.tsx", {
    "next/link": { default: Link }, "next/navigation": { usePathname: () => "/portal/leads" },
    "lucide-react": icons, "@/components/ui/Logo": { Logo: () => null },
    "@/components/portal/PortalHelpPanel": { PortalHelpPanel: () => null },
    "@/components/portal/PortalCommandPalette": { PortalCommandPalette: () => null },
    "@/lib/portal-help": { getPortalHelp: () => ({ title: "Leads", purpose: "Arbeit planen" }) },
  });
  const html = renderToStaticMarkup(createElement(PortalShell, {
    user: { id: 7, name: "Testberater", role: "berater" }, permissions: ["lead.edit"],
    openCount: 0, notificationCount: 0,
  }, "Arbeitsbereich"));
  const dialog = html.match(/<dialog[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(dialog);
  assert.match(dialog, /aria-labelledby="portal-navigation-title"/);
  assert.match(dialog, /id="portal-navigation-title"/);
  assert.match(dialog, /aria-label="Navigation schließen"/);
  assert.match(dialog, /href="\/portal\/leads"/);
  assert.match(dialog, /Leads &amp; Termine/);
  assert.doesNotMatch(dialog, /href="\/portal\/(?:audit|kunden|auftraege|aufgaben|system)"/);
});

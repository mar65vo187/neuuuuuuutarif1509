import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("direct messages persist a private recipient and direct channel", () => {
  const schema = read("src/db/schema.ts");
  const migration = read("migrations/0024_private_direct_messages.sql");

  assert.match(schema, /recipientEmployeeId: integer\("recipient_employee_id"\)/);
  assert.match(schema, /"all" \| "admins" \| "direct"/);
  assert.match(migration, /CHECK \(channel IN \('all', 'admins', 'direct'\)\)/);
  assert.match(migration, /FOREIGN KEY \(recipient_employee_id\) REFERENCES employees\(id\) ON DELETE SET NULL/);
});

test("only the configured owner can open the global direct-message view", () => {
  const auth = read("src/lib/auth.ts");
  const route = read("src/app/api/portal/chat/route.ts");
  const queries = read("src/lib/queries.ts");

  assert.match(auth, /PORTAL_OWNER_EMAIL/);
  assert.match(auth, /user\.role === "admin"/);
  assert.match(route, /scope"\) === "owner-all"/);
  assert.match(route, /!isPortalOwner\(user\)/);
  assert.match(queries, /ownerAll && isPortalOwner\(current\)/);
});

test("non-owner direct-message reads are limited to sender and recipient", () => {
  const queries = read("src/lib/queries.ts");

  assert.match(queries, /eq\(teamMessages\.employeeId, current\.id\)/);
  assert.match(queries, /eq\(teamMessages\.recipientEmployeeId, current\.id\)/);
  assert.match(queries, /eq\(teamMessages\.recipientEmployeeId, recipientEmployeeId\)/);
  assert.match(queries, /eq\(teamMessages\.employeeId, recipientEmployeeId\)/);
});

test("direct messages support advisor selection and exact email addressing", () => {
  const panel = read("src/components/portal/ChatPanel.tsx");
  const route = read("src/app/api/portal/chat/route.ts");
  const validation = read("src/lib/validation.ts");

  assert.match(panel, /Berater auswählen/);
  assert.match(panel, /Oder E-Mail eingeben/);
  assert.match(panel, /Owner: alle Nachrichten/);
  assert.match(route, /findChatRecipient/);
  assert.match(route, /recipient\.id === user\.id/);
  assert.match(validation, /recipientEmail/);
  assert.match(validation, /recipientId/);
});

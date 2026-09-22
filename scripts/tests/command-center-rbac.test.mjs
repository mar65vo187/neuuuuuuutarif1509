import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("command center scopes every CRM domain by effective permission", () => {
  const source = read("src/lib/portal-command-center.ts");
  assert.match(source, /permissionSnapshot\(user, \[/);
  assert.match(source, /const canLead = capabilities\[PORTAL_PERMISSION\.LEAD_EDIT\]/);
  assert.match(source, /const canCustomer = capabilities\[PORTAL_PERMISSION\.CUSTOMER_READ\] \|\| capabilities\[PORTAL_PERMISSION\.CUSTOMER_EDIT\]/);
  assert.match(source, /const canOrder = capabilities\[PORTAL_PERMISSION\.ORDER_READ\] \|\| capabilities\[PORTAL_PERMISSION\.ORDER_EDIT\]/);
  assert.match(source, /const canTask = capabilities\[PORTAL_PERMISSION\.TASK_MANAGE\]/);
  assert.match(source, /const leadAccess = canLead \? leadAccessCondition\(user\) : sql`false`/);
  assert.match(source, /const orderCondition = canOrder \? orderAccess\(user\) : sql`false`/);
  assert.match(source, /const taskCondition = canTask \? taskAccess\(user\) : sql`false`/);
  assert.match(source, /const customerCondition = canCustomer \? customerAccess\(user\) : sql`false`/);
});

test("lead momentum and task links cannot bypass command-center RBAC", () => {
  const source = read("src/lib/portal-command-center.ts");
  assert.match(source, /\.where\(and\(\s*leadAccess,\s*eq\(leads\.createdByEmployeeId, user\.id\)/s);
  assert.match(source, /task\.entityType === "order" && canOrder/);
  assert.match(source, /task\.entityType === "customer" && canCustomer/);
  assert.match(source, /task\.entityType === "lead" && canLead/);
});

test("dashboard renders only CRM surfaces the role can read", () => {
  const source = read("src/app/portal/(app)/page.tsx");
  assert.match(source, /PORTAL_PERMISSION\.CUSTOMER_READ/);
  assert.match(source, /PORTAL_PERMISSION\.ORDER_READ/);
  assert.match(source, /const canLeadRead = canLeadEdit/);
  assert.match(source, /const canCustomerRead = capabilities\[PORTAL_PERMISSION\.CUSTOMER_READ\] \|\| canCustomerEdit/);
  assert.match(source, /const canOrderRead = capabilities\[PORTAL_PERMISSION\.ORDER_READ\] \|\| canOrderEdit/);
  assert.match(source, /const salesControl = canLeadRead \?/);
  assert.match(source, /const customerControl = canCustomerRead \?/);
  assert.match(source, /\{canLeadRead && \(\s*<section[^>]+aria-label="Tagesleistung"/s);
  assert.match(source, /\{qualityChecks\.length > 0 && \(/);
  assert.match(source, /\{customerControl\.length > 0 && \(/);
  assert.match(source, /\{\(canLeadRead \|\| canOrderRead\) && \(/);
});

test("dashboard recommendations never link to hidden domains", () => {
  const source = read("src/app/portal/(app)/page.tsx");
  assert.match(source, /canTaskManage && data\.metrics\.overdueTasks > 0/);
  assert.match(source, /canLeadRead && data\.metrics\.untouchedLeadsSla > 0/);
  assert.match(source, /canCustomerRead && data\.metrics\.atRiskCustomers > 0/);
  assert.match(source, /canLeadRead && data\.metrics\.leadsMissingNextAction > 0/);
  assert.match(source, /canCustomerRead && data\.metrics\.dueCustomerReviews > 0/);
});

test("work assistant inherits protected command-center data and hides order-only status without order read", () => {
  const source = read("src/app/portal/(app)/assistent/page.tsx");
  assert.match(source, /permissionSnapshot\(user, \[/);
  assert.match(source, /PORTAL_PERMISSION\.ORDER_READ/);
  assert.match(source, /PORTAL_PERMISSION\.ORDER_EDIT/);
  assert.match(source, /const canOrderRead = capabilities\[PORTAL_PERMISSION\.ORDER_READ\] \|\| capabilities\[PORTAL_PERMISSION\.ORDER_EDIT\]/);
  assert.match(source, /\{canOrderRead && <Card/);
  assert.match(source, /aus deinem freigegebenen Arbeitsbestand/);
});

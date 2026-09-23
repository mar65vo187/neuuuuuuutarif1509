import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

// This suite creates synthetic records in the disposable local CI database.
const base = process.env.RUNTIME_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
if (process.env.CRM_SMOKE_ALLOW_WRITE !== "1" || !databaseUrl
  || !localHosts.has(new URL(databaseUrl).hostname) || !localHosts.has(new URL(base).hostname)) {
  throw new Error("CRM smoke requires CRM_SMOKE_ALLOW_WRITE=1 and a disposable local database/server.");
}

const client = new pg.Client({ connectionString: databaseUrl });
const prefix = "crm-smoke-" + randomBytes(5).toString("hex");
const password = randomBytes(24).toString("hex");
const salt = randomBytes(16).toString("hex");
const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
const checks = [];
const pass = name => { checks.push(name); console.log("PASS " + name); };
async function query(sql, values = []) { return (await client.query(sql, values)).rows; }
async function request(path, cookie, body, method = "POST") {
  const response = await fetch(base + path, {
    method, headers: { Origin: base, Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  return { status: response.status, body: await response.json() };
}
async function login(person) {
  const response = await fetch(base + "/api/portal/login", {
    method: "POST", headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ email: person.email, password }), signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, "Synthetic account login");
  return response.headers.get("set-cookie").split(";")[0];
}
async function page(path, cookie) {
  const response = await fetch(base + path, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  return response.text();
}
async function person(name, permissions) {
  const [user] = await query("insert into employees(name,email,password_hash,role) values ($1,$2,$3,'berater') returning id,email", [prefix + " " + name, `${prefix}-${name}@example.test`, hash]);
  if (permissions) {
    const [role] = await query("insert into role_definitions(key,name) values ($1,$1) returning id", [prefix + "-" + name]);
    await query("insert into role_permissions(role_id,permission_id) select $1,id from permissions where key=any($2::text[])", [role.id, permissions]);
    await query("insert into employee_role_assignments(employee_id,role_id) values ($1,$2)", [user.id, role.id]);
  }
  return user;
}
async function customer(owner, name, email = `${prefix}-${name}@example.test`) {
  const [row] = await query("insert into customers(customer_number,first_name,email,owner_employee_id) values ($1,$2,$3,$4) returning id,email", [prefix + "-" + name, name, email, owner.id]);
  return row;
}
async function lead(owner, name, assignee = owner) {
  const [row] = await query("insert into leads(name,email,created_by_employee_id,assigned_employee_id) values ($1,$2,$3,$4) returning id", [prefix + " " + name, `${prefix}-${name}@example.test`, owner.id, assignee.id]);
  return row;
}

await client.connect();
try {
  const advisor = await person("advisor");
  const other = await person("other");
  const reader = await person("reader", ["customer.read"]);
  const tasker = await person("tasker", ["task.manage"]);
  const orderer = await person("orderer", ["order.create"]);
  const advisorCookie = await login(advisor);
  const readerCookie = await login(reader);
  const taskerCookie = await login(tasker);
  const ordererCookie = await login(orderer);
  const [provider] = await query("insert into providers(name,category) values ($1,'Internet') returning id", [prefix]);
  const own = await customer(advisor, "OwnCustomer");
  const second = await customer(advisor, "SecondCustomer");
  const readCustomer = await customer(reader, "ReadableCustomer");
  const ownLead = await lead(advisor, "OwnLead");
  const foreignLead = await lead(other, "HiddenLead");
  const readLead = await lead(reader, "ReaderHiddenLead");
  const orderLead = await lead(orderer, "OrderOnlyLead");
  await query("insert into customer_lead_links(customer_id,lead_id) values ($1,$2),($3,$4)", [own.id, foreignLead.id, readCustomer.id, readLead.id]);
  const hiddenNote = prefix + "-confidential-lead-note";
  const hiddenCall = prefix + "-confidential-lead-call";
  await query("insert into lead_notes(lead_id,body,kind) values ($1,$3,'note'),($2,$3,'note')", [foreignLead.id, readLead.id, hiddenNote]);
  await query("insert into lead_call_activities(lead_id,called_at,reached_person,reaction,outcome,note) values ($1,now(),'nobody','no_answer','no_answer',$3),($2,now(),'nobody','no_answer','no_answer',$3)", [foreignLead.id, readLead.id, hiddenCall]);
  const hiddenOrder = prefix + "-confidential-order";
  await query("insert into orders(order_number,customer_id,provider_id,advisor_employee_id) values ($1,$2,$3,$4)", [hiddenOrder, readCustomer.id, provider.id, reader.id]);
  const hiddenTask = prefix + "-confidential-task";
  await query("insert into tasks(entity_type,entity_id,title,assigned_to_employee_id) values ('customer',$1,$2,$3)", [readCustomer.id, hiddenTask, reader.id]);

  let html = await page(`/portal/kunden/${readCustomer.id}`, readerCookie);
  for (const secret of [hiddenNote, hiddenCall, hiddenOrder, hiddenTask]) assert(!html.includes(secret), "Customer-only role must not receive " + secret);
  pass("Customer read permission does not expose lead, order or task data in HTML/RSC");
  html = await page(`/portal/kunden/${own.id}`, advisorCookie);
  assert(!html.includes(hiddenNote) && !html.includes(hiddenCall));
  pass("Customer ownership does not bypass linked lead ownership and explicit assignment");

  const orderPath = "/api/portal/enterprise/orders";
  for (const body of [
    { leadId: foreignLead.id, providerId: provider.id },
    { customerId: own.id, leadId: foreignLead.id, providerId: provider.id },
  ]) {
    const result = await request(orderPath, advisorCookie, body);
    assert.equal(result.status, 404, JSON.stringify(result));
  }
  assert.equal((await query("select id from orders where lead_id=$1", [foreignLead.id])).length, 0);
  pass("Unassigned foreign leads cannot be converted or attached to an order");
  assert.equal((await request(orderPath, ordererCookie, { leadId: orderLead.id, providerId: provider.id })).status, 403);
  pass("Order creation permission alone does not grant lead access");

  const beforeCustomers = (await query("select count(*)::int as total from customers where owner_employee_id=$1", [advisor.id]))[0].total;
  const failedOrder = await request(orderPath, advisorCookie, { leadId: ownLead.id, providerId: 2147483647 });
  assert([400, 404, 422].includes(failedOrder.status), JSON.stringify(failedOrder));
  assert.equal((await query("select count(*)::int as total from customers where owner_employee_id=$1", [advisor.id]))[0].total, beforeCustomers);
  assert.equal((await query("select * from customer_lead_links where lead_id=$1", [ownLead.id])).length, 0);
  pass("Rejected order leaves no partially converted customer or lead link");
  const validOrder = await request(orderPath, advisorCookie, { leadId: ownLead.id, providerId: provider.id });
  assert.equal(validOrder.status, 201, JSON.stringify(validOrder));
  assert.equal((await query("select * from customer_lead_links where lead_id=$1", [ownLead.id])).length, 1);
  pass("Authorized lead conversion creates a linked customer and order");
  const delegatedLead = await lead(other, "DelegatedLead", advisor);
  const delegatedOrder = await request(orderPath, advisorCookie, { leadId: delegatedLead.id, providerId: provider.id });
  assert.equal(delegatedOrder.status, 201, JSON.stringify(delegatedOrder));
  pass("Explicitly assigned leads remain accessible for authorized conversion");

  const customerPath = `/api/portal/enterprise/customers/${own.id}`;
  assert.equal((await request(customerPath, advisorCookie, { email: second.email }, "PATCH")).status, 409);
  assert.equal((await query("select email from customers where id=$1", [own.id]))[0].email, own.email);
  assert.equal((await request(customerPath, advisorCookie, { firstName: "", lastName: "" }, "PATCH")).status, 422);
  assert.equal((await request(customerPath, advisorCookie, { email: own.email, city: "Wiesbaden" }, "PATCH")).status, 200);
  pass("Customer edits reject duplicates and empty identities while allowing self identity");

  const aiUsage = await query("insert into ai_assistant_usage(employee_id,provider,model,mode,input_chars,output_chars,status) values ($1,'test','test','coach',30,80,'completed') returning id", [advisor.id]);
  const feedbackPath = "/api/portal/ai/feedback";
  const feedbackInput = { usageId: aiUsage[0].id, helpful: true, outcome: "next_step" };
  assert.equal((await request(feedbackPath, readerCookie, feedbackInput)).status, 404);
  assert.equal((await request(feedbackPath, advisorCookie, feedbackInput)).status, 200);
  assert.equal((await request(feedbackPath, advisorCookie, { ...feedbackInput, helpful: false, outcome: "more_information" })).status, 200);
  const savedFeedback = await query("select helpful,outcome from ai_assistant_feedback where usage_id=$1", [aiUsage[0].id]);
  assert.equal(savedFeedback.length, 1); assert.equal(savedFeedback[0].helpful, false); assert.equal(savedFeedback[0].outcome, "more_information");
  pass("AI coaching feedback is private to its employee, revisable, and stores outcomes without prompts");

  const taskPath = "/api/portal/tasks";
  const taskerLead = await lead(tasker, "TaskOnlyLead");
  assert.equal((await request(taskPath, taskerCookie, { title: "Forbidden reference", entityType: "lead", entityId: taskerLead.id })).status, 403);
  pass("Task permission alone does not grant access to referenced CRM domains");
  const taskInput = { title: prefix + " unique next step", entityType: "lead", entityId: ownLead.id, dueAt: "2026-07-15T07:30:00.000Z", description: "Synthetic context", priority: "high" };
  const adopted = await Promise.all(Array.from({ length: 4 }, () => request(taskPath, advisorCookie, taskInput)));
  assert(adopted.every(result => [200, 201].includes(result.status)), JSON.stringify(adopted));
  assert.equal(new Set(adopted.map(result => result.body.id)).size, 1);
  assert.equal(adopted.filter(result => result.status === 201).length, 1);
  const taskId = adopted[0].body.id;
  pass("Concurrent adoption creates exactly one active task");
  const updatePath = `/api/portal/enterprise/tasks/${taskId}`;
  assert.equal((await request(updatePath, taskerCookie, { status: "completed" }, "PATCH")).status, 404);
  assert.equal((await request(updatePath, advisorCookie, { status: "completed" }, "PATCH")).status, 200);
  const completedAt = (await query("select completed_at from tasks where id=$1", [taskId]))[0].completed_at.toISOString();
  assert.equal((await request(updatePath, advisorCookie, { status: "completed" }, "PATCH")).status, 200);
  assert.equal((await query("select completed_at from tasks where id=$1", [taskId]))[0].completed_at.toISOString(), completedAt);
  const bulkPath = "/api/portal/enterprise/bulk";
  const bulkInput = { entity: "task", ids: [taskId], action: "status", value: "completed" };
  assert.equal((await request(bulkPath, taskerCookie, bulkInput)).body.changed, 0);
  assert.equal((await request(bulkPath, advisorCookie, bulkInput)).body.changed, 1);
  assert.equal((await query("select completed_at from tasks where id=$1", [taskId]))[0].completed_at.toISOString(), completedAt);
  assert.equal((await request(bulkPath, advisorCookie, { ...bulkInput, value: "open" })).status, 200);
  assert.equal((await query("select completed_at from tasks where id=$1", [taskId]))[0].completed_at, null);
  const repeated = await Promise.all([request(bulkPath, advisorCookie, bulkInput), request(bulkPath, advisorCookie, bulkInput)]);
  assert(repeated.every(result => result.status === 200));
  const recompletedAt = (await query("select completed_at from tasks where id=$1", [taskId]))[0].completed_at.toISOString();
  assert.equal((await request(bulkPath, advisorCookie, bulkInput)).status, 200);
  assert.equal((await query("select completed_at from tasks where id=$1", [taskId]))[0].completed_at.toISOString(), recompletedAt);
  pass("Bulk completion preserves timestamps, reopening clears them, and foreign tasks remain unchanged");
  assert.equal((await request(updatePath, advisorCookie, { status: "in_progress", dueAt: "2026-07-15T07:30:00Z", priority: "critical" }, "PATCH")).status, 200);
  const [updatedTask] = await query("select status,completed_at,priority,due_at from tasks where id=$1", [taskId]);
  assert.equal(updatedTask.completed_at, null);
  assert.equal(updatedTask.status, "in_progress");
  assert.equal(updatedTask.priority, "critical");
  assert.equal(updatedTask.due_at.toISOString(), "2026-07-15T07:30:00.000Z");
  pass("Task updates preserve completion timestamps, enforce ownership and reschedule correctly");

  html = await page(`/portal/aufgaben?status=active&due=overdue&q=${encodeURIComponent(taskInput.title)}`, advisorCookie);
  assert(html.includes(taskInput.title));
  html = await page(`/portal/aufgaben?status=active&due=no_due&q=${encodeURIComponent(taskInput.title)}`, advisorCookie);
  assert(!html.includes("Synthetic context"));
  pass("Task search and due filters include in-progress work and exclude scheduled work correctly");
  html = await page("/portal/kunden?q=one&q=two&focus=review&focus=risk", advisorCookie);
  assert(!html.includes("Daten gerade nicht erreichbar"));
  assert(html.includes("Kunden suchen"), "Customer workspace must render its search form");
  pass("Repeated customer filter parameters do not crash the workspace");

  console.log(JSON.stringify({ ok: true, checks: checks.length, prefix }, null, 2));
} finally {
  await client.end();
}

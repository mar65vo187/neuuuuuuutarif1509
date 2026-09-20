import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("employee race rules match the defined monthly scoring model", () => {
  const rules = read("src/lib/gamification-rules.ts");
  assert.match(rules, /qualifiedLead:\s*1/);
  assert.match(rules, /b2bLeadBonus:\s*2/);
  assert.match(rules, /b2cClose:\s*2/);
  assert.match(rules, /b2bClose:\s*4/);
});

test("race scoring uses creator-owned qualified leads and real activations", () => {
  const engine = read("src/lib/gamification.ts");
  assert.match(engine, /l\.created_by_employee_id AS employee_id/);
  assert.match(engine, /row_number\(\) OVER/);
  assert.match(engine, /contact_rank = 1/);
  assert.match(engine, /nullif\(trim\(coalesce\(l\.topic/);
  assert.match(engine, /order_status_history osh/);
  assert.match(engine, /osh\.to_status = 'active'/);
  assert.match(engine, /timezone\('Europe\/Berlin', now\(\)\)/);
});

test("referral tower is opt-in and exposes no contact fields", () => {
  const engine = read("src/lib/gamification.ts");
  const api = read("src/app/api/referrals/tower/route.ts");
  const migration = read("migrations/0008_gamification_profiles.sql");
  assert.match(engine, /r\.leaderboard_opt_in = true/);
  assert.match(engine, /rr\.status IN \('completed','approved','paid'\)/);
  assert.doesNotMatch(api, /email|phone|customer/i);
  assert.match(migration, /leaderboard_opt_in boolean NOT NULL DEFAULT false/);
});

test("referral registration requires phone, alias and avatar but public participation stays optional", () => {
  const route = read("src/app/api/referrals/route.ts");
  const panel = read("src/components/referrals/ReferralPanel.tsx");
  assert.match(route, /phone:/);
  assert.match(route, /displayName:/);
  assert.match(route, /avatarKey:/);
  assert.match(route, /leaderboardOptIn:/);
  assert.match(panel, /Freiwillig im Empfehlungsturm erscheinen/);
});

test("profile images are cropped interactively and normalized server-side to 1200 square", () => {
  const editor = read("src/components/portal/ImageCropEditor.tsx");
  const advisorRoute = read("src/app/api/portal/admin/advisors/[id]/image/route.ts");
  const employeeRoute = read("src/app/api/portal/admin/users/[id]/image/route.ts");
  assert.match(editor, /const OUTPUT_SIZE = 1200/);
  assert.match(editor, /type="range"/);
  assert.match(advisorRoute, /width: 1200, height: 1200, fit: "cover"/);
  assert.match(employeeRoute, /width: 1200, height: 1200, fit: "cover"/);
});

test("campaign pages capture first-party journey context and referral registration is shared-rate-limited", () => {
  const campaign = read("src/app/kampagne/[slug]/page.tsx");
  const referrals = read("src/lib/referrals.ts");
  const route = read("src/app/api/referrals/route.ts");
  assert.match(campaign, /JourneyContext/);
  assert.match(referrals, /public_intake_rate_limits/);
  assert.match(referrals, /createHmac\("sha256", secret\)/);
  assert.match(route, /await referralRateLimit/);
  assert.match(route, /Retry-After/);
});

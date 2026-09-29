import assert from "node:assert/strict";
import test from "node:test";
import { getProvisioningMode } from "../database-provisioning-policy.mjs";

test("an existing application database without the bootstrap marker is preserved", () => {
  assert.equal(
    getProvisioningMode({
      markerTableExists: false,
      markerSource: null,
      hasUserTables: true,
    }),
    "preserve-existing",
  );
});

test("only an empty database receives the first-install snapshot", () => {
  assert.equal(
    getProvisioningMode({
      markerTableExists: false,
      markerSource: null,
      hasUserTables: false,
    }),
    "seed-fresh",
  );
});

test("a completed bootstrap marker prevents a repeat import", () => {
  assert.equal(
    getProvisioningMode({
      markerTableExists: true,
      markerSource: "seed-backup",
      hasUserTables: true,
    }),
    "already-initialized",
  );
});

test("an interrupted first-install import resumes only when its explicit marker says so", () => {
  assert.equal(
    getProvisioningMode({
      markerTableExists: true,
      markerSource: "seed-backup-in-progress",
      hasUserTables: true,
    }),
    "resume-seed",
  );
});

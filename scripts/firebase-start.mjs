import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("..", import.meta.url));
const root = existsSync(resolve(sourceRoot, "server.js"))
  ? sourceRoot
  : resolve(sourceRoot, ".next/standalone");
const failures = [];

try {
  const databaseUrl = new URL(process.env.DATABASE_URL || "");
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol) || !databaseUrl.hostname || databaseUrl.pathname.length < 2) {
    failures.push("DATABASE_URL must be a PostgreSQL URL with a database name.");
  }
} catch {
  failures.push("DATABASE_URL must be a PostgreSQL URL with a database name.");
}

if ((process.env.SESSION_SECRET || "").trim().length < 32) {
  failures.push("SESSION_SECRET must contain at least 32 random characters.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((process.env.PORTAL_ADMIN_EMAIL || "").trim())) {
  failures.push("PORTAL_ADMIN_EMAIL must be set to a valid email address.");
}
if (failures.length) {
  console.error(`[firebase] Startup configuration is incomplete: ${failures.join(" ")}`);
  process.exit(1);
}

// This runs after the Firebase App Hosting container starts, where VPC access
// is available. It is deliberately not part of the Cloud Build phase.
const provision = spawnSync(process.execPath, ["scripts/provision-database.mjs"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
if (provision.error) {
  console.error(`[firebase] Database provisioner could not start: ${provision.error.message}`);
  process.exit(1);
}
if (provision.status !== 0) {
  console.error("[firebase] Database checks failed; refusing to serve an unhealthy revision.");
  process.exit(provision.status ?? 1);
}

const serverFile = resolve(root, "server.js");
const port = process.env.PORT || "8080";
const server = spawn(process.execPath, [serverFile], {
  cwd: root,
  env: { ...process.env, PORT: port, HOSTNAME: "0.0.0.0" },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("error", (error) => {
  console.error(`[firebase] Next.js server could not start: ${error.message}`);
  process.exitCode = 1;
});
server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

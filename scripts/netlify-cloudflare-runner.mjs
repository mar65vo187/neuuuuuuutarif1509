import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { publicEncrypt, constants } from "node:crypto";
import { URL } from "node:url";

const outDir = "netlify-runner-output";
mkdirSync(outDir, { recursive: true });

const stripAnsi = (value) => String(value ?? "").replace(/\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g, "");
const cleanTail = (value, max = 12000) => {
  const text = stripAnsi(value)
    .replace(/https:\/\/dash\.cloudflare\.com\/claim-preview\?claimToken=[^\s"'<>]+/g, "[CLAIM_URL_REDACTED]")
    .replace(/(CLOUDFLARE_API_TOKEN|DATABASE_URL|SESSION_SECRET|PORTAL_ADMIN_PASSWORD)=\S+/gi, "$1=[REDACTED]");
  return text.slice(-max);
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

const status = {
  ok: false,
  phase: "start",
  workerUrl: null,
  claimCiphertext: null,
  databaseUrlPresent: Boolean(process.env.DATABASE_URL),
  databaseHost: null,
  message: "",
  buildTail: "",
  deployTail: "",
  generatedAt: new Date().toISOString(),
};

try {
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      status.databaseHost = u.hostname;
    } catch {
      status.databaseHost = "invalid";
    }
  }

  status.phase = "vinext-check";
  const check = run(process.execPath, ["./node_modules/vinext/dist/cli.js", "check"]);
  if (check.status !== 0) {
    status.message = "vinext check failed";
    status.buildTail = cleanTail(check.stdout + "\n" + check.stderr);
    throw new Error(status.message);
  }

  status.phase = "build";
  const build = run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
  status.buildTail = cleanTail(build.stdout + "\n" + build.stderr);
  if (build.status !== 0) {
    status.message = "build failed";
    throw new Error(status.message);
  }

  status.phase = "cloudflare-temporary-deploy";
  const deployEnv = { ...process.env, CI: "1" };
  for (const key of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL", "CLOUDFLARE_ACCOUNT_ID"]) {
    delete deployEnv[key];
  }

  const wranglerBin = process.platform === "win32"
    ? "./node_modules/.bin/wrangler.cmd"
    : "./node_modules/.bin/wrangler";

  const deploy = run(wranglerBin, ["deploy", "--temporary", "--config", "wrangler.temporary.jsonc"], { env: deployEnv });
  const deployText = stripAnsi(deploy.stdout + "\n" + deploy.stderr);
  status.deployTail = cleanTail(deployText);

  if (deploy.status !== 0) {
    status.message = "temporary Cloudflare deploy failed";
    throw new Error(status.message);
  }

  const workerMatch = deployText.match(/https:\/\/[^\s"'<>]+\.workers\.dev\b[^\s"'<>]*/i);
  const claimMatch = deployText.match(/https:\/\/dash\.cloudflare\.com\/claim-preview\?claimToken=[^\s"'<>]+/i);
  if (!workerMatch) {
    status.message = "Cloudflare deploy succeeded but no workers.dev URL was detected";
    throw new Error(status.message);
  }

  status.workerUrl = workerMatch[0].replace(/[),.;]+$/, "");

  if (claimMatch) {
    const key = readFileSync("scripts/cloudflare-claim-public.pem", "utf8");
    status.claimCiphertext = publicEncrypt(
      {
        key,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(claimMatch[0], "utf8"),
    ).toString("base64");
  }

  status.ok = true;
  status.phase = "complete";
  status.message = claimMatch
    ? "Cloudflare temporary deployment ready; claim token encrypted."
    : "Cloudflare temporary deployment ready; claim URL was not returned.";
} catch (error) {
  if (!status.message) status.message = error instanceof Error ? error.message : "unknown error";
}

writeFileSync(`${outDir}/status.json`, JSON.stringify(status, null, 2) + "\n");
writeFileSync(`${outDir}/index.html`, `<!doctype html><html><head><meta charset="utf-8"><title>TarifWerk Cloudflare Runner</title></head><body><pre id="out"></pre><script>fetch('./status.json').then(r=>r.json()).then(x=>document.getElementById('out').textContent=JSON.stringify(x,null,2))</script></body></html>`);

console.log(JSON.stringify({
  ok: status.ok,
  phase: status.phase,
  workerUrl: status.workerUrl,
  databaseUrlPresent: status.databaseUrlPresent,
  databaseHost: status.databaseHost,
  message: status.message,
}, null, 2));

// Always let Netlify publish the sanitized status artifact so the remote result can be inspected.
process.exit(0);

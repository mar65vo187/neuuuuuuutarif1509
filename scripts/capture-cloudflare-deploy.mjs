import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { publicEncrypt, constants } from "node:crypto";

const file = process.argv[2];
if (!file) {
  console.error("Missing Wrangler output file.");
  process.exit(1);
}

const stripAnsi = (value) => value.replace(/\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g, "");
const text = stripAnsi(readFileSync(file, "utf8"));

const workerMatch = text.match(/https:\/\/[^\s"'<>]+\.workers\.dev[^\s"'<>]*/i);
const claimMatch = text.match(/https:\/\/dash\.cloudflare\.com\/claim-preview\?claimToken=[^\s"'<>]+/i);

if (!workerMatch || !claimMatch) {
  const sanitized = text
    .replace(/https:\/\/dash\.cloudflare\.com\/claim-preview\?claimToken=[^\s"'<>]+/gi, "[CLAIM_URL_REDACTED]")
    .slice(-8000);
  console.error(sanitized);
  console.error("Could not parse temporary Cloudflare worker/claim URL.");
  process.exit(1);
}

const workerUrl = workerMatch[0].replace(/[),.;]+$/, "");
const claimUrl = claimMatch[0].replace(/[),.;]+$/, "");
const key = readFileSync(new URL("./cloudflare-claim-public.pem", import.meta.url), "utf8");
const encryptedClaim = publicEncrypt(
  {
    key,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  Buffer.from(claimUrl, "utf8"),
).toString("base64");

mkdirSync(".cloudflare", { recursive: true });
writeFileSync(".cloudflare/deploy-result.json", JSON.stringify({
  kind: "temporary",
  workerUrl,
  encryptedClaim,
  claimWithinMinutes: 60,
  generatedAt: new Date().toISOString(),
}, null, 2) + "\n");

console.log("Cloudflare Worker online: " + workerUrl);

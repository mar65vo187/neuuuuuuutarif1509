import { readFileSync } from "node:fs";
import { publicEncrypt, constants } from "node:crypto";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
const input = Buffer.concat(chunks).toString("utf8").trim();
if (!input) {
  console.error("No claim URL received.");
  process.exit(1);
}
const key = readFileSync(new URL("./cloudflare-claim-public.pem", import.meta.url), "utf8");
const encrypted = publicEncrypt(
  {
    key,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  Buffer.from(input, "utf8"),
);
process.stdout.write(encrypted.toString("base64"));

import { readFileSync } from "node:fs";

const files = ["dist/server/index.js", "dist/server/ssr/index.js"];
for (const file of files) {
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  console.log("\n=== " + file + " ===");
  const needles = [
    "__VITE_ENVIRONMENT_RUNNER_IMPORT__",
    "fetch(",
    ".workers.dev",
    "service",
    "ssr",
    "rsc",
    "global_fetch_strictly_public",
  ];
  for (const needle of needles) {
    let from = 0;
    let count = 0;
    while (count < 12) {
      const i = text.indexOf(needle, from);
      if (i < 0) break;
      const a = Math.max(0, i - 260);
      const b = Math.min(text.length, i + 520);
      console.log("\n[" + needle + " @ " + i + "]\n" + text.slice(a,b).replace(/\n{3,}/g,"\n\n"));
      from = i + needle.length;
      count++;
    }
  }
}

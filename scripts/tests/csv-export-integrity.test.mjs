import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadCsvModule() {
  const source = ts.transpileModule(
    readFileSync(new URL("../../src/lib/csv-export.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(
    `(function(require,module,exports){${source}\n})`,
    { TextEncoder, ReadableStream },
  )(() => { throw new Error("unexpected import"); }, loaded, loaded.exports);
  return loaded.exports;
}

test("CSV cells neutralize spreadsheet formulas without corrupting numeric values", () => {
  const { escapeCsvCell, csvLine } = loadCsvModule();
  assert.equal(escapeCsvCell("=1+1"), "\"'=1+1\"");
  assert.equal(escapeCsvCell("@SUM(A1:A2)"), "\"'@SUM(A1:A2)\"");
  assert.equal(escapeCsvCell("+4915782301076"), "\"+4915782301076\"");
  assert.equal(escapeCsvCell("-125.50"), "\"-125.50\"");
  assert.equal(escapeCsvCell('A "quote"'), '"A ""quote"""');
  assert.equal(csvLine(["Max", "=cmd", 12]), '"Max";"\'=cmd";"12"');
});

test("streaming CSV continues across full pages instead of truncating at the first page", async () => {
  const { createCsvStream } = loadCsvModule();
  const calls = [];
  const stream = createCsvStream(
    ["ID"],
    2,
    async (page) => {
      calls.push(page);
      if (page === 1) return [1, 2];
      if (page === 2) return [3];
      return [];
    },
    (value) => [value],
  );
  const text = await new Response(stream).text();
  assert.deepEqual(calls, [1, 2]);
  assert.equal(text, '\uFEFF"ID"\r\n"1"\r\n"2"\r\n"3"\r\n');
});

test("enterprise exports page through customers, orders and commissions", () => {
  const route = readFileSync(new URL("../../src/app/api/portal/enterprise/export/route.ts", import.meta.url), "utf8");
  assert.match(route, /listCustomers\(user, undefined, pageSize, \{ page \}\)/);
  assert.match(route, /listOrders\(user, \{ page \}, pageSize\)/);
  assert.match(route, /\.offset\(\(page - 1\) \* pageSize\)/);
  assert.doesNotMatch(route, /\.limit\(1000\)/);
  assert.match(route, /X-Content-Type-Options/);
});

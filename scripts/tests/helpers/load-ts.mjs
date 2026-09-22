import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";

export function loadTs(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  const modules = { react: React, "react/jsx-runtime": jsxRuntime, ...dependencies };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { Date, Intl, URLSearchParams })(name => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

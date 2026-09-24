import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("customer bulk actions exclude records removed by a refreshed result set", () => {
  let selection = [1, 99];
  const selectAll = { indeterminate: false };
  const { CustomerBulkList } = loadTs("src/components/portal/CustomerBulkList.tsx", {
    react: {
      useState: () => [selection, update => { selection = typeof update === "function" ? update(selection) : update; }],
      useMemo: calculate => calculate(),
      useRef: () => ({ current: selectAll }),
      useEffect: effect => effect(),
    },
    "next/link": { default: "a" },
    "next/navigation": {},
    "lucide-react": {},
    "@/components/portal/ui": { formatDate: () => "" },
  });
  const rows = [1, 2].map(id => ({ id, firstName: `Customer ${id}` }));
  const elements = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    elements.push(node);
    visit(node.props?.children);
  }
  visit(CustomerBulkList({ rows, canEdit: true }));
  const toolbar = elements.find(node => node.type?.name === "CustomerBulkToolbar");
  assert.deepEqual(Array.from(toolbar.props.selectedIds), [1]);
  const checkboxes = elements.filter(node => node.type === "input" && node.props.type === "checkbox");
  assert.equal(checkboxes[0].props.checked, false);
  assert.equal(selectAll.indeterminate, true);
  checkboxes[2].props.onChange();
  assert.deepEqual(Array.from(selection), [1, 2]);
});

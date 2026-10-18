import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = (await readFile(new URL("../src/scripts/confirm-dialog.js", import.meta.url), "utf8")).replace("export function", "function");
for (const value of ["confirm", "cancel", ""]) {
  test(`activation dialog resolves ${value || "Escape"} and restores focus`, async () => {
    const nodes = []; let focused = 0;
    const context = { document: {
      activeElement: { isConnected: true, focus() { focused++; } }, body: { append() {} },
      createElement(tag) {
        const el = { tag, children: [], attributes: {}, events: {}, append(...children) { this.children.push(...children); }, setAttribute(k, v) { this.attributes[k] = v; }, addEventListener(k, fn) { this.events[k] = fn; }, showModal() { this.open = true; }, remove() { this.removed = true; } };
        nodes.push(el); return el;
      },
    } };
    vm.createContext(context); vm.runInContext(source + '\nresult = confirmDialog({ title: "Activer", message: "Camille pourra se connecter", confirmLabel: "Activer le compte" });', context);
    const dialog = nodes.find((el) => el.tag === "dialog");
    assert.equal(dialog.open, true);
    assert.equal(dialog.attributes["aria-labelledby"], "confirm-dialog-title");
    dialog.returnValue = value; dialog.events.close();
    assert.equal(await context.result, value === "confirm");
    assert.equal(focused, 1);
    assert.equal(dialog.removed, true);
  });
}

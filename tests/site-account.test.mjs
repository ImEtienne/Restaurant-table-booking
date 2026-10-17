import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../src/scripts/site-account.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "").replace("export function mountSiteAccount", "function mountSiteAccount").replace(/mountSiteAccount\(\);\s*$/, "");
function harness(api) {
  const nodes = new Map();
  const element = (id) => {
    if (!nodes.has(id)) nodes.set(id, { hidden: true, textContent: "", events: {}, attributes: {},
      addEventListener(type, fn) { this.events[type] = fn; }, setAttribute(key, value) { this.attributes[key] = value; }, contains() { return true; }, focus() {},
    });
    return nodes.get(id);
  };
  const windowEvents = {};
  const context = { document: { getElementById: element, addEventListener() {} }, window: { addEventListener: (type, fn) => { windowEvents[type] = fn; } }, api, showToast() {} };
  vm.createContext(context); vm.runInContext(source + "\ncontroller = mountSiteAccount(api);", context);
  return { ...context, el: (id) => element(`site-${id}`), windowEvents };
}
for (const isAdmin of [true, false]) {
  test(`landing restores ${isAdmin ? "admin" : "client"} session without logging out`, async () => {
    let logouts = 0;
    const h = harness({ profile: async () => ({ data: { name: "Camille Martin", is_admin: isAdmin } }), userLogout: async () => { logouts++; } });
    await h.controller.ready;
    assert.equal(h.el("account").hidden, false);
    assert.equal(h.el("signin").hidden, true);
    assert.equal(h.el("account-name").textContent, "Camille Martin");
    assert.equal(h.el("account-avatar").textContent, "CM");
    assert.equal(h.el("account-dashboard").href, isAdmin ? "/dashboard.html" : "/dashboard.html#client");
    h.el("account-toggle").events.click();
    assert.equal(h.el("account-panel").hidden, false);
    await h.controller.refresh();
    assert.equal(logouts, 0);
    await h.el("account-logout").events.click();
    assert.equal(logouts, 1);
    assert.equal(h.el("account").hidden, true);
    assert.equal(h.el("signin").hidden, false);
  });
}
test("expired sessions show sign in, network failures do not discard an established identity", async () => {
  let state = "ok";
  const h = harness({ profile: async () => {
    if (state === "expired") throw { status: 401 };
    if (state === "network") throw new Error("Network");
    return { data: { name: "Ada", is_admin: false } };
  } });
  await h.controller.ready;
  state = "network"; await h.controller.refresh();
  assert.equal(h.el("account").hidden, false);
  state = "expired"; await h.controller.refresh();
  assert.equal(h.el("account").hidden, true);
  assert.equal(h.el("account-name").textContent, "");
});
test("a stale session response cannot restore identity after logout", async () => {
  let resolve;
  const h = harness({ profile: () => new Promise((done) => { resolve = done; }), userLogout: async () => {} });
  await h.el("account-logout").events.click();
  resolve({ data: { name: "Old identity", is_admin: true } });
  await h.controller.ready;
  assert.equal(h.el("account").hidden, true);
});

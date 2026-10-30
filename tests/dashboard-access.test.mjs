import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../src/admin/main.js", import.meta.url), "utf8")).replace(/^import .*;\r?\n/gm, "");
for (const isAdmin of [true, false]) {
  test(`dashboard initialization restricts ${isAdmin ? "admin" : "ordinary"} navigation and API calls`, async () => {
    const nodes = new Map();
    function node(id) {
      if (!nodes.has(id)) nodes.set(id, { id, hidden: false, value: "", attributes: {}, events: {},
        classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
        setAttribute(key, value) { this.attributes[key] = value; },
        removeAttribute(key) { delete this.attributes[key]; },
        querySelectorAll() { return []; },
        replaceChildren() {}, addEventListener(type, fn) { this.events[type] = fn; },
      });
      return nodes.get(id);
    }
    const calls = [];
    const user = { id: 1, name: "Ada", is_admin: isAdmin };
    const api = {
      profile: async () => { calls.push("profile"); return { data: user }; },
      me: async () => { calls.push("me"); return { data: user }; },
      reservations: async () => { calls.push("reservations"); return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } }; },
      stats: async () => { calls.push("stats"); return { data: {}, meta: {} }; },
      dailyStats: async () => { calls.push("daily"); return { data: [] }; },
      hourlyStats: async () => { calls.push("hourly"); return { data: [] }; },
    };
    const activated = [];
    const nav = ["dashboard", "reservations", "users", "profile", "client"].map((section) => Object.assign(node(section), { dataset: { section } }));
    const context = {
      document: { getElementById: node, body: node("body"), querySelectorAll: (selector) => selector === "[data-section]" ? nav : selector === '[data-section="client"]' ? [nav[4]] : nav.slice(0, 3) },
      location: { hash: "", replace() { assert.fail("Unexpected redirect"); } },
      window: { addEventListener() {} }, localStorage: { getItem() {} }, sessionStorage: { getItem() {} },
      createAdminService: () => api, applyPlaceholders() {}, renderSidebarProfile() {}, mountProfileMenu() {}, mountMobileMenu() {}, mountTableLabels() {}, mountStatsScroller() {}, mountSearchToggle() {}, sortReservations: (rows) => rows, mountFiltersToggle() {}, showToast() {}, renderReservations() {}, renderMetrics() {},
      validatePeriod: () => "", searchReservations: (rows) => rows,
      mountAccounts: () => ({ activate: (section) => { activated.push(section); } }),
      mountClient: () => ({ activate: () => { activated.push("client"); }, deactivate() {} }),
      mountServices: () => ({ activate() {}, deactivate() {} }),
    };
    vm.runInNewContext(source, context);
    for (let i = 0; i < 12; i++) await Promise.resolve();
    assert.equal(node("admin-private").hidden, false);
    assert.equal(node("admin-global-search").hidden, !isAdmin);
    if (isAdmin) {
      assert.deepEqual([...calls].sort(), ["profile", "me", "reservations", "stats", "daily", "hourly"].sort());
      assert.equal(node("admin-accounts").hidden, true);
      assert.ok(activated.includes("dashboard"));
    } else {
      assert.deepEqual(calls, ["profile"]);
      assert.equal(node("admin-accounts").hidden, true);
      assert.equal(node("admin-client").hidden, false);
      assert.equal(node("admin-reservation-section").hidden, true);
      assert.equal(node("admin-statistics").hidden, true);
      assert.ok(activated.includes("client"));
      assert.ok(nav.slice(0, 3).every((link) => link.hidden));
    }
  });
}

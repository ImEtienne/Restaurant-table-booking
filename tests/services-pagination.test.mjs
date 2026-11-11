import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../src/admin/services.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");

function harness(scheduleCount = 12, exceptionCount = 7) {
  const schedules = Array.from({ length: scheduleCount }, (_, i) => ({ id: i + 1, day_of_week: i % 7 + 1,
    service_name: `Service ${i + 1}`, service_key: `service-${i + 1}`, opens_at: "12:00", closes_at: "14:00" }));
  const exceptions = Array.from({ length: exceptionCount }, (_, i) => ({ id: i + 1, service_key: "*",
    start_date: `2027-01-${String(i + 1).padStart(2, "0")}`, end_date: `2027-01-${String(i + 1).padStart(2, "0")}`, is_closed: true }));
  const createElement = (tag) => ({ tag, children: [], events: {}, attributes: {}, dataset: {}, style: {}, focused: 0,
    append(...items) { this.children.push(...items); }, replaceChildren(...items) { this.children = items; },
    addEventListener(key, fn) { this.events[key] = fn; }, setAttribute(key, value) { this.attributes[key] = value; },
    remove() {}, focus() { this.focused++; },
  });
  const root = createElement("section");
  let calls = 0;
  const context = vm.createContext({ document: { createElement, getElementById: () => root, addEventListener() {} },
    window: { addEventListener() {} }, showToast() {}, confirmDialog: async () => true,
    api: { serviceSchedules: async () => { calls++; return { data: schedules }; },
      serviceExceptions: async () => { calls++; return { data: exceptions }; } },
    onSessionError() {},
  });
  vm.runInContext(source + "\ncontroller = mountServices({ api, onSessionError });", context);
  function find(node, predicate) {
    if (predicate(node)) return node;
    for (const child of node.children) { const found = find(child, predicate); if (found) return found; }
  }
  const panel = (id) => find(root, (node) => node.id === id);
  const body = (id) => find(panel(id), (node) => node.tag === "tbody");
  const navigation = (id) => find(panel(id), (node) => node.tag === "nav");
  const click = (id, text) => find(navigation(id), (node) => node.tag === "button" && node.textContent === text).events.click();
  return { controller: context.controller, root, schedules, exceptions, body, navigation, click, calls: () => calls };
}

test("services show five rows per card with independent page counts and boundaries", async () => {
  const h = harness();
  await h.controller.activate();
  for (const id of ["schedules", "exceptions"]) {
    assert.equal(h.body(id).children.length, 5);
    assert.equal(h.navigation(id).children[1].disabled, true);
    assert.equal(h.navigation(id).children[3].disabled, false);
    assert.equal(h.navigation(id).hidden, false);
  }
  assert.equal(h.navigation("schedules").children[0].textContent, "1–5 sur 12");
  assert.equal(h.navigation("schedules").children[2].textContent, "Page 1 sur 3");
  h.click("schedules", "Suivant");
  assert.equal(h.body("schedules").children[0].children[1].textContent, "Service 6 (service-6)");
  assert.equal(h.navigation("schedules").children[0].textContent, "6–10 sur 12");
  assert.equal(h.navigation("exceptions").children[2].textContent, "Page 1 sur 2");
  h.click("schedules", "Suivant");
  assert.equal(h.body("schedules").children.length, 2);
  assert.equal(h.navigation("schedules").children[0].textContent, "11–12 sur 12");
  assert.equal(h.navigation("schedules").children[3].disabled, true);
  assert.equal(h.navigation("schedules").children[1].focused, 1);
  h.click("schedules", "Suivant");
  assert.equal(h.body("schedules").children.length, 2);
  h.click("exceptions", "Suivant");
  assert.equal(h.body("exceptions").children.length, 2);
  assert.equal(h.navigation("exceptions").children[0].textContent, "6–7 sur 7");
  h.click("schedules", "Précédent"); h.click("schedules", "Précédent"); h.click("schedules", "Précédent");
  assert.equal(h.navigation("schedules").children[2].textContent, "Page 1 sur 3");
  assert.equal(h.calls(), 2, "pagination must not issue new API requests");
});

for (const count of [0, 1, 5, 6, 10]) {
  test(`services pagination handles ${count} results`, async () => {
    const h = harness(count, count);
    await h.controller.activate();
    for (const id of ["schedules", "exceptions"]) {
      assert.equal(h.body(id).children.length, Math.min(5, count));
      assert.equal(h.navigation(id).hidden, count <= 5);
      if (count > 5) {
        h.click(id, "Suivant");
        assert.equal(h.body(id).children.length, count - 5);
        assert.equal(h.navigation(id).children[3].disabled, true);
      }
    }
  });
}

test("refresh preserves the selected pages and clamps them after records are deleted", async () => {
  const h = harness();
  await h.controller.activate();
  h.click("schedules", "Suivant"); h.click("schedules", "Suivant");
  h.click("exceptions", "Suivant");
  await h.controller.activate();
  assert.equal(h.navigation("schedules").children[2].textContent, "Page 3 sur 3");
  assert.equal(h.navigation("exceptions").children[2].textContent, "Page 2 sur 2");
  h.schedules.splice(5); h.exceptions.splice(0);
  await h.controller.activate();
  assert.equal(h.body("schedules").children.length, 5);
  assert.equal(h.navigation("schedules").children[2].textContent, "Page 1 sur 1");
  assert.equal(h.body("exceptions").children.length, 0);
  assert.equal(h.navigation("exceptions").hidden, true);
});

test("pending requests cannot restore services after leaving the tab", async () => {
  const h = harness();
  const loading = h.controller.activate();
  h.controller.deactivate();
  await loading;
  assert.equal(h.root.children.length, 0);
});

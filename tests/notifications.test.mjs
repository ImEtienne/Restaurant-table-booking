import test from "node:test";
import assert from "node:assert/strict";
import { mountNotifications } from "../src/admin/notifications.mjs";

const id = "550e8400-e29b-41d4-a716-446655440000";
const tick = () => new Promise((resolve) => setImmediate(resolve));
const findText = (node, text) => node.textContent === text ? node : node.children.map((child) => findText(child, text)).find(Boolean);
function harness(overrides = {}) {
  const listeners = {};
  const node = (tag = "") => ({
    tag, hidden: true, attributes: {}, events: {}, focused: false, children: [], textContent: "",
    addEventListener(type, handler) { this.events[type] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    contains(target) { return target === this || this.children.some((child) => child.contains(target)); },
    focus() { this.focused = true; },
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [...(child.tag === selector ? [child] : []), ...child.querySelectorAll(selector)]);
    },
  });
  const nodes = new Map();
  const get = (name) => {
    if (!nodes.has(name)) nodes.set(name, node());
    return nodes.get(name);
  };
  const calls = [];
  const response = { data: [], meta: { unread_count: 0, total: 0, current_page: 1 } };
  const api = {
    notifications: async (page) => { calls.push(["list", page]); return response; },
    readNotification: async (value) => { calls.push(["read", value]); },
    readAllNotifications: async () => { calls.push(["all"]); },
    ...overrides,
  };
  const doc = {
    getElementById: get,
    createElement: node,
    addEventListener(type, handler) { listeners[type] = handler; },
  };
  const errors = [];
  const opened = [];
  let centers = 0;
  const controller = mountNotifications({ api, doc, onSessionError: (error) => errors.push(error), onOpenClient: (id) => opened.push(id), onOpenCenter: () => { centers++; } });
  return { get: (name = "") => get(`admin-notifications${name ? `-${name}` : ""}`), controller, listeners, calls, response, errors, opened, centers: () => centers };
}

test("admin only: initial loading, open and close, outside click and Escape", async () => {
  const h = harness();
  h.controller.setEnabled(false);
  assert.equal(h.calls.length, 0);
  h.controller.setEnabled(true);
  await tick();
  assert.deepEqual(h.calls, [["list", 1]]);
  const toggle = h.get(), panel = h.get("panel");
  toggle.events.click();
  await tick();
  assert.equal(panel.hidden, false);
  assert.equal(toggle.attributes["aria-expanded"], "true");
  assert.equal(h.calls.length, 2);
  h.listeners.click({ target: panel });
  assert.equal(panel.hidden, false);
  h.listeners.click({ target: {} });
  assert.equal(panel.hidden, true);
  toggle.events.click();
  h.listeners.keydown({ key: "Escape" });
  assert.equal(panel.hidden, true);
  assert.equal(toggle.focused, true);
});

test("renders plain text, unread count, pagination and read actions", async () => {
  const h = harness();
  h.response.data = [{ id, message: "<img src=x onerror=alert(1)>", read_at: null, created_at: "2026-11-07T10:00:00Z" }];
  h.response.meta = { unread_count: 21, total: 21, current_page: 1 };
  h.controller.setEnabled(true);
  await tick();
  assert.equal(h.get("badge").textContent, "21");
  assert.equal(h.get().attributes["aria-label"], "Notifications : 21 non lues");
  assert.ok(findText(h.get("list"), "<img src=x onerror=alert(1)>"));
  assert.equal(h.get("summary").textContent, "21 notifications non lues");
  assert.equal(h.get("pagination").hidden, false);
  findText(h.get("center-detail"), "Marquer comme lu").events.click();
  await tick();
  assert.deepEqual(h.calls.slice(-2), [["read", id], ["list", 1]]);
  h.get("read-all").events.click();
  await tick();
  assert.deepEqual(h.calls.slice(-2), [["all"], ["list", 1]]);
  h.get("next").events.click();
  await tick();
  assert.deepEqual(h.calls.at(-1), ["list", 2]);
});

test("errors are visible and retry reloads; session errors reach the handler", async () => {
  let fail = true;
  const h = harness({ notifications: async () => {
    if (fail) throw Object.assign(new Error("Session expirée"), { status: 401 });
    return { data: [], meta: { unread_count: 0, total: 0, current_page: 1 } };
  } });
  h.controller.setEnabled(true);
  await tick();
  assert.match(h.get("status").textContent, /Session expirée/);
  assert.equal(h.get("retry").hidden, false);
  assert.equal(h.errors.length, 1);
  fail = false;
  h.get("retry").events.click();
  await tick();
  assert.equal(h.get("status").textContent, "Aucune notification pour le moment.");
  assert.equal(h.get("retry").hidden, true);
});

test("disabling ignores in-flight results and clears private information", async () => {
  let resolve;
  const h = harness({ notifications: () => new Promise((done) => { resolve = done; }) });
  h.controller.setEnabled(true);
  h.controller.setEnabled(false);
  resolve({ data: [{ id, message: "Secret", read_at: null }], meta: { unread_count: 1, total: 1, current_page: 1 } });
  await tick();
  assert.equal(h.get().hidden, true);
  assert.equal(h.get("list").children.length, 0);
  assert.equal(h.get("badge").hidden, true);
});

test("client registration opens its detail and then the account without marking it read", async () => {
  const h = harness();
  h.response.data = [{ id, type: "client_registered", user_id: 42, message: "Nouvelle inscription", read_at: null }];
  h.response.meta = { unread_count: 1, total: 1, current_page: 1 };
  h.controller.setEnabled(true);
  await tick();
  h.get().events.click();
  await tick();
  const item = h.get("list").children[0];
  item.children[0].events.click();
  assert.equal(h.centers(), 1);
  findText(h.get("center-detail"), "Voir le compte").events.click();
  assert.deepEqual(h.opened, [42]);
  assert.equal(h.get("panel").hidden, true);
  assert.equal(h.get().attributes["aria-expanded"], "false");
  assert.equal(h.calls.some(([action]) => action === "read"), false);
  assert.ok(findText(h.get("center-detail"), "Marquer comme lu"));
});

test("invalid client ID is visible and cannot open a different account", async () => {
  const h = harness();
  h.response.data = [{ id, type: "client_registered", user_id: "42", message: "Inscription", read_at: null }];
  h.response.meta = { unread_count: 1, total: 1, current_page: 1 };
  h.controller.setEnabled(true);
  await tick();
  const item = h.get("center-detail");
  assert.ok(findText(item, "Impossible d’ouvrir ce compte : identifiant client invalide."));
  assert.ok(!findText(item, "Voir le compte"));
});

test("notification rows display real names, category and read state", async () => {
  const h = harness();
  h.response.data = [
    { id, type: "client_registered", name: "Ada", user_id: 42, message: "Nouveau compte", read_at: null },
    { id, type: "reservation_updated", name: "Bob", message: "Réservation modifiée", read_at: "2026-11-07T10:00:00Z" },
  ];
  h.response.meta = { unread_count: 1, total: 2, current_page: 1 };
  h.controller.setEnabled(true);
  await tick();
  const [unread, read] = h.get("list").children;
  assert.equal(unread.children[0].children[0].textContent, "A");
  assert.ok(findText(unread, "Ada"));
  assert.ok(findText(unread, "Nouveau compte"));
  assert.match(unread.children[0].attributes["aria-label"], /non lue/);
  assert.ok(findText(read, "Bob"));
  assert.ok(findText(read, "Réservation modifiée"));
  assert.doesNotMatch(read.children[0].attributes["aria-label"], /non lue/);
  assert.equal(h.get("summary").textContent, "1 notification non lue");
});

test("opening a row selects its exact notification and preserves its page in the center", async () => {
  const h = harness({ notifications: async (page) => page === 1
    ? { data: [{ id, name: "Ada", message: "Page 1", read_at: null }], meta: { unread_count: 2, total: 21, current_page: 1 } }
    : { data: [
      { id, name: "Ada", message: "Page 2 première", read_at: null },
      { id: "550e8400-e29b-41d4-a716-446655440001", name: "Bob", message: "Page 2 choisie", read_at: null },
    ], meta: { unread_count: 2, total: 21, current_page: 2 } } });
  h.controller.setEnabled(true);
  await tick();
  h.get("next").events.click();
  await tick();
  h.get("list").children[1].children[0].events.click();
  assert.ok(findText(h.get("center-detail"), "Page 2 choisie"));
  h.controller.setCenterActive(true);
  await tick();
  assert.ok(findText(h.get("center-detail"), "Page 2 choisie"));
  assert.equal(h.get("center-page").textContent, "Page 2 / 2");
});

test("center link closes dropdown and center shows selected notification with actions", async () => {
  const h = harness();
  const otherId = "550e8400-e29b-41d4-a716-446655440001";
  h.response.data = [
    { id, type: "reservation_created", name: "Ada", message: "Table réservée", read_at: null },
    { id: otherId, type: "client_registered", name: "Bob", user_id: 42, message: "Compte créé", read_at: null },
  ];
  h.response.meta = { unread_count: 2, total: 2, current_page: 1 };
  h.controller.setEnabled(true);
  await tick();
  h.get().events.click();
  await tick();
  h.get("view-all").events.click();
  assert.equal(h.centers(), 1);
  assert.equal(h.get("panel").hidden, true);
  h.controller.setCenterActive(true);
  await tick();
  assert.ok(findText(h.get("center-detail"), "Table réservée"));
  const row = h.get("center-list").children[1].children[0];
  row.events.click();
  assert.ok(findText(h.get("center-detail"), "Compte créé"));
  findText(h.get("center-detail"), "Voir le compte").events.click();
  assert.deepEqual(h.opened, [42]);
  findText(h.get("center-detail"), "Marquer comme lu").events.click();
  await tick();
  assert.deepEqual(h.calls.slice(-2), [["read", otherId], ["list", 1]]);
});

test("center pagination and errors reflect the same backend state", async () => {
  const h = harness();
  h.response.data = [{ id, message: "Réservation", read_at: null }];
  h.response.meta = { unread_count: 21, total: 21, current_page: 1 };
  h.controller.setEnabled(true);
  await tick();
  assert.equal(h.get("center-pagination").hidden, false);
  h.get("center-next").events.click();
  await tick();
  assert.deepEqual(h.calls.at(-1), ["list", 2]);
  h.controller.setEnabled(false);
  assert.equal(h.get("center-list").children.length, 0);
  assert.equal(h.get("center-detail").children.length, 0);
});

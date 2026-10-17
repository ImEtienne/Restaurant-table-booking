import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { canChangeReservation, clientReservationPayload } from "../src/admin/client-rules.mjs";
import { validateReservation } from "../src/scripts/reservation-validation.mjs";
import { statusLabels } from "../src/admin/reservationTable.mjs";
import { placeholderFor } from "../src/scripts/placeholders.mjs";

const source = (await readFile(new URL("../src/admin/client.js", import.meta.url), "utf8")).replace(/^import .*;\r?\n/gm, "").replace("export function mountClient", "function mountClient");
const reservation = { id: 42, name: "Ada", email: "a@example.com", phone: "0123456789", date: "2099-10-15", time: "19:30", guests: 2, status: "pending" };
function harness(overrides = {}, user = { id: 2, name: "Ada", email: "a@example.com", is_active: true }) {
  const nodes = [], messages = [], calls = [];
  function node(tag) {
    const item = { tag, textContent: "", attributes: {}, children: [], events: {}, value: "", disabled: false,
      append(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
      setAttribute(k, v) { this.attributes[k] = v; }, addEventListener(k, fn) { this.events[k] = fn; }, focus() {},
    };
    nodes.push(item); return item;
  }
  const root = node("section");
  const api = { clientReservations: async () => { calls.push("list"); return { data: [reservation], meta: { current_page: 1, last_page: 1 } }; }, clientStats: async () => ({ data: { total_reservations: 1 }, meta: { timezone: "Europe/Paris" } }), clientReservation: async () => ({ data: reservation }), ...overrides };
  const context = { document: { createElement: node, getElementById: () => root }, window: { confirm: () => true }, api, user,
    placeholderFor, canChangeReservation, clientReservationPayload, validateReservation, statusLabels, onSessionError() {}, showToast: (...args) => messages.push(args),
  };
  vm.createContext(context);
  vm.runInContext(source + "\ncontroller = mountClient({ api, user, onSessionError });", context);
  return { ...context, nodes, messages, calls,
    find: (text) => [...nodes].reverse().find((item) => item.textContent === text),
    input: (name) => [...nodes].reverse().find((item) => item.name === name),
    form: () => [...nodes].reverse().find((item) => item.tag === "form"),
  };
}
test("inactive client sees activation explanation and sends no private data request", async () => {
  const h = harness({}, { is_active: false });
  await h.controller.activate();
  assert.deepEqual(h.calls, []);
  assert.ok(h.find("Votre compte attend son activation par le restaurant."));
});
test("client sees personal statistics and can view a reservation", async () => {
  const h = harness(); await h.controller.activate();
  assert.ok(h.find("Mes réservations"));
  assert.ok(h.find("Annuler"));
  await h.find("Voir / Modifier").events.click();
  assert.equal(h.input("phone").value, reservation.phone);
  assert.equal(h.find("Enregistrer").disabled, false);
});
test("confirmed reservation detail is read only and has no cancel button", async () => {
  const item = { ...reservation, status: "confirmed" };
  const h = harness({ clientReservations: async () => ({ data: [item], meta: { current_page: 1, last_page: 1 } }), clientReservation: async () => ({ data: item }) });
  await h.controller.activate(); assert.equal(h.find("Annuler"), undefined);
  await h.find("Voir / Modifier").events.click();
  assert.equal(h.find("Enregistrer").disabled, true);
  assert.equal(h.input("date").disabled, true);
});
test("claim rejects short keys locally and displays server ownership errors", async () => {
  let calls = 0;
  const h = harness({ claimReservation: async () => { calls++; throw { status: 404 }; } });
  await h.controller.activate();
  const form = h.form();
  h.input("registration_token").value = "bad";
  await form.events.submit({ preventDefault() {} }); assert.equal(calls, 0);
  h.input("registration_token").value = "a".repeat(64);
  await form.events.submit({ preventDefault() {} }); assert.equal(calls, 1);
  assert.match(h.messages[0][0], /email différent/);
  assert.equal(h.find("Rattacher ma réservation").disabled, false);
});
test("new reservations validate fields and send only the client-writable payload once", async () => {
  let calls = 0, resolve;
  const h = harness({ createClientReservation: (data) => { calls++; assert.equal("email" in data, false); assert.equal("status" in data, false); return new Promise((done) => { resolve = done; }); } });
  await h.controller.activate(); h.find("Nouvelle réservation").events.click();
  const form = h.form();
  await form.events.submit({ preventDefault() {} }); assert.equal(calls, 0);
  for (const key of ["name", "phone", "date", "time", "guests"]) h.input(key).value = String(reservation[key]);
  const pending = form.events.submit({ preventDefault() {} });
  await form.events.submit({ preventDefault() {} }); assert.equal(calls, 1);
  resolve({ data: reservation }); await pending;
  assert.equal(form.attributes["aria-busy"], "false");
});
test("cancel calls the correct reservation and refreshes the personal list", async () => {
  let cancelled;
  const h = harness({ cancelClientReservation: async (id) => { cancelled = id; } });
  await h.controller.activate(); await h.find("Annuler").events.click();
  assert.equal(cancelled, 42); assert.equal(h.calls.length, 2);
});

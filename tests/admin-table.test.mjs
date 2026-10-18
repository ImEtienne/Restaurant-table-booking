import test from "node:test";
import assert from "node:assert/strict";
import { renderReservations } from "../src/admin/reservationTable.mjs";

// Minimal DOM contract: rejects HTML insertion so API data stays plain text.
function element(tag) {
  return { tag, children: [], dataset: {}, textContent: "", attributes: {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren() { this.children = []; },
    setAttribute(key, value) { this.attributes[key] = value; },
    set innerHTML(_) { throw new Error("Unsafe HTML insertion"); },
  };
}
const doc = { createElement: element };
test("reservation data is rendered as text and only pending requests get decision buttons", () => {
  const tbody = element("tbody");
  renderReservations(tbody, ["pending", "confirmed", "rejected"].map((status, id) => ({
    id: id + 1, name: "<img src=x onerror=alert(1)>", email: "a@example.com", phone: "0123456789", date: "2027-10-15", time: "19:30", guests: 2, status,
  })), doc);
  assert.equal(tbody.children[0].children[0].textContent, "#1 · <img src=x onerror=alert(1)>");
  assert.deepEqual(tbody.children[0].children[5].children.map((button) => button.dataset.status), ["confirmed", "rejected"]);
  assert.equal(tbody.children[1].children[5].children.length, 0);
  assert.equal(tbody.children[2].children[5].children.length, 0);
});
test("empty results replace old reservations with an explicit empty state", () => {
  const tbody = element("tbody");
  tbody.append(element("tr"));
  renderReservations(tbody, [], doc);
  assert.equal(tbody.children.length, 1);
  assert.equal(tbody.children[0].children[0].colSpan, 6);
  assert.match(tbody.children[0].children[0].textContent, /Aucune réservation/);
});
